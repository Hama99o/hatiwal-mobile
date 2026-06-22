/**
 * BlockedUsers screen — unit tests.
 *
 * Covers:
 *  - Renders blocked users via the mocked UniversalList.
 *  - Pressing Unblock fires confirmAlert (destructive confirm pattern).
 *  - On confirm, usersAPI.unblockUser is called with the correct user ID.
 *  - A success toast is shown after a successful unblock.
 *  - An error toast is shown on API failure; success toast is not shown.
 *  - The screen renders without throwing in RTL mode (isRtl = true).
 *  - Empty state renders when the server returns an empty list.
 *
 * UniversalList is replaced by a minimal test double that calls fetcher once
 * and renders items via renderItem so we stay well clear of FlashList's native
 * module dependency chain.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({ ShieldOff: "ShieldOff" }));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/api/users", () => ({
  usersAPI: {
    getBlockedUsers: jest.fn(),
    unblockUser: jest.fn(),
  },
}));

// UniversalList test double — calls fetcher once on mount, renders items.
jest.mock("@/components/common/UniversalList", () => {
  const React = require("react");
  const { View, Text: RNText } = require("react-native");

  // Stable async loader: runs once on mount.
  // We pass `fetcher` as a prop so each render sees the latest closure.
  // The component ref-tracks whether it's still mounted to avoid state
  // updates after unmount.
  function MockUniversalList({ config }: { config: any }) {
    const [state, setState] = React.useState<{
      items: any[];
      loaded: boolean;
    }>({ items: [], loaded: false });

    // Run the fetcher once on mount (config.id as dep to re-run on reset).
    React.useEffect(() => {
      let cancelled = false;
      config
        .fetcher({ page: 1, perPage: 20 })
        .then((result: any) => {
          if (!cancelled) {
            setState({ items: result.items, loaded: true });
          }
        })
        .catch(() => {
          if (!cancelled) setState({ items: [], loaded: true });
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.id, config.fetcher, config.refreshKey]);

    if (!state.loaded) {
      return <View testID="universal-list-loading" />;
    }

    if (state.items.length === 0) {
      return (
        <View testID="universal-list-empty">
          <RNText>{config.emptyTitle}</RNText>
        </View>
      );
    }

    return (
      <View testID="universal-list">
        {state.items.map((item: any, index: number) =>
          React.cloneElement(config.renderItem({ item, index }), {
            key: String(item.id),
          })
        )}
      </View>
    );
  }

  return { UniversalList: MockUniversalList };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import BlockedUsersScreen from "../BlockedUsers";
import { usersAPI } from "@/api/users";
import { confirmAlert } from "@/utils/alert";
import { toast } from "sonner-native";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_A = {
  id: 10,
  name: "Ali Khan",
  avatarUrl: null,
  city: "Kabul",
  bio: null,
  memberSince: "January 2025",
  soldCount: 0,
  listingsCount: 0,
  verified: false,
  blocked: true,
  responseRatePercent: null,
  responseTimeLabel: null,
};

const USER_B = {
  id: 20,
  name: "Sara Ahmadi",
  avatarUrl: null,
  city: "Herat",
  bio: null,
  memberSince: "March 2025",
  soldCount: 0,
  listingsCount: 0,
  verified: false,
  blocked: true,
  responseRatePercent: null,
  responseTimeLabel: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <BlockedUsersScreen />
    </QueryClientProvider>
  );
}

/**
 * Make confirmAlert synchronously invoke the confirm (last) button's onPress.
 * Used to simulate the user tapping "Unblock" in the alert dialog.
 */
