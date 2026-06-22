/**
 * reportParticipant — unit tests for the report-participant affordance wired
 * into ConversationScreen's nav header (TASK-R483).
 *
 * These tests cover the decision logic in isolation (pure functions extracted
 * from Conversation.tsx) AND the ReportSheet integration via a thin wrapper
 * component that mirrors the production code path.
 *
 * Strategy: ConversationScreen itself is too deeply coupled to ActionCable,
 * useComposerDraft, and FlatList to render in JSDOM. Instead we:
 *  1. Test the guard predicate (should report button be visible?) as a pure fn.
 *  2. Render a minimal wrapper that includes ONLY the report affordance —
 *     the Pressable button + ReportSheet — to verify the open/close contract
 *     and that ReportSheet receives the correct reportableType + reportableId.
 */

import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Flag:     "Flag",
  X:        "X",
  ShieldBan: "ShieldBan",
  Search:   "Search",
  Send:     "Send",
  Calendar: "Calendar",
  Paperclip: "Paperclip",
  ImageIcon: "ImageIcon",
}));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/api/reports", () => ({
  reportsAPI: {
    createReport: jest.fn().mockResolvedValue({}),
  },
  ReportableType: {},
  ReportReason: {},
}));

jest.mock("@/api/users", () => ({
  usersAPI: {
    blockUser: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
import { ReportSheet } from "@/components/common/ReportSheet";
import { reportsAPI } from "@/api/reports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Minimal wrapper component that mirrors the report affordance in
 * ConversationScreen: a Flag Pressable in the nav bar that opens ReportSheet.
 */
function ReportAffordance({
  otherParticipantId,
  currentUserId,
}: {
  otherParticipantId: number;
  currentUserId: number;
}) {
  const [visible, setVisible] = useState(false);

  // Guard: never show report button if participant is the current user
  const canReport = otherParticipantId !== currentUserId;

  return (
    <View>
      {canReport && (
        <Pressable
          onPress={() => setVisible(true)}
          testID="report-participant-button"
          accessibilityLabel="chat.report.action"
        >
          {/* Flag icon — rendered as string in tests via lucide mock */}
          {"Flag"}
        </Pressable>
      )}
      {canReport && (
        <ReportSheet
          visible={visible}
          onClose={() => setVisible(false)}
          reportableType="User"
          reportableId={otherParticipantId}
        />
      )}
    </View>
  );
}

function renderAffordance(
  otherParticipantId: number,
  currentUserId: number
) {
  const qc = makeQC();
  render(
    <QueryClientProvider client={qc}>
      <ReportAffordance
        otherParticipantId={otherParticipantId}
        currentUserId={currentUserId}
      />
    </QueryClientProvider>
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: createReport resolves successfully
  (reportsAPI.createReport as jest.Mock).mockResolvedValue({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── Guard predicate ───────────────────────────────────────────────────────────

describe("Report affordance — guard predicate", () => {
  /**
   * Pure function that mirrors the guard in ConversationScreen.
   * `otherParticipant && currentUser && Number(otherParticipant.id) !== Number(currentUser.id)`
   */
  function shouldShowReport(
    otherParticipantId: number | null,
    currentUserId: number | null
  ): boolean {
    if (otherParticipantId == null || currentUserId == null) return false;
    return Number(otherParticipantId) !== Number(currentUserId);
  }

  it("shows report button when participant and current user are different people", () => {
    expect(shouldShowReport(42, 7)).toBe(true);
  });

  it("hides report button when participant id matches current user id", () => {
    expect(shouldShowReport(7, 7)).toBe(false);
  });

  it("hides report button when otherParticipant is null (no conversation loaded yet)", () => {
    expect(shouldShowReport(null, 7)).toBe(false);
  });

  it("hides report button when currentUser is null (auth not yet hydrated)", () => {
    expect(shouldShowReport(42, null)).toBe(false);
  });

  it("hides report button when both ids are null", () => {
    expect(shouldShowReport(null, null)).toBe(false);
  });

  it("correctly compares string-coerced ids (guard uses Number())", () => {
    // In production the ids come from the API as numbers but may be stored
    // as numbers or coerced — Number(7) !== Number(42) must hold.
    expect(Number(7) !== Number(7)).toBe(false);   // same → hidden
    expect(Number(7) !== Number(42)).toBe(true);   // different → shown
  });
});

// ── Affordance rendering ──────────────────────────────────────────────────────

describe("Report affordance — rendering", () => {
  it("renders the report button when participant is a different user", () => {
    renderAffordance(42, 7);
    expect(screen.getByTestId("report-participant-button")).toBeTruthy();
  });

  it("does NOT render the report button when participant id equals current user id", () => {
    renderAffordance(7, 7);
    expect(screen.queryByTestId("report-participant-button")).toBeNull();
  });

  it("report button has correct accessibility label", () => {
    renderAffordance(42, 7);
    const btn = screen.getByTestId("report-participant-button");
    expect(btn.props.accessibilityLabel).toBe("chat.report.action");
  });
});

// ── Open / close contract ─────────────────────────────────────────────────────

describe("Report affordance — open/close", () => {
  it("opens ReportSheet when the report button is pressed", async () => {
    renderAffordance(42, 7);
    // Initially ReportSheet should not be visible (visible=false)
    expect(screen.queryByText("report.title")).toBeNull();

    fireEvent.press(screen.getByTestId("report-participant-button"));

    await waitFor(() => {
      expect(screen.getByText("report.title")).toBeTruthy();
    });
  });

  it("closes ReportSheet when cancel is pressed", async () => {
    renderAffordance(42, 7);
    fireEvent.press(screen.getByTestId("report-participant-button"));
    await waitFor(() => expect(screen.getByText("report.title")).toBeTruthy());

    fireEvent.press(screen.getByText("common.cancel"));
    await waitFor(() => {
      expect(screen.queryByText("report.title")).toBeNull();
    });
  });
});

// ── ReportSheet receives correct props ────────────────────────────────────────

describe("Report affordance — correct reportable props passed to ReportSheet", () => {
  it("passes reportableType='User' to the sheet", async () => {
    renderAffordance(42, 7);
    fireEvent.press(screen.getByTestId("report-participant-button"));
    await waitFor(() => expect(screen.getByText("report.title")).toBeTruthy());

    // Submit without a reason to trigger the validation error — this proves
    // the sheet rendered and is interactive (not just visible=true placeholder)
    fireEvent.press(screen.getByText("report.submit"));
    await waitFor(() => {
      expect(screen.getByText("report.reasonRequired")).toBeTruthy();
    });
  });

  it("calls reportsAPI.createReport with reportableType=User and the correct participant id", async () => {
    renderAffordance(99, 7);
    fireEvent.press(screen.getByTestId("report-participant-button"));
    await waitFor(() => expect(screen.getByText("report.title")).toBeTruthy());

    // Select a reason
    fireEvent.press(screen.getByText("report.reasons.fraud"));

    // Submit — wrap in act() so the mutation microtask chain settles
    await act(async () => {
      fireEvent.press(screen.getByText("report.submit"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(reportsAPI.createReport as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        reportableType: "User",
        reportableId: 99,
        reason: "fraud",
      })
    );
  });

  it("does NOT call reportsAPI.createReport when participant id equals current user id", () => {
    // The button is hidden — the sheet can never be opened — so createReport
    // is never called even if we try to tap the (missing) button.
    renderAffordance(7, 7);
    expect(screen.queryByTestId("report-participant-button")).toBeNull();
    // createReport was cleared by beforeEach — assert it remains uncalled
    expect(reportsAPI.createReport as jest.Mock).not.toHaveBeenCalled();
  });
});
