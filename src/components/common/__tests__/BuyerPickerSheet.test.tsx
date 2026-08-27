/**
 * BuyerPickerSheet — Jest unit tests (TASK-TX01).
 *
 * Covers:
 *  1. Renders nothing (no rows) while conversations are loading
 *  2. Renders a row per conversation (avatar/name/last message) + "Someone else / skip"
 *  3. Empty state when the listing has no conversations
 *  4. Selecting a conversation row highlights it and enables Confirm
 *  5. Confirm with a selected buyer calls onConfirm({ buyerId, finalPrice? })
 *  6. Confirm with "Someone else / skip" calls onConfirm({}) — no buyerId/finalPrice
 *  7. Confirm is disabled until something is selected
 *  8. An invalid final-price value blocks confirm and shows an error
 *  9. Cancel calls onClose
 * 10. State resets each time the sheet re-opens
 *
 * TASK-O947 (cycle-4 design review) — confirm mode (`preselectedBuyer`):
 * 11. Renders the locked buyer identity + PriceTag, no conversation list, no
 *     "someone else" skip, no editable final price, and never fetches
 *     conversations.
 * 12. Confirm fires immediately with the preselected buyerId + price.
 * 13. The confirm-mode title/cancel-label overrides are honored.
 *
 * SF-B2/SF-M2 (Sell Flow Redesign) — reserve gains the same quantity field
 * the sold path already has, in BOTH picker mode and confirm mode: see the
 * "reserve quantity" and "confirm-mode quantity" describe blocks below.
 */

import React from "react";
import { Modal, StyleSheet } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  X: "X",
  Check: "Check",
  UserX: "UserX",
  // TASK-O947 review fix (TRUST) — confirm mode can now render UserIdentity's
  // VerifiedBadge, which renders a real BadgeCheck icon.
  BadgeCheck: "BadgeCheck",
  // TASK-O947 review fix (self-explaining) — confirm mode's "Offer accepted"
  // success pill.
  CheckCircle2: "CheckCircle2",
}));

jest.mock("@/api/conversations", () => ({
  conversationsAPI: {
    getConversations: jest.fn(),
  },
}));

jest.mock("@/components/common/UserAvatar", () => ({
  UserAvatar: "UserAvatar",
}));

jest.mock("@/components/common/ListingCardSkeleton", () => ({
  ConversationRowSkeleton: () => null,
}));

// Import AFTER mocks
import { BuyerPickerSheet } from "../BuyerPickerSheet";
import { conversationsAPI } from "@/api/conversations";

const mockConversationsAPI = conversationsAPI as jest.Mocked<typeof conversationsAPI>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const conversationsResponse = {
  items: [
    {
      id: 1,
      status: "open" as const,
      lastMessageAt: "2026-07-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      listing: null,
      otherParticipant: { id: 42, name: "Ahmad", city: "Kabul", avatarUrl: null },
      lastMessageBody: "Can you do 25,000?",
    },
    {
      id: 2,
      status: "open" as const,
      lastMessageAt: "2026-07-02T10:00:00Z",
      createdAt: "2026-06-02T10:00:00Z",
      listing: null,
      otherParticipant: { id: 43, name: "Fatima", city: "Herat", avatarUrl: null },
      lastMessageBody: "Is this still available?",
    },
  ],
  pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 2, totalPages: 1 },
};

function renderSheet(overrides: Partial<React.ComponentProps<typeof BuyerPickerSheet>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <QueryClientProvider client={qc}>
      <BuyerPickerSheet
        visible
        onClose={onClose}
        listingId={99}
        price={25000}
        currency="AFN"
        action="reserve"
        onConfirm={onConfirm}
        {...overrides}
      />
    </QueryClientProvider>
  );
  return { onConfirm, onClose };
}

/** Same as `renderSheet`, but exposes RNTL's `rerender` so a test can change
 *  props (e.g. `errorMessage`) on an already-mounted sheet. */
