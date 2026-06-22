/**
 * ReportSheet unit tests.
 *
 * Tests rendering, reason selection, form validation, and the block follow-up
 * behavior introduced in TASK-R612 (report a User → offer to block them).
 *
 * The raw API integration is covered in src/api/__tests__/reports.test.ts.
 * End-to-end flows are covered in maestro/report/*.yaml.
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lucide icons — mock to strings to avoid react-native-css-interop chain
jest.mock("lucide-react-native", () => ({
  X: "X",
  Flag: "Flag",
}));

// Suppress sonner-native so toast calls don't throw in the test environment
jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// confirmAlert — mocked so we can capture and invoke its buttons in tests
jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

// usersAPI — mock blockUser
jest.mock("@/api/users", () => ({
  usersAPI: {
    blockUser: jest.fn(),
  },
}));

// reportsAPI — mock createReport
jest.mock("@/api/reports", () => ({
  reportsAPI: {
    createReport: jest.fn(),
  },
  ReportableType: {},
  ReportReason: {},
}));

// Import AFTER mocks
import { ReportSheet } from "../ReportSheet";
import { toast } from "sonner-native";
import { confirmAlert } from "@/utils/alert";
import { usersAPI } from "@/api/users";
import { reportsAPI } from "@/api/reports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSheet(props: Partial<React.ComponentProps<typeof ReportSheet>> = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onClose = jest.fn();
  const defaults = {
    visible: true,
    onClose,
    reportableType: "Listing" as const,
    reportableId: 10,
  };
  const merged = { ...defaults, ...props, onClose: props.onClose ?? onClose };
  render(
    <QueryClientProvider client={qc}>
      <ReportSheet {...merged} />
    </QueryClientProvider>
  );
  return { onClose: merged.onClose };
}

/** Select a reason then press Submit and wait for the mutation to settle.
 *
 * Two flushes are required:
 *   1. First setTimeout(0) — flushes the React Query mutation microtask chain
 *      so onSuccess runs and schedules the deferred confirmAlert setTimeout.
 *   2. Second setTimeout(0) — flushes the deferred confirmAlert setTimeout
 *      that was scheduled inside onSuccess (see ReportSheet.tsx).
 */
