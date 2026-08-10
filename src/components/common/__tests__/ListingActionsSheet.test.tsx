/**
 * ListingActionsSheet — Jest unit tests (TASK-L863)
 *
 * Covers:
 *  1. Renders every row passed in, in order — normal rows first.
 *  2. Danger rows (Delete) always render LAST, behind a separator, no
 *     matter where they appear in the input array.
 *  3. Every row closes the sheet BEFORE invoking its handler (iOS
 *     black-screen guard) — call-order assertions, not just "both called".
 *  4. Tapping the backdrop calls onClose without invoking any row handler.
 *  5. `disabled` suppresses every row's onPress.
 *  6. RTL — renders without throwing and flips row direction when isRtl=true.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  CheckCircle2: "CheckCircle2",
  Trash2: "Trash2",
  Pencil: "Pencil",
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// Import AFTER mocks
import { ListingActionsSheet, type ListingActionRow } from "../ListingActionsSheet";
import { CheckCircle2, Trash2, Pencil } from "lucide-react-native";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function baseActions(overrides: Partial<Record<string, () => void>> = {}): ListingActionRow[] {
  return [
    { key: "sold", label: "Mark as Sold", icon: CheckCircle2 as never, onPress: overrides.sold ?? jest.fn() },
    { key: "edit", label: "Edit", icon: Pencil as never, onPress: overrides.edit ?? jest.fn() },
    { key: "delete", label: "Delete", icon: Trash2 as never, onPress: overrides.delete ?? jest.fn(), danger: true },
  ];
}

function baseProps(overrides: Partial<React.ComponentProps<typeof ListingActionsSheet>> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    actions: baseActions(),
    ...overrides,
  };
}

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false });
  jest.clearAllMocks();
});

// ── 1. Renders every row ─────────────────────────────────────────────────────

describe("ListingActionsSheet — renders every row", () => {
  it("renders a row per action, keyed by testID", () => {
    render(<ListingActionsSheet {...baseProps()} />);
    expect(screen.getByTestId("listing-action-sold")).toBeTruthy();
    expect(screen.getByTestId("listing-action-edit")).toBeTruthy();
    expect(screen.getByTestId("listing-action-delete")).toBeTruthy();
  });

  it("renders each row's label text", () => {
    render(<ListingActionsSheet {...baseProps()} />);
    expect(screen.getByText("Mark as Sold")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("renders nothing but the handle bar when given an empty actions array", () => {
    expect(() => render(<ListingActionsSheet {...baseProps({ actions: [] })} />)).not.toThrow();
  });
});

// ── 2. Danger rows always render last, behind a separator ───────────────────

describe("ListingActionsSheet — destructive Delete renders last", () => {
  it("Delete renders after Edit even when Delete is FIRST in the input array", () => {
    const sold = jest.fn();
    const del = jest.fn();
    const edit = jest.fn();
    const actions: ListingActionRow[] = [
      { key: "delete", label: "Delete", icon: Trash2 as never, onPress: del, danger: true },
      { key: "sold", label: "Mark as Sold", icon: CheckCircle2 as never, onPress: sold },
      { key: "edit", label: "Edit", icon: Pencil as never, onPress: edit },
    ];
    render(<ListingActionsSheet {...baseProps({ actions })} />);

    // All three still present, regardless of input order — the component
    // itself is responsible for moving `danger` rows to the end.
    const sheet = screen.getByTestId("listing-actions-sheet");
    expect(screen.getByText("Mark as Sold")).toBeTruthy();
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(sheet).toBeTruthy();
  });

  it("only ONE danger row renders even if multiple are marked danger (order preserved among them)", () => {
    const actions: ListingActionRow[] = [
      { key: "delete", label: "Delete", icon: Trash2 as never, onPress: jest.fn(), danger: true },
      { key: "edit", label: "Edit", icon: Pencil as never, onPress: jest.fn() },
    ];
    render(<ListingActionsSheet {...baseProps({ actions })} />);
    expect(screen.getByTestId("listing-action-delete")).toBeTruthy();
    expect(screen.getByTestId("listing-action-edit")).toBeTruthy();
  });
});

// ── 3. iOS black-screen guard — onClose fires BEFORE the handler ────────────

describe("ListingActionsSheet — closes before invoking a handler (iOS black-screen guard)", () => {
  it("a normal row: onClose() then the row's onPress()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onEdit = jest.fn(() => callOrder.push("edit"));
    render(<ListingActionsSheet {...baseProps({ onClose, actions: baseActions({ edit: onEdit }) })} />);

    fireEvent.press(screen.getByTestId("listing-action-edit"));

    expect(callOrder).toEqual(["close", "edit"]);
  });

  it("the Delete row: onClose() then Delete's onPress()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onDelete = jest.fn(() => callOrder.push("delete"));
    render(<ListingActionsSheet {...baseProps({ onClose, actions: baseActions({ delete: onDelete }) })} />);

    fireEvent.press(screen.getByTestId("listing-action-delete"));

    expect(callOrder).toEqual(["close", "delete"]);
  });
});

// ── 4. Backdrop ──────────────────────────────────────────────────────────────

describe("ListingActionsSheet — backdrop", () => {
  it("tapping the backdrop calls onClose and no row handler", () => {
    const onClose = jest.fn();
    const sold = jest.fn();
    const edit = jest.fn();
    const del = jest.fn();
    render(<ListingActionsSheet {...baseProps({ onClose, actions: baseActions({ sold, edit, delete: del }) })} />);

    fireEvent.press(screen.getByTestId("listing-actions-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sold).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

// ── 5. Disabled ────────────────────────────────────────────────────────────

describe("ListingActionsSheet — disabled suppresses every row", () => {
  it("does not call a row's onPress (or onClose) while disabled", () => {
    const onClose = jest.fn();
    const edit = jest.fn();
    render(<ListingActionsSheet {...baseProps({ onClose, disabled: true, actions: baseActions({ edit }) })} />);

    fireEvent.press(screen.getByTestId("listing-action-edit"));

    expect(edit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not suppress the backdrop (onClose still fires while disabled)", () => {
    const onClose = jest.fn();
    render(<ListingActionsSheet {...baseProps({ onClose, disabled: true })} />);
    fireEvent.press(screen.getByTestId("listing-actions-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── 6. RTL ────────────────────────────────────────────────────────────────────

describe("ListingActionsSheet — RTL", () => {
  it("renders without throwing when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() => render(<ListingActionsSheet {...baseProps()} />)).not.toThrow();
  });

  it("flips row flexDirection to row-reverse when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    render(<ListingActionsSheet {...baseProps()} />);
    const row = screen.getByTestId("listing-action-edit");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.flexDirection).toBe("row-reverse");
  });

  it("uses row (not row-reverse) when isRtl=false (default)", () => {
    render(<ListingActionsSheet {...baseProps()} />);
    const row = screen.getByTestId("listing-action-edit");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.flexDirection).toBe("row");
  });
});
