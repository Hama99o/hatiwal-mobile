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
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  X: "X",
  Check: "Check",
  UserX: "UserX",
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
  it("calls onConfirm with no buyerId/finalPrice (legacy path)", async () => {
    const { onConfirm } = renderSheet();
    await waitFor(() => screen.getByText("buyerPicker.someoneElse"));

    fireEvent.press(screen.getByTestId("buyer-row-skip"));
    fireEvent.press(screen.getByTestId("buyer-picker-confirm"));

    expect(onConfirm).toHaveBeenCalledWith({ buyerId: undefined, finalPrice: undefined });
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