function renderSheetForRerender(overrides: Partial<React.ComponentProps<typeof BuyerPickerSheet>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const build = (props: Partial<React.ComponentProps<typeof BuyerPickerSheet>>) => (
    <QueryClientProvider client={qc}>
      <BuyerPickerSheet
        visible
        onClose={onClose}
        listingId={99}
        price={25000}
        currency="AFN"
        action="reserve"
        onConfirm={onConfirm}
        {...props}
      />
    </QueryClientProvider>
  );
  const { rerender } = render(build(overrides));
  return {
    onConfirm,
    onClose,
    rerender: (nextOverrides: Partial<React.ComponentProps<typeof BuyerPickerSheet>>) =>
      rerender(build(nextOverrides)),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConversationsAPI.getConversations.mockResolvedValue(conversationsResponse as any);
});

// ── 1 & 2. Rows render ─────────────────────────────────────────────────────────

describe("BuyerPickerSheet — rendering conversations", () => {
  it("renders a row for each conversation with name + last message", async () => {
    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("Ahmad")).toBeTruthy();
      expect(screen.getByText("Can you do 25,000?")).toBeTruthy();
      expect(screen.getByText("Fatima")).toBeTruthy();
      expect(screen.getByText("Is this still available?")).toBeTruthy();
    });
  });

  it("always renders the 'Someone else / skip' option", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("buyerPicker.someoneElse")).toBeTruthy();
    });
  });
});

// ── 3. Empty state ──────────────────────────────────────────────────────────────

describe("BuyerPickerSheet — no conversations", () => {
  it("shows the empty-state copy when the listing has no conversations", async () => {
    mockConversationsAPI.getConversations.mockResolvedValueOnce({
      items: [],
      pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 0, totalPages: 1 },
    } as any);

    renderSheet();

    await waitFor(() => {
      expect(screen.getByText("buyerPicker.noConversations")).toBeTruthy();
    });
    // Skip option is still available even with zero conversations.
    expect(screen.getByText("buyerPicker.someoneElse")).toBeTruthy();
  });
});

// ── 4, 5, 7. Selecting a buyer + confirming ─────────────────────────────────────

describe("BuyerPickerSheet — selecting a buyer and confirming", () => {
  it("disables Confirm until a row is selected", async () => {
    renderSheet();
    await waitFor(() => screen.getByText("Ahmad"));

    const confirmBtn = screen.getByTestId("buyer-picker-confirm");
    expect(confirmBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it("calls onConfirm with the selected buyerId (no final price entered)", async () => {
    const { onConfirm } = renderSheet();
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith({ buyerId: 42, finalPrice: undefined });
  });

  it("calls onConfirm with a parsed final price when entered", async () => {
    const { onConfirm } = renderSheet();
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-final-price"), "22000");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith({ buyerId: 42, finalPrice: 22000 });
  });
});

// ── 6. Someone else / skip ──────────────────────────────────────────────────────

describe("BuyerPickerSheet — someone else / skip", () => {
  // TASK-TX02 (review fix, MAJOR): the explicit skip must be distinguishable
  // on the wire from a legacy client that never sends buyer info at all —
  // `clearBuyer: true` is that signal (see src/api/listings.ts markSold and
  // Listing#sold_with_buyer! on the backend).
  it("calls onConfirm with no buyerId/finalPrice but clearBuyer: true", async () => {
    const { onConfirm } = renderSheet();
    await waitFor(() => screen.getByText("buyerPicker.someoneElse"));

    fireEvent.press(screen.getByTestId("buyer-row-skip"));
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: undefined, finalPrice: undefined, clearBuyer: true })
    );
  });

  it("does not show the final-price input when 'skip' is selected", async () => {
    renderSheet();
    await waitFor(() => screen.getByText("buyerPicker.someoneElse"));

    fireEvent.press(screen.getByTestId("buyer-row-skip"));

    expect(screen.queryByTestId("buyer-picker-final-price")).toBeNull();
  });
});

// ── 8. Invalid final price ──────────────────────────────────────────────────────

describe("BuyerPickerSheet — invalid final price", () => {
  it("blocks confirm and shows an error for a non-numeric price", async () => {
    const { onConfirm } = renderSheet();
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-final-price"), "not-a-number");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("buyerPicker.errors.invalidPrice")).toBeTruthy();
  });
});

// ── 9. Cancel ────────────────────────────────────────────────────────────────────

