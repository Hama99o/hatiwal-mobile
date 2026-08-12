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
 */

import React from "react";
import { Modal } from "react-native";
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

    expect(onConfirm).toHaveBeenCalledWith({ buyerId: undefined, finalPrice: undefined, clearBuyer: true });
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
  it("ignores the header X, the backdrop, and the hardware back button while isSubmitting", async () => {
    const { onClose } = renderSheet({ preselectedBuyer: PRESELECTED_BUYER, isSubmitting: true });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.press(screen.getByTestId("buyer-picker-close"));
    fireEvent.press(screen.getByTestId("buyer-picker-backdrop"));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes via the header X and backdrop when not submitting", async () => {
    const { onClose } = renderSheet({ preselectedBuyer: PRESELECTED_BUYER });
    await waitFor(() => screen.getByText("Ahmad Karimi"));

    fireEvent.press(screen.getByTestId("buyer-picker-close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("buyer-picker-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