async function submitWithReason(reason = "report.reasons.fraud") {
  fireEvent.press(screen.getByText(reason));
  await act(async () => {
    fireEvent.press(screen.getByText("report.submit"));
    // First flush: mutation resolves, onSuccess fires, deferred setTimeout queued
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    // Second flush: the deferred setTimeout(confirmAlert, 0) inside onSuccess fires
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: createReport resolves successfully
  (reportsAPI.createReport as jest.Mock).mockResolvedValue({});
  // Default: blockUser resolves successfully
  (usersAPI.blockUser as jest.Mock).mockResolvedValue(undefined);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("ReportSheet — rendering", () => {
  it("renders title and subtitle when visible=true", () => {
    renderSheet({ visible: true });
    expect(screen.getByText("report.title")).toBeTruthy();
    expect(screen.getByText("report.subtitle")).toBeTruthy();
  });

  it("renders all 6 reason options", () => {
    renderSheet();
    [
      "report.reasons.spam",
      "report.reasons.inappropriate",
      "report.reasons.fraud",
      "report.reasons.wrong_category",
      "report.reasons.prohibited_item",
      "report.reasons.other",
    ].forEach((key) => {
      expect(screen.getByText(key)).toBeTruthy();
    });
  });

  it("renders the reason label", () => {
    renderSheet();
    expect(screen.getByText("report.reasonLabel")).toBeTruthy();
  });

  it("renders the optional note label and textarea", () => {
    renderSheet();
    expect(screen.getByText("report.noteLabel")).toBeTruthy();
    expect(screen.getByPlaceholderText("report.notePlaceholder")).toBeTruthy();
  });

  it("renders submit and cancel buttons", () => {
    renderSheet();
    expect(screen.getByText("report.submit")).toBeTruthy();
    expect(screen.getByText("common.cancel")).toBeTruthy();
  });
});

// ─── Reason selection ────────────────────────────────────────────────────────

describe("ReportSheet — reason selection", () => {
  it("allows selecting a reason — no error shown after selection", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.reasons.fraud"));
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });

  it("can switch between reasons", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.reasons.spam"));
    fireEvent.press(screen.getByText("report.reasons.inappropriate"));
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("ReportSheet — validation", () => {
  it("shows reasonRequired error when submit pressed with no reason", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.submit"));
    expect(screen.getByText("report.reasonRequired")).toBeTruthy();
  });

  it("clears reasonRequired error after a reason is selected", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.submit"));
    expect(screen.getByText("report.reasonRequired")).toBeTruthy();
    fireEvent.press(screen.getByText("report.reasons.other"));
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });
});

// ─── Note textarea ────────────────────────────────────────────────────────────

describe("ReportSheet — note textarea", () => {
  it("accepts text input in the note field", () => {
    renderSheet();
    const noteInput = screen.getByPlaceholderText("report.notePlaceholder");
    fireEvent.changeText(noteInput, "This is my description");
    expect(noteInput.props.value).toBe("This is my description");
  });
});

// ─── Close ────────────────────────────────────────────────────────────────────

describe("ReportSheet — close", () => {
  it("calls onClose when Cancel button is pressed", () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByText("common.cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── reportableType: basic rendering ─────────────────────────────────────────

describe("ReportSheet — reportableType", () => {
  it("renders for Listing type", () => {
    renderSheet({ reportableType: "Listing", reportableId: 42 });
    expect(screen.getByText("report.title")).toBeTruthy();
  });

  it("renders identically for User type", () => {
    renderSheet({ reportableType: "User", reportableId: 7 });
    expect(screen.getByText("report.title")).toBeTruthy();
    expect(screen.getAllByText("report.reasons.spam").length).toBeGreaterThan(0);
  });
});

// ─── Block follow-up after User report (TASK-R612) ────────────────────────────

describe("ReportSheet — block follow-up after User report", () => {
  it("shows block confirm prompt after a successful User report", async () => {
    renderSheet({ reportableType: "User", reportableId: 7 });
    await submitWithReason();

    expect(confirmAlert as jest.Mock).toHaveBeenCalledWith(
      "report.block.title",
      "report.block.body",
      expect.arrayContaining([
        expect.objectContaining({ text: "report.block.cancel" }),
        expect.objectContaining({ text: "report.block.confirmCta" }),
      ])
    );
  });

  it("calls usersAPI.blockUser with the correct id when confirm button is pressed", async () => {
    renderSheet({ reportableType: "User", reportableId: 7 });
    await submitWithReason();

    expect(confirmAlert as jest.Mock).toHaveBeenCalled();

    // Extract the buttons array passed as the third arg to confirmAlert
    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b) => b.text === "report.block.confirmCta");
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn!.onPress?.();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(usersAPI.blockUser as jest.Mock).toHaveBeenCalledWith(7);
  });

  it("shows block success toast when blockUser resolves", async () => {
    (usersAPI.blockUser as jest.Mock).mockResolvedValue(undefined);
    renderSheet({ reportableType: "User", reportableId: 7 });
    await submitWithReason();

    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b) => b.text === "report.block.confirmCta");

    await act(async () => {
      confirmBtn!.onPress?.();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(toast.success as jest.Mock).toHaveBeenCalledWith("report.block.success");
  });

  it("shows block error toast when blockUser rejects", async () => {
    (usersAPI.blockUser as jest.Mock).mockRejectedValue(new Error("network error"));
    renderSheet({ reportableType: "User", reportableId: 7 });
    await submitWithReason();

    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b) => b.text === "report.block.confirmCta");

    await act(async () => {
      confirmBtn!.onPress?.();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(toast.error as jest.Mock).toHaveBeenCalledWith("report.block.error");
  });

  it("does NOT call blockUser when only the cancel button is present (no onPress)", async () => {
    renderSheet({ reportableType: "User", reportableId: 7 });
    await submitWithReason();

    // The cancel button carries style:'cancel' and no onPress — declining = no blockUser call
    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const cancelBtn = buttons.find((b) => b.text === "report.block.cancel");
    expect(cancelBtn).toBeDefined();

    act(() => {
      cancelBtn!.onPress?.(); // no-op: cancel has no handler
    });

    expect(usersAPI.blockUser as jest.Mock).not.toHaveBeenCalled();
  });
});

// ─── Listing report: NO block prompt (TASK-R612) ─────────────────────────────

describe("ReportSheet — Listing report does NOT show block prompt", () => {
  it("does NOT call confirmAlert after a successful Listing report", async () => {
    renderSheet({ reportableType: "Listing", reportableId: 42 });
    await submitWithReason();

    // Success toast should fire
    expect(toast.success as jest.Mock).toHaveBeenCalledWith("report.success");
    // Block prompt must NOT appear for a Listing report
    expect(confirmAlert as jest.Mock).not.toHaveBeenCalled();
  });

  it("does NOT call blockUser after a successful Listing report", async () => {
    renderSheet({ reportableType: "Listing", reportableId: 42 });
    await submitWithReason();

    expect(toast.success as jest.Mock).toHaveBeenCalledWith("report.success");
    expect(usersAPI.blockUser as jest.Mock).not.toHaveBeenCalled();
  });
});

// ─── onBlocked callback (state-sync fix, TASK-R612 changes-requested) ─────────

describe("ReportSheet — onBlocked callback syncs host state", () => {
  it("calls onBlocked when blockUser succeeds after confirm", async () => {
    const onBlocked = jest.fn();
    (usersAPI.blockUser as jest.Mock).mockResolvedValue(undefined);
    renderSheet({ reportableType: "User", reportableId: 7, onBlocked });
    await submitWithReason();

    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b) => b.text === "report.block.confirmCta");

    await act(async () => {
      confirmBtn!.onPress?.();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onBlocked when blockUser fails", async () => {
    const onBlocked = jest.fn();
    (usersAPI.blockUser as jest.Mock).mockRejectedValue(new Error("network error"));
    renderSheet({ reportableType: "User", reportableId: 7, onBlocked });
    await submitWithReason();

    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b) => b.text === "report.block.confirmCta");

    await act(async () => {
      confirmBtn!.onPress?.();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("does NOT call onBlocked when the user declines the block prompt", async () => {
    const onBlocked = jest.fn();
    renderSheet({ reportableType: "User", reportableId: 7, onBlocked });
    await submitWithReason();

    const buttons: Array<{ text: string; style?: string; onPress?: () => void }> =
      (confirmAlert as jest.Mock).mock.calls[0][2];
    const cancelBtn = buttons.find((b) => b.text === "report.block.cancel");

    act(() => {
      cancelBtn!.onPress?.(); // cancel has no onPress handler — no-op
    });

    expect(onBlocked).not.toHaveBeenCalled();
  });

  it("does NOT call onBlocked for a Listing report", async () => {
    const onBlocked = jest.fn();
    renderSheet({ reportableType: "Listing", reportableId: 42, onBlocked });
    await submitWithReason();

    expect(onBlocked).not.toHaveBeenCalled();
  });
});