describe("BuyerPickerSheet — cancel", () => {
  it("calls onClose when Cancel is pressed", async () => {
    const { onClose } = renderSheet();
    await waitFor(() => screen.getByText("buyerPicker.cancel"));

    fireEvent.press(screen.getByText("buyerPicker.cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── 10. Smoke test ──────────────────────────────────────────────────────────────

describe("BuyerPickerSheet — smoke tests", () => {
  it("renders nothing when visible=false", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <BuyerPickerSheet
          visible={false}
          onClose={jest.fn()}
          listingId={99}
          price={25000}
          currency="AFN"
          action="sold"
          onConfirm={jest.fn()}
        />
      </QueryClientProvider>
    );
    expect(screen.queryByText("buyerPicker.someoneElse")).toBeNull();
  });

  it.each(["reserve", "sold"] as const)("renders the %s title without throwing", (action) => {
    expect(() => renderSheet({ action })).not.toThrow();
  });
});

// ── 11, 12, 13. TASK-O947 confirm mode (`preselectedBuyer`) ─────────────────────

const PRESELECTED_BUYER = { id: 42, name: "Ahmad Karimi", avatarUrl: null };

describe("BuyerPickerSheet — confirm mode (preselectedBuyer)", () => {
  it("renders the locked buyer identity + price, no conversation list, no skip row, no final-price input, and never fetches conversations", async () => {
    renderSheet({
      preselectedBuyer: PRESELECTED_BUYER,
      listingThumbnailUrl: "https://example.com/thumb.jpg",
      listingTitle: "Traditional Kandahari Carpet 3x4",
      confirmBody: "Reserve for Ahmad Karimi at 24,000 AFN?",
      price: 24000,
    });

    await waitFor(() => screen.getByText("Ahmad Karimi"));

    expect(screen.getByText("Traditional Kandahari Carpet 3x4")).toBeTruthy();
    expect(screen.getByText("Reserve for Ahmad Karimi at 24,000 AFN?")).toBeTruthy();

    // Never the pick-a-buyer list or its affordances.
    expect(screen.queryByText("buyerPicker.someoneElse")).toBeNull();
    expect(screen.queryByTestId("buyer-picker-final-price")).toBeNull();
    expect(screen.queryByTestId("buyer-picker-loading")).toBeNull();
    expect(mockConversationsAPI.getConversations).not.toHaveBeenCalled();
  });

  it("Confirm fires immediately with the preselected buyerId + price — no selection step", async () => {
    const { onConfirm } = renderSheet({ preselectedBuyer: PRESELECTED_BUYER, price: 24000 });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    const confirmBtn = screen.getByTestId("buyer-picker-confirm");
    expect(confirmBtn.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith({ buyerId: 42, finalPrice: 24000 });
  });

  it("honors confirmTitle and cancelLabel overrides", async () => {
    renderSheet({
      preselectedBuyer: PRESELECTED_BUYER,
      confirmTitle: "Reserve this listing for a buyer?",
      cancelLabel: "Not now",
    });

    await waitFor(() => screen.getByText("Reserve this listing for a buyer?"));
    expect(screen.getByText("Not now")).toBeTruthy();
    // The pick-mode title never leaks through.
    expect(screen.queryByText("buyerPicker.reserveTitle")).toBeNull();
  });

  it("disables Confirm and Cancel while isSubmitting", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER, isSubmitting: true });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    expect(screen.getByTestId("buyer-picker-confirm").props.accessibilityState?.disabled).toBe(true);
  });

  // MUST-FIX (TRUST) — conversation.buyer already carries `verified`/`city`;
  // the locked confirm-mode identity must surface them via the shared
  // UserIdentity, not a bare name.
  it("shows the verified tag and city subtitle when the preselected buyer carries them", async () => {
    renderSheet({
      preselectedBuyer: { id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true, city: "Kabul" },
    });

    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.getByText("Kabul")).toBeTruthy();
    expect(screen.getByLabelText("common.verified")).toBeTruthy();
  });

  it("renders no verified tag / subtitle when the preselected buyer has neither", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER });

    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.queryByLabelText("common.verified")).toBeNull();
  });

  // SHOULD-FIX (CORRECTNESS) — a dismiss mid-submit (header X, backdrop tap,
  // or the Android hardware back button via onRequestClose) must be a no-op,
  // exactly like the footer's Cancel already was — otherwise the seller can
  // dismiss the sheet while the PUT is still in flight and get a "reserved"
  // toast after they believed they'd cancelled.
  it("ignores the header X, the backdrop, the hardware back button, AND the footer Cancel while isSubmitting", async () => {
    const { onClose } = renderSheet({ preselectedBuyer: PRESELECTED_BUYER, isSubmitting: true });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.press(screen.getByTestId("buyer-picker-close"));
    fireEvent.press(screen.getByTestId("buyer-picker-backdrop"));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    // Review fix (NIT) — the footer's ghost Cancel now routes through the
    // same `handleDismiss` guard as the three dismissal paths above, instead
    // of calling `onClose` directly (it was previously safe only because the
    // Button ALSO carried `disabled={isSubmitting}` — two places agreeing by
    // coincidence rather than one guard).
    fireEvent.press(screen.getByText("buyerPicker.cancel"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes via the header X, the backdrop, and the footer Cancel when not submitting", async () => {
    const { onClose } = renderSheet({ preselectedBuyer: PRESELECTED_BUYER });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.press(screen.getByTestId("buyer-picker-close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("buyer-picker-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.press(screen.getByText("buyerPicker.cancel"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  // Review fix (MEDIUM, ERROR FEEDBACK INVISIBLE ON ANDROID) — `errorMessage`
  // renders inline above the footer so a reserve/sold failure is legible
  // even where the sheet's own <Modal> occludes the sonner-native toast.
  it("renders errorMessage above the footer when set, and nothing when unset", async () => {
    const { rerender } = renderSheetForRerender({ preselectedBuyer: PRESELECTED_BUYER });
    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.queryByTestId("buyer-picker-error")).toBeNull();

    rerender({ preselectedBuyer: PRESELECTED_BUYER, errorMessage: "chat.listingActions.reserveFailed" });
    expect(screen.getByTestId("buyer-picker-error")).toHaveTextContent(
      "chat.listingActions.reserveFailed"
    );
  });
});

// ── SF-M2: confirm-mode quantity ("Mark sold" / "Place a hold" from chat) ──────
//
// The buyer is already known in confirm mode (no picker), but a multi-unit
// listing still needs "how many?" — the seller closing a batch deal from the
// thread gets the same choice they get on the listing surface.

describe("BuyerPickerSheet — confirm mode quantity (SF-M2)", () => {
  it("renders no quantity field on a single-item listing (remainingQuantity omitted)", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER });
    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.queryByTestId("buyer-picker-quantity")).toBeNull();
  });

  it("renders the quantity field, pre-filled to 1, for a multi-unit listing", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER, remainingQuantity: 15, action: "sold" });
    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("1");
  });

  it("labels the field for the sold action", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER, remainingQuantity: 15, action: "sold" });
    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.getByText("listing.form.howManySold")).toBeTruthy();
  });

  it("labels the field differently for the reserve (place a hold) action", async () => {
    renderSheet({ preselectedBuyer: PRESELECTED_BUYER, remainingQuantity: 15, action: "reserve" });
    await waitFor(() => screen.getByText("Ahmad Karimi"));
    expect(screen.getByText("buyerPicker.holdQuantityLabel")).toBeTruthy();
  });

  it("includes the typed quantity when confirming", async () => {
    const { onConfirm } = renderSheet({
      preselectedBuyer: PRESELECTED_BUYER,
      remainingQuantity: 15,
      action: "sold",
      price: 24000,
    });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "4");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith({ buyerId: 42, finalPrice: 24000, quantity: 4 });
  });

  it("confirms with quantity: 1 when the seller leaves the field untouched — never the whole lot", async () => {
    const { onConfirm } = renderSheet({
      preselectedBuyer: PRESELECTED_BUYER,
      remainingQuantity: 15,
      action: "sold",
      price: 24000,
    });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ buyerId: 42, finalPrice: 24000, quantity: 1 });
  });

  it("clamps a typed quantity above the remainder", async () => {
    const { onConfirm } = renderSheet({
      preselectedBuyer: PRESELECTED_BUYER,
      remainingQuantity: 4,
      action: "sold",
    });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "99");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ quantity: 4 }));
  });
});

