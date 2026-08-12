/**
 * reserveAfterOffer — unit tests for TASK-O947 (Accept offer → one-tap
 * "Reserve for {buyer} at {price}", no buyer picker).
 *
 * ConversationScreen itself is too deeply coupled (ActionCable, composer
 * draft persistence, FlatList, gesture-handler/reanimated) to mount in JSDOM
 * — see reportParticipant.test.tsx for the same rationale. The reserve-after-
 * accept logic that `handleOfferRespond` calls lives in the small, standalone
 * `conversation/reserveAfterAccept.ts` module instead, so these tests exercise
 * the REAL production functions directly (no re-implementation / no drift).
 *
 * Cycle-4 design review pivot: the confirm step is now the shared
 * `BuyerPickerSheet` in its "preselectedBuyer" confirm mode (its own render
 * behavior is covered by BuyerPickerSheet.test.tsx), not a `confirmAlert`.
 * This file therefore covers the module's two halves:
 *  - `buildReserveAfterAcceptPrompt` — the pure decision + data builder that
 *    drives the sheet's visibility/content. Building the prompt is NOT a
 *    side effect: "Not now" is simply the caller never invoking the confirm
 *    function below, so it is proven here by asserting `reserveListing` is
 *    never called merely from building a prompt.
 *  - `reserveAfterAccept` — the side-effecting confirm, called from the
 *    sheet's `onConfirm`.
 */

import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";
import {
  buildReserveAfterAcceptPrompt,
  reserveAfterAccept,
  resolveReserveCurrency,
  shouldPromptReserveAfterAccept,
  wrapBidiIsolate,
  type MaybeReserveAfterAcceptParams,
} from "@/screens/chat/conversation/reserveAfterAccept";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    reserveListing: jest.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic `t` stub — returns the key, or "key|<json options>" when
 * interpolation options are passed, so assertions can check both the key
 * AND the interpolated values without depending on real i18n resources. */
const t = jest.fn((key: string, options?: Record<string, unknown>) =>
  options ? `${key}|${JSON.stringify(options)}` : key
);

const formatCurrency = jest.fn(
  (amount: number | null | undefined, currency = "AFN") => `${amount} ${currency}`
);

const ACTIVE_LISTING = { id: 42, status: "active" };
const BUYER = { id: 7, name: "Ahmad" };

function baseParams(
  overrides: Partial<MaybeReserveAfterAcceptParams> = {}
): MaybeReserveAfterAcceptParams {
  return {
    isOwner: true,
    listing: ACTIVE_LISTING,
    buyer: BUYER,
    offerAmount: 12000,
    currency: "AFN",
    t,
    formatCurrency,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (listingsAPI.reserveListing as jest.Mock).mockResolvedValue({ listing: ACTIVE_LISTING, transaction: undefined });
});

// ─── wrapBidiIsolate ──────────────────────────────────────────────────────────

describe("wrapBidiIsolate", () => {
  it("wraps a value in the FSI / PDI unicode isolate pair", () => {
    expect(wrapBidiIsolate("Ahmad")).toBe("⁦Ahmad⁩");
    expect(wrapBidiIsolate("12,000 AFN")).toBe("⁦12,000 AFN⁩");
  });
});

// ─── resolveReserveCurrency (review fix — hoisted from Conversation.tsx's ───
// handleOfferRespond, which previously inlined this precedence untested:
// `listingRef.currency ?? offer.offerCurrency ?? "AFN"`) ─────────────────────

describe("resolveReserveCurrency", () => {
  it("prefers the listing's currency over the offer's encoded currency", () => {
    expect(resolveReserveCurrency("USD", "AFN")).toBe("USD");
  });

  it("falls back to the offer's currency when the listing has none", () => {
    expect(resolveReserveCurrency(null, "EUR")).toBe("EUR");
    expect(resolveReserveCurrency(undefined, "EUR")).toBe("EUR");
  });

  it("falls back to AFN when neither the listing nor the offer has a currency", () => {
    expect(resolveReserveCurrency(null, null)).toBe("AFN");
    expect(resolveReserveCurrency(undefined, undefined)).toBe("AFN");
    expect(resolveReserveCurrency(null)).toBe("AFN");
  });
});

// ─── shouldPromptReserveAfterAccept (pure guard) ─────────────────────────────