function autoConfirm() {
  (confirmAlert as jest.Mock).mockImplementation(
    (_title: string, _msg: string, buttons: Array<{ onPress?: () => void }> = []) => {
      const confirmBtn = [...buttons].reverse().find((b) => b.onPress);
      confirmBtn?.onPress?.();
    }
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (usersAPI.getBlockedUsers as jest.Mock).mockResolvedValue([USER_A, USER_B]);
  (usersAPI.unblockUser as jest.Mock).mockResolvedValue(undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BlockedUsers — rendering", () => {
  it("renders without throwing", async () => {
    expect(() => renderScreen()).not.toThrow();
    await waitFor(() =>
      expect(screen.queryByTestId("universal-list")).toBeTruthy()
    );
  });

  it("calls getBlockedUsers on mount", async () => {
    renderScreen();
    await waitFor(() =>
      expect(usersAPI.getBlockedUsers as jest.Mock).toHaveBeenCalled()
    );
  });

  it("renders a row for each blocked user", async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Ali Khan")).toBeTruthy();
      expect(screen.getByText("Sara Ahmadi")).toBeTruthy();
    });
  });

  it("renders an Unblock button for each user", async () => {
    renderScreen();
    await waitFor(() => {
      const btns = screen.getAllByText("profile.blocked.unblockAction");
      expect(btns.length).toBe(2);
    });
  });
});

describe("BlockedUsers — empty state", () => {
  it("shows the empty-state title when the blocked list is empty", async () => {
    (usersAPI.getBlockedUsers as jest.Mock).mockResolvedValue([]);
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText("profile.blocked.emptyTitle")).toBeTruthy()
    );
  });
});

describe("BlockedUsers — unblock flow", () => {
  it("opens a confirmAlert when Unblock is pressed", async () => {
    (confirmAlert as jest.Mock).mockImplementation(() => {});
    renderScreen();
    await waitFor(() => expect(screen.getByText("Ali Khan")).toBeTruthy());

    fireEvent.press(screen.getAllByText("profile.blocked.unblockAction")[0]);

    expect(confirmAlert as jest.Mock).toHaveBeenCalledTimes(1);
    expect((confirmAlert as jest.Mock).mock.calls[0][0]).toBe(
      "profile.blocked.unblockTitle"
    );
  });

  it("calls unblockUser with the correct user ID when confirmed", async () => {
    autoConfirm();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Ali Khan")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getAllByText("profile.blocked.unblockAction")[0]);
    });

    await waitFor(() =>
      expect(usersAPI.unblockUser as jest.Mock).toHaveBeenCalledWith(USER_A.id)
    );
  });

  it("shows a success toast after a successful unblock", async () => {
    autoConfirm();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Ali Khan")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getAllByText("profile.blocked.unblockAction")[0]);
    });

    await waitFor(() =>
      expect(toast.success as jest.Mock).toHaveBeenCalledWith(
        "profile.blocked.unblocked"
      )
    );
  });

  it("shows an error toast on API failure and does not show success", async () => {
    autoConfirm();
    (usersAPI.unblockUser as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );
    renderScreen();
    await waitFor(() => expect(screen.getByText("Ali Khan")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getAllByText("profile.blocked.unblockAction")[0]);
    });

    await waitFor(() =>
      expect(toast.error as jest.Mock).toHaveBeenCalledWith("common.error")
    );
    expect(toast.success as jest.Mock).not.toHaveBeenCalled();
  });

  it("does NOT call unblockUser when the alert is dismissed without confirm", async () => {
    (confirmAlert as jest.Mock).mockImplementation(() => {}); // no-op cancel
    renderScreen();
    await waitFor(() => expect(screen.getByText("Ali Khan")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getAllByText("profile.blocked.unblockAction")[0]);
    });

    // Wait a tick to ensure no async work started
    await act(async () => {});
    expect(usersAPI.unblockUser as jest.Mock).not.toHaveBeenCalled();
  });
});

describe("BlockedUsers — RTL locale", () => {
  it("renders without throwing when isRtl is true (Pashto/Dari)", async () => {
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      isRtl: true,
      formatCurrency: (n: number) => `AFN ${n}`,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      lang: "ps",
    });

    expect(() => renderScreen()).not.toThrow();
    await waitFor(() =>
      expect(screen.queryByTestId("universal-list")).toBeTruthy()
    );

    jest.restoreAllMocks();
  });
});
