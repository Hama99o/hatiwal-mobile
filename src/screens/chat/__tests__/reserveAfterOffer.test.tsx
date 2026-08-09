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
 */

import { confirmAlert } from "@/utils/alert";
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";
import {
  maybeReserveAfterAccept,
  shouldPromptReserveAfterAccept,
  type MaybeReserveAfterAcceptParams,
} from "@/screens/chat/conversation/reserveAfterAccept";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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

/** Pulls the [title, body, buttons] tuple off the (mocked) confirmAlert call. */
function getAlertCall() {
  const call = (confirmAlert as jest.Mock).mock.calls[0];
  return { title: call[0], body: call[1], buttons: call[2] as Array<{ text: string; style?: string; onPress?: () => unknown }> };
}

beforeEach(() => {
  jest.clearAllMocks();
  (listingsAPI.reserveListing as jest.Mock).mockResolvedValue({ listing: ACTIVE_LISTING, transaction: undefined });
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

// ─── maybeReserveAfterAccept — prompting ─────────────────────────────────────

describe("maybeReserveAfterAccept — prompts and reserves for owner + active listing", () => {
  it("shows the confirm prompt with the buyer name and formatted price, and no buyer picker", () => {
    maybeReserveAfterAccept(baseParams());

    expect(confirmAlert).toHaveBeenCalledTimes(1);
    const { title, body, buttons } = getAlertCall();

    expect(title).toBe("chat.offer.reserveAfterAcceptTitle");
    expect(body).toContain("chat.offer.reserveAfterAcceptBody");
    expect(body).toContain("Ahmad");
    expect(body).toContain("12000 AFN");

    // Exactly two buttons: cancel ("Not now") + confirm ("Reserve") — never a
    // buyer picker of any kind.
    expect(buttons).toHaveLength(2);
    expect(buttons[0].style).toBe("cancel");
    expect(buttons[1].text).toBe("chat.offer.reserveAfterAcceptCta");
  });

  it("confirming calls reserveListing with the conversation's buyer id and the accepted price — exactly once", async () => {
    const onReserved = jest.fn();
    maybeReserveAfterAccept(baseParams({ onReserved }));

    const { buttons } = getAlertCall();
    await buttons[1].onPress?.();

    expect(listingsAPI.reserveListing).toHaveBeenCalledTimes(1);
    expect(listingsAPI.reserveListing).toHaveBeenCalledWith(42, { buyerId: 7, finalPrice: 12000 });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(onReserved).toHaveBeenCalledTimes(1);
  });

  it('"Not now" (cancel) is a no-op — never calls reserveListing', () => {
    const onReserved = jest.fn();
    maybeReserveAfterAccept(baseParams({ onReserved }));

    const { buttons } = getAlertCall();
    // Cancel button intentionally has no onPress — tapping it just dismisses.
    expect(buttons[0].onPress).toBeUndefined();
    expect(listingsAPI.reserveListing).not.toHaveBeenCalled();
    expect(onReserved).not.toHaveBeenCalled();
  });
});

// ─── maybeReserveAfterAccept — suppression ───────────────────────────────────

describe("maybeReserveAfterAccept — suppressed prompts", () => {
  it("does NOT prompt when the responder is the buyer (not the owner)", () => {
    maybeReserveAfterAccept(baseParams({ isOwner: false }));
    expect(confirmAlert).not.toHaveBeenCalled();
    expect(listingsAPI.reserveListing).not.toHaveBeenCalled();
  });

  it.each(["reserved", "sold", "draft"])("does NOT prompt when the listing is already %s", (status) => {
    maybeReserveAfterAccept(baseParams({ listing: { id: 42, status } }));
    expect(confirmAlert).not.toHaveBeenCalled();
  });

  it("does NOT prompt when there is no buyer on the conversation", () => {
    maybeReserveAfterAccept(baseParams({ buyer: null }));
    expect(confirmAlert).not.toHaveBeenCalled();
  });

  it("does NOT prompt when the listing is missing", () => {
    maybeReserveAfterAccept(baseParams({ listing: null }));
    expect(confirmAlert).not.toHaveBeenCalled();
  });
});

// ─── maybeReserveAfterAccept — reserve failure never rolls back the accept ───

describe("maybeReserveAfterAccept — reserve failure", () => {
  it("shows an error toast and does not call onReserved when reserve 422s, without throwing", async () => {
    (listingsAPI.reserveListing as jest.Mock).mockRejectedValue({
      response: { status: 422, data: { error: "Listing cannot be reserved" } },
    });
    const onReserved = jest.fn();

    maybeReserveAfterAccept(baseParams({ onReserved }));
    const { buttons } = getAlertCall();

    // Must resolve (never throw) even though the underlying API call rejects —
    // the offer_accepted message that was already sent is never rolled back
    // by this function (it doesn't touch message state at all).
    await expect(buttons[1].onPress?.()).resolves.toBeUndefined();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(onReserved).not.toHaveBeenCalled();
  });
});