describe("shouldPromptReserveAfterAccept", () => {
  it("is true for the owner on an active listing with a buyer and a positive amount", () => {
    expect(
      shouldPromptReserveAfterAccept({
        isOwner: true,
        listing: ACTIVE_LISTING,
        buyer: BUYER,
        offerAmount: 12000,
      })
    ).toBe(true);
  });

  it("is false when the responder is not the owner (e.g. the buyer accepting a counter-offer)", () => {
    expect(
      shouldPromptReserveAfterAccept({
        isOwner: false,
        listing: ACTIVE_LISTING,
        buyer: BUYER,
        offerAmount: 12000,
      })
    ).toBe(false);
  });

  it.each(["reserved", "sold", "draft"])("is false when the listing is already %s", (status) => {
    expect(
      shouldPromptReserveAfterAccept({
        isOwner: true,
        listing: { id: 42, status },
        buyer: BUYER,
        offerAmount: 12000,
      })
    ).toBe(false);
  });

  it("is false when the listing is missing", () => {
    expect(
      shouldPromptReserveAfterAccept({ isOwner: true, listing: null, buyer: BUYER, offerAmount: 12000 })
    ).toBe(false);
  });

  it("is false when there is no buyer on the conversation", () => {
    expect(
      shouldPromptReserveAfterAccept({ isOwner: true, listing: ACTIVE_LISTING, buyer: null, offerAmount: 12000 })
    ).toBe(false);
  });

  it("is false when the accepted amount is missing or zero", () => {
    expect(
      shouldPromptReserveAfterAccept({ isOwner: true, listing: ACTIVE_LISTING, buyer: BUYER, offerAmount: 0 })
    ).toBe(false);
    expect(
      shouldPromptReserveAfterAccept({ isOwner: true, listing: ACTIVE_LISTING, buyer: BUYER, offerAmount: null })
    ).toBe(false);
  });
});

// ─── buildReserveAfterAcceptPrompt — case 1: shown with buyer + price ────────

describe("buildReserveAfterAcceptPrompt — owner + active listing", () => {
  it("builds the confirm-sheet prompt with the buyer, the accepted price, and a title + body — never a buyer picker", () => {
    const prompt = buildReserveAfterAcceptPrompt(baseParams());

    expect(prompt).not.toBeNull();
    expect(prompt?.listingId).toBe(42);
    expect(prompt?.buyer).toEqual({
      id: 7,
      name: "Ahmad",
      avatarUrl: null,
      verified: undefined,
      city: null,
    });
    expect(prompt?.finalPrice).toBe(12000);
    expect(prompt?.currency).toBe("AFN");

    // Review fix (COPY) — the title now names the buyer (a sheet title wraps
    // freely, unlike a truncating alert button, so the isolated name is safe
    // here); the body states only the consequence.
    expect(prompt?.title).toContain("chat.offer.reserveAfterAcceptTitle");
    expect(prompt?.title).toContain(wrapBidiIsolate("Ahmad"));

    // Review fix (LOW, price stated twice) — the body no longer takes a
    // `{{price}}` placeholder at all: the sheet's own PriceTag (captioned
    // "Agreed price") is the single place the amount is shown. `t` is
    // therefore called with NO options here, so the deterministic stub
    // returns the bare key with no interpolated suffix.
    expect(prompt?.body).toBe("chat.offer.reserveAfterAcceptBody");

    // Building the prompt is pure — nothing was reserved yet.
    expect(listingsAPI.reserveListing).not.toHaveBeenCalled();
  });

  // MUST-FIX (TRUST) — conversation.buyer already carries `verified`/`city`
  // (conversation_serializer.rb), so the prompt must thread them through for
  // BuyerPickerSheet's confirm-mode UserIdentity to show them. Zero API work.
  it("threads the buyer's verified flag and city through to the prompt", () => {
    const prompt = buildReserveAfterAcceptPrompt(
      baseParams({ buyer: { id: 7, name: "Ahmad", verified: true, city: "Kabul" } })
    );

    expect(prompt?.buyer).toEqual({
      id: 7,
      name: "Ahmad",
      avatarUrl: null,
      verified: true,
      city: "Kabul",
    });
  });
});

// ─── buildReserveAfterAcceptPrompt — case 3/6: suppression ("Not now" and ────
// the accept-only-for-owner / active-listing matrix) ─────────────────────────

describe("buildReserveAfterAcceptPrompt — suppressed (never opens the sheet)", () => {
  it("returns null when the responder is the buyer (not the owner)", () => {
    expect(buildReserveAfterAcceptPrompt(baseParams({ isOwner: false }))).toBeNull();
  });

  it.each(["reserved", "sold", "draft"])("returns null when the listing is already %s", (status) => {
    expect(buildReserveAfterAcceptPrompt(baseParams({ listing: { id: 42, status } }))).toBeNull();
  });

  it("returns null when there is no buyer on the conversation", () => {
    expect(buildReserveAfterAcceptPrompt(baseParams({ buyer: null }))).toBeNull();
  });

  it("returns null when the listing is missing", () => {
    expect(buildReserveAfterAcceptPrompt(baseParams({ listing: null }))).toBeNull();
  });

  it("returns null when the accepted amount is missing or zero", () => {
    expect(buildReserveAfterAcceptPrompt(baseParams({ offerAmount: 0 }))).toBeNull();
    expect(buildReserveAfterAcceptPrompt(baseParams({ offerAmount: null }))).toBeNull();
  });
});