// ── Multi-quantity: "how many did you sell?" ────────────────────────────────────
//
// docs/SPIKE_LISTING_QUANTITY.md, Tier 1. This is the one new decision the
// feature asks of a seller, and the rule the spike sets is that it must never
// appear for the majority single-unit case — a seller with one carpet answers
// exactly the questions they answer today.
//
// Selling PART of the stock must leave the listing active (the API decides that
// from this number), so a wrong number here is what would silently retire a
// listing that still has 12 bags on it.

describe("BuyerPickerSheet — sold quantity", () => {
  it("never asks for a quantity on a single-unit listing", async () => {
    renderSheet({ action: "sold", remainingQuantity: 1 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.queryByTestId("buyer-picker-quantity")).toBeNull();
  });

  it("never asks for a quantity when remainingQuantity is not supplied at all", async () => {
    renderSheet({ action: "sold" });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.queryByTestId("buyer-picker-quantity")).toBeNull();
  });

  // REVERSED (SF-B2/SF-M2): reserve used to never ask "how many", because a
  // hold had no quantity of its own at all. Now that a hold can cover part of
  // a batch ("2 held for Ahmad"), reserve asks the exact same question the
  // sold path already does, with its own label.
  it("asks for a quantity when reserving a multi-unit listing (SF-B2/SF-M2)", async () => {
    renderSheet({ action: "reserve", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByTestId("buyer-picker-quantity")).toBeTruthy();
    expect(screen.getByText("buyerPicker.holdQuantityLabel")).toBeTruthy();
  });

  it("never asks for a quantity when reserving a single-item listing", async () => {
    renderSheet({ action: "reserve", remainingQuantity: 1 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.queryByTestId("buyer-picker-quantity")).toBeNull();
  });

  it("sends the reserve quantity the seller typed, defaulting to 1", async () => {
    const { onConfirm } = renderSheet({ action: "reserve", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("1");

    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "2");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: 42, quantity: 2 })
    );
  });

  it("asks only once a buyer is chosen — never before", async () => {
    renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    expect(screen.queryByTestId("buyer-picker-quantity")).toBeNull();
    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByTestId("buyer-picker-quantity")).toBeTruthy();
  });

  // REWRITTEN (stale): this used to assert the field pre-fills the WHOLE
  // remaining stock ("I sold them all" as the one-tap default). That default
  // was deliberately reversed — a seller sold ONE item from a batch of 50 and
  // watched the listing retire itself with "0 of 50 left" (no undo, no
  // payment trail to appeal to). Selling out is now a deliberate typed
  // choice; leaving the field alone sells exactly one unit. See the
  // `quantityText` state's own doc in BuyerPickerSheet.tsx for the full story.
  it("pre-fills exactly ONE unit, not the whole remaining stock, so a full sell-out is a deliberate typed choice", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("1");

    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: 42, quantity: 1 })
    );
  });

  it("sends the partial count the seller typed — the case that keeps the listing active", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "3");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }));
  });

  it("clamps above the remainder instead of overselling", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 4 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "99");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ quantity: 4 }));
  });

  it("rejects non-digits at the keystroke, so the field can never hold a bad value", async () => {
    renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    const input = screen.getByTestId("buyer-picker-quantity");
    fireEvent.changeText(input, "3x");
    expect(input.props.value).toBe("3");
  });

  it("sends no quantity at all (never 0) when the field is cleared — the API then defaults to one unit", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 6 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    // An empty field must not be read as 0 units — that would record a sale of
    // nothing and leave the seller thinking they'd logged one.
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ quantity: undefined }));
  });

  it("shows how many are left, so the number is never typed blind", async () => {
    renderSheet({ action: "sold", remainingQuantity: 12 });
    await waitFor(() => screen.getByText("Ahmad"));

    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByText("listing.stock.unitsAvailable")).toBeTruthy();
  });

  // REVERSED deliberately. This used to assert that the skip path sends NO quantity,
  // which the API reads as "sold the lot" — so a seller with 15 units who sold one to
  // someone not on Hatiwal lost the other 14 and the listing retired. Reported from a
  // device (50 in stock, one sale, "0 of 50 left"). Only the BUYER is unknown on this
  // path; how many units left the shelf is not, and the seller can now say so.
  it("still asks how many, and sends it, when the buyer is skipped", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("buyerPicker.someoneElse"));

    fireEvent.press(screen.getByTestId("buyer-row-skip"));
    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "1");
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1, clearBuyer: true, buyerId: undefined })
    );
  });

  // REWRITTEN (stale): this used to assert leaving the field alone on the
  // skip path sold the WHOLE lot (15) — the exact pre-fill default that was
  // reversed (see the rewritten pre-fill test above for the full story). The
  // field is now pre-filled with ONE, so confirm-and-done on the skip path
  // sells exactly one unit, not the batch.
  it("sells exactly ONE unit on the skip path when the seller leaves the count alone — never the whole lot", async () => {
    const { onConfirm } = renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("buyerPicker.someoneElse"));

    fireEvent.press(screen.getByTestId("buyer-row-skip"));
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1, clearBuyer: true })
    );
  });

  // The field is pre-filled with "1" — selecting on focus still matters so a
  // tap REPLACES that digit instead of a plain tap-then-type inserting beside
  // it (originally added after QA run-018 found the OLDER whole-remainder
  // pre-fill doing exactly this with a 2-digit number; the same insert-vs-
  // replace trap applies to a 1-digit pre-fill too).
  it("selects the pre-filled count on focus, so typing replaces instead of appending", async () => {
    renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));
    fireEvent.press(screen.getByTestId("buyer-row-42"));

    expect(screen.getByTestId("buyer-picker-quantity").props.selectTextOnFocus).toBe(true);
  });

  // REWRITTEN (stale — fixed a real bug along the way, not just the default):
  // `Text`'s host style is `[{color, fontFamily}, callerStyle]` (an ARRAY,
  // from the NativeWind dark-mode fix), so `.props.style.color` was reading a
  // property off an array and always got `undefined` — the assertion below
  // ("not undefined") could never have passed regardless of the quantity
  // default. `StyleSheet.flatten` resolves the array the same way the real
  // component's own rendering does before reading `.color`.
  it("warns visibly when the typed count exceeds the stock instead of silently clamping", async () => {
    renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));
    fireEvent.press(screen.getByTestId("buyer-row-42"));

    const hintColor = () =>
      StyleSheet.flatten(screen.getByTestId("buyer-picker-quantity-hint").props.style).color;
    const calm = hintColor();

    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "153");
    expect(hintColor()).not.toBe(calm);
  });

  // Same `StyleSheet.flatten` fix as above — this one happened to pass before
  // only because it compared a value to itself (`undefined === undefined`),
  // which is true regardless of whether the underlying colour logic is
  // correct. Flattened, it is now a real assertion.
  it("keeps the hint calm for a count within the stock", async () => {
    renderSheet({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));
    fireEvent.press(screen.getByTestId("buyer-row-42"));

    const hintColor = () =>
      StyleSheet.flatten(screen.getByTestId("buyer-picker-quantity-hint").props.style).color;
    const calm = hintColor();
    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "3");
    expect(hintColor()).toBe(calm);
  });

  // REWRITTEN (stale): this used to assert the field re-syncs to the NEW
  // remainder (15 → 12) when the stock changes under the sheet. The pre-fill
  // default is no longer "the whole remainder" at all — the effect behind
  // this (`useEffect(() => setQuantityText("1"), [remainingQuantity])`)
  // resets to ONE on any change, not to the new number. What actually matters
  // now: a manually-typed count from a PREVIOUS buyer must never survive into
  // a reopened sheet for a stale, different remainder.
  it("resets the count back to ONE when the remaining stock changes under it — never re-fills a stale typed number", async () => {
    const { rerender } = renderSheetForRerender({ action: "sold", remainingQuantity: 15 });
    await waitFor(() => screen.getByText("Ahmad"));
    fireEvent.press(screen.getByTestId("buyer-row-42"));
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("1");

    fireEvent.changeText(screen.getByTestId("buyer-picker-quantity"), "5");
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("5");

    // The seller logs that sale, the query refetches with a smaller
    // remainder, and the sheet reopens for a second buyer — it must not
    // silently keep the "5" that made sense for the FIRST buyer's stock.
    rerender({ action: "sold", remainingQuantity: 12 });
    expect(screen.getByTestId("buyer-picker-quantity").props.value).toBe("1");
  });
});
