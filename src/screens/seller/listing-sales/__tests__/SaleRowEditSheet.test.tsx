/**
 * SaleRowEditSheet — Jest unit tests (SF-M5, docs/SELL_FLOW_REDESIGN.md §10.3.1).
 *
 * Covers:
 *  1. Renders the current buyer identity, quantity stepper (defaulted to the
 *     transaction's own quantity), and the price input (placeholder-seeded).
 *  2. Save sends the stepper's quantity + a parsed price, with NO buyer
 *     fields when the buyer was never touched (unchanged).
 *  3. An invalid price blocks Save with an inline error — never calls onSave.
 *  4. "Change buyer" expands the listing's conversation list (reusing the
 *     same row presentation BuyerPickerSheet's own picker uses); selecting a
 *     row and saving sends `buyerId`; selecting "Not on Hatiwal" sends
 *     `clearBuyer: true`.
 *  5. Delete is confirmAlert-gated (destructive) — onDelete only fires from
 *     the confirm button's onPress, never on cancel.
 *  6. The one deliberate refusal: an `{ ok: false, blockedReviewed: true }`
 *     outcome renders the inline "already reviewed" explanation and hides
 *     Delete + "Change buyer" — quantity/price stay editable.
 *  7. A plain `{ ok: false, blockedReviewed: false }` outcome shows NO inline
 *     message (the caller already toasted) and keeps every control visible.
 *  8. Dismiss (backdrop/X/Cancel) calls onClose, guarded by isSubmitting.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Transaction } from "@/api/transactions";
import type { Conversation } from "@/api/conversations";

jest.mock("lucide-react-native", () => ({
  X: "X",
  Check: "Check",
  UserX: "UserX",
  Minus: "Minus",
  Plus: "Plus",
}));

jest.mock("@/api/conversations", () => ({
  conversationsAPI: { getConversations: jest.fn() },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

// Import AFTER mocks
import { SaleRowEditSheet, type SaleRowEditOutcome } from "../SaleRowEditSheet";
import { conversationsAPI } from "@/api/conversations";
import { confirmAlert } from "@/utils/alert";

const mockConversationsAPI = conversationsAPI as jest.Mocked<typeof conversationsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 501,
    status: "sold",
    finalPrice: 14000,
    currency: "AFN",
    quantity: 3,
    completedAt: "2026-06-01T00:00:00Z",
    createdAt: "2026-06-01T00:00:00Z",
    role: "seller",
    listing: { id: 42, title: "Rugs", thumbnailUrl: null, price: 14000, currency: "AFN", multiUnit: true, availableUnits: 10 },
    buyer: { id: 9, name: "Zahra Noori", avatarUrl: null },
    seller: { id: 1, name: "Ahmad", avatarUrl: null },
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 77,
    status: "open",
    createdAt: "2026-06-01T00:00:00Z",
    lastMessageAt: "2026-06-01T00:00:00Z",
    lastMessageBody: "Still available?",
    lastMessageKind: "text",
    unreadCount: 0,
    otherParticipant: { id: 5, name: "Karim Yousafi", city: "Herat", avatarUrl: null },
    ...overrides,
  } as Conversation;
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const OK: SaleRowEditOutcome = { ok: true };

function baseProps(overrides: Partial<React.ComponentProps<typeof SaleRowEditSheet>> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    transaction: makeTransaction(),
    multiUnit: true,
    maxQuantity: 13,
    onSave: jest.fn().mockResolvedValue(OK),
    onDelete: jest.fn().mockResolvedValue(OK),
    ...overrides,
  };
}

function renderSheet(overrides: Partial<React.ComponentProps<typeof SaleRowEditSheet>> = {}) {
  const props = baseProps(overrides);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <SaleRowEditSheet {...props} />
    </QueryClientProvider>
  );
  return props;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConversationsAPI.getConversations.mockResolvedValue({
    items: [makeConversation()],
    pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 1, totalPages: 1 },
  });
});

// ── 1. Renders current state ──────────────────────────────────────────────────

describe("SaleRowEditSheet — renders the current sale", () => {
  it("renders the current buyer's identity", () => {
    renderSheet();
    expect(screen.getByTestId("sale-edit-current-buyer")).toBeTruthy();
    expect(screen.getByText("Zahra Noori")).toBeTruthy();
  });

  it("renders 'Sold outside Hatiwal' for an outside-buyer sale (SF-B3)", () => {
    renderSheet({ transaction: makeTransaction({ buyer: null }) });
    expect(screen.getByText("listing.sale.outsideBuyer")).toBeTruthy();
  });

  it("defaults the quantity stepper to the transaction's own quantity", () => {
    renderSheet({ transaction: makeTransaction({ quantity: 3 }) });
    expect(screen.getByTestId("sale-edit-quantity-value")).toHaveTextContent("3");
  });

  it("disables the quantity stepper for a single-item listing", () => {
    renderSheet({ multiUnit: false });
    // Both +/- buttons should be disabled when the control itself is disabled.
    expect(screen.getByTestId("sale-edit-quantity-decrement").props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId("sale-edit-quantity-increment").props.accessibilityState?.disabled).toBe(true);
  });

  it("renders nothing when transaction is null", () => {
    renderSheet({ transaction: null });
    expect(screen.queryByTestId("sale-edit-save")).toBeNull();
  });
});

// ── 2 & 3. Save ────────────────────────────────────────────────────────────────

describe("SaleRowEditSheet — Save", () => {
  it("calls onSave with the current quantity and no buyer fields when the buyer was never touched", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });

    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ quantity: 3, finalPrice: undefined });
    });
  });

  it("parses a typed final price and sends it", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });

    fireEvent.changeText(screen.getByTestId("sale-edit-price"), "13000");
    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ quantity: 3, finalPrice: 13000 });
    });
  });

  it("blocks Save on an invalid price and never calls onSave", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });

    fireEvent.changeText(screen.getByTestId("sale-edit-price"), "not-a-number");
    fireEvent.press(screen.getByTestId("sale-edit-save"));

    expect(screen.getByText("buyerPicker.errors.invalidPrice")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("increments the quantity via the stepper and saves the new value", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave, transaction: makeTransaction({ quantity: 3 }) });

    fireEvent.press(screen.getByTestId("sale-edit-quantity-increment"));
    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ quantity: 4, finalPrice: undefined });
    });
  });

  it("closes on a successful save is the CALLER's job (visible stays controlled) — this sheet just calls onSave", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });
    fireEvent.press(screen.getByTestId("sale-edit-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // No exception, no crash — the parent decides whether to keep it open.
  });
});

// ── 4. Change buyer ────────────────────────────────────────────────────────────

describe("SaleRowEditSheet — Change buyer", () => {
  it("expands the conversation list when 'Change buyer' is tapped", async () => {
    renderSheet();
    fireEvent.press(screen.getByTestId("sale-edit-change-buyer"));

    await waitFor(() => expect(screen.getByTestId("sale-edit-buyer-5")).toBeTruthy());
    expect(screen.getByText("Karim Yousafi")).toBeTruthy();
    expect(screen.getByTestId("sale-edit-buyer-outside")).toBeTruthy();
  });

  it("saves with the newly selected buyer's id", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });

    fireEvent.press(screen.getByTestId("sale-edit-change-buyer"));
    await waitFor(() => expect(screen.getByTestId("sale-edit-buyer-5")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-edit-buyer-5"));
    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ quantity: 3, finalPrice: undefined, buyerId: 5 });
    });
  });

  it("saves with clearBuyer:true when 'Not on Hatiwal' is selected", async () => {
    const onSave = jest.fn().mockResolvedValue(OK);
    renderSheet({ onSave });

    fireEvent.press(screen.getByTestId("sale-edit-change-buyer"));
    await waitFor(() => expect(screen.getByTestId("sale-edit-buyer-outside")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-edit-buyer-outside"));
    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ quantity: 3, finalPrice: undefined, clearBuyer: true });
    });
  });
});

// ── 5. Delete — confirmAlert-gated ────────────────────────────────────────────

describe("SaleRowEditSheet — Delete (destructive, confirmAlert-gated)", () => {
  it("shows a confirmAlert with destructive style before deleting", () => {
    renderSheet();
    fireEvent.press(screen.getByTestId("sale-edit-delete"));

    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.sale.voidConfirm",
      "listing.sale.voidConfirmDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "common.delete", style: "destructive" }),
      ])
    );
  });

  it("does NOT call onDelete when cancel is pressed", () => {
    const onDelete = jest.fn().mockResolvedValue(OK);
    renderSheet({ onDelete });
    fireEvent.press(screen.getByTestId("sale-edit-delete"));

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{ style?: string; onPress?: () => void }>;
    buttons.find((b) => b.style === "cancel")?.onPress?.();

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete only after the destructive button is pressed", async () => {
    const onDelete = jest.fn().mockResolvedValue(OK);
    renderSheet({ onDelete });
    fireEvent.press(screen.getByTestId("sale-edit-delete"));

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{ style?: string; onPress?: () => void }>;
    await buttons.find((b) => b.style === "destructive")?.onPress?.();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

// ── 6 & 7. The one deliberate refusal ────────────────────────────────────────

describe("SaleRowEditSheet — sale_has_review refusal (SF-B4)", () => {
  it("renders the inline explanation and hides Delete + Change buyer when blockedReviewed is true", async () => {
    const onSave = jest.fn().mockResolvedValue({ ok: false, blockedReviewed: true } as SaleRowEditOutcome);
    renderSheet({ onSave });

    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => expect(screen.getByTestId("sale-edit-error")).toHaveTextContent("listing.sale.voidBlockedReviewed"));
    expect(screen.queryByTestId("sale-edit-delete")).toBeNull();
    expect(screen.queryByTestId("sale-edit-change-buyer")).toBeNull();
    // Quantity/price stay editable.
    expect(screen.getByTestId("sale-edit-quantity")).toBeTruthy();
    expect(screen.getByTestId("sale-edit-price")).toBeTruthy();
  });

  it("also applies from the Delete path", async () => {
    const onDelete = jest.fn().mockResolvedValue({ ok: false, blockedReviewed: true } as SaleRowEditOutcome);
    renderSheet({ onDelete });
    fireEvent.press(screen.getByTestId("sale-edit-delete"));
    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{ style?: string; onPress?: () => void }>;
    await buttons.find((b) => b.style === "destructive")?.onPress?.();

    await waitFor(() => expect(screen.getByTestId("sale-edit-error")).toHaveTextContent("listing.sale.voidBlockedReviewed"));
  });

  it("shows NO inline message for a plain (non-reviewed) failure — the caller already toasted", async () => {
    const onSave = jest.fn().mockResolvedValue({ ok: false, blockedReviewed: false } as SaleRowEditOutcome);
    renderSheet({ onSave });

    fireEvent.press(screen.getByTestId("sale-edit-save"));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.queryByTestId("sale-edit-error")).toBeNull();
    // Every control stays reachable — this was not the reviewed-sale refusal.
    expect(screen.getByTestId("sale-edit-delete")).toBeTruthy();
    expect(screen.getByTestId("sale-edit-change-buyer")).toBeTruthy();
  });
});

// ── 8. Dismiss ─────────────────────────────────────────────────────────────────

describe("SaleRowEditSheet — dismiss", () => {
  it("calls onClose when the backdrop is tapped", () => {
    const onClose = jest.fn();
    renderSheet({ onClose });
    fireEvent.press(screen.getByTestId("sale-edit-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the X is tapped", () => {
    const onClose = jest.fn();
    renderSheet({ onClose });
    fireEvent.press(screen.getByTestId("sale-edit-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss while a save/delete is in flight (isSaving/isDeleting)", () => {
    const onClose = jest.fn();
    renderSheet({ onClose, isSaving: true });
    fireEvent.press(screen.getByTestId("sale-edit-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