// ─── reserveAfterAccept — case 2: confirming reserves exactly once ───────────

describe("reserveAfterAccept — confirming", () => {
  it("calls reserveListing with the conversation's buyer id and the accepted price — exactly once — and shows a success toast", async () => {
    const prompt = buildReserveAfterAcceptPrompt(baseParams())!;
    const onReserved = jest.fn();

    await reserveAfterAccept(prompt, { t, onReserved });

    expect(listingsAPI.reserveListing).toHaveBeenCalledTimes(1);
    expect(listingsAPI.reserveListing).toHaveBeenCalledWith(42, { buyerId: 7, finalPrice: 12000 });
    expect(onReserved).toHaveBeenCalledTimes(1);

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect((toast.success as jest.Mock).mock.calls[0][0]).toContain("chat.offer.reserveAfterAcceptSuccess");
    // MUST-FIX (RTL) — the toast must isolate the buyer name exactly like the
    // confirm body does; asserting the isolate-wrapped form (not just a bare
    // substring match) pins the fix so a regression to raw interpolation
    // fails this test again.
    expect((toast.success as jest.Mock).mock.calls[0][0]).toContain(wrapBidiIsolate("Ahmad"));
  });
});

// ─── case 4: "Not now" is a no-op — building the prompt never reserves ───────

describe('reserveAfterAccept — "Not now" (dismissal is simply never calling this)', () => {
  it("never calls reserveListing merely from building the prompt, and onReserved is never invoked without an explicit confirm", () => {
    const onReserved = jest.fn();
    const prompt = buildReserveAfterAcceptPrompt(baseParams());

    expect(prompt).not.toBeNull();
    // The listing is untouched — no reserve call happened just by showing
    // the sheet, and `onReserved` (which the caller uses to invalidate
    // queries / reload the conversation) was never called either.
    expect(listingsAPI.reserveListing).not.toHaveBeenCalled();
    expect(onReserved).not.toHaveBeenCalled();
  });
});

// ─── case 5: reserve failure never rolls back the accept ────────────────────

describe("reserveAfterAccept — reserve failure", () => {
  it("shows an error toast and never calls onReserved when reserve 422s, without throwing", async () => {
    (listingsAPI.reserveListing as jest.Mock).mockRejectedValue({
      response: { status: 422, data: { error: "Listing cannot be reserved" } },
    });
    const onReserved = jest.fn();
    const prompt = buildReserveAfterAcceptPrompt(baseParams())!;

    // Must resolve (never throw) even though the underlying API call
    // rejects — the offer_accepted message already sent is never rolled
    // back by this function (it doesn't touch message state at all).
    //
    // Resolves FALSE rather than undefined: the caller uses the boolean to
    // decide whether to close the confirm sheet, and on failure it stays open
    // so the seller can retry without re-triggering the whole accept (same
    // contract as ListingHeader's handleBuyerPickerConfirm).
    await expect(reserveAfterAccept(prompt, { t, onReserved })).resolves.toBe(false);

    expect(onReserved).not.toHaveBeenCalled();

    // Reuses ListingHeader's existing copy rather than a duplicate key.
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("chat.listingActions.reserveFailed");
    expect(toast.success).not.toHaveBeenCalled();
  });

  // Review fix (MEDIUM, ERROR FEEDBACK INVISIBLE ON ANDROID) — the toast
  // above is occluded by the confirm sheet's own <Modal> on Android
  // (sonner-native only escapes to a FullWindowOverlay on iOS), so the
  // caller also needs the SAME message threaded into the sheet's inline
  // `errorMessage` slot via this callback.
  it("also calls onError with the exact same message the toast shows", async () => {
    (listingsAPI.reserveListing as jest.Mock).mockRejectedValue(new Error("network"));
    const onError = jest.fn();
    const prompt = buildReserveAfterAcceptPrompt(baseParams())!;

    await reserveAfterAccept(prompt, { t, onError });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("chat.listingActions.reserveFailed");
    expect(onError).toHaveBeenCalledWith((toast.error as jest.Mock).mock.calls[0][0]);
  });
});
