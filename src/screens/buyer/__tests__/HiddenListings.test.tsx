/**
 * HiddenListings screen — unit tests (TASK-H528).
 *
 * Covers:
 *  - Renders hidden listings via the mocked UniversalList.
 *  - Renders a Restore button for each listing.
 *  - Pressing Restore calls listingsAPI.unhideListing with the correct id.
 *  - Restore optimistically removes the card from view.
 *  - A success toast is shown after a successful restore.
 *  - A rollback + error toast happens on API failure.
 *  - Empty state renders when the server returns no hidden listings.
 *  - Renders without throwing in RTL mode (isRtl = true).
 *
 * UniversalList and ListingCard are replaced by minimal test doubles so we
 * stay well clear of FlashList / expo-image's native module dependency chain.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({ EyeOff: "EyeOff", RotateCcw: "RotateCcw" }));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    getHiddenListings: jest.fn(),
    unhideListing: jest.fn(),
  },
}));

// ListingCard test double — renders just the title so tests can assert on it.
jest.mock("@/components/common/ListingCard", () => {
  const React = require("react");
  const { Text: RNText, Pressable } = require("react-native");

  function MockListingCard(props: any) {
    return (
      <Pressable onPress={props.onPress} testID={`listing-card-${props.listing.id}`}>
        <RNText>{props.listing.title}</RNText>
      </Pressable>
    );
  }

  return { ListingCard: MockListingCard };
});

// UniversalList test double — calls fetcher once on mount, renders items.
jest.mock("@/components/common/UniversalList", () => {
  const React = require("react");
  const { View, Text: RNText } = require("react-native");

  function MockUniversalList({ config }: { config: any }) {
    const [state, setState] = React.useState<{ items: any[]; loaded: boolean }>({
      items: [],
      loaded: false,
    });

    React.useEffect(() => {
      let cancelled = false;
      config
        .fetcher({ page: 1, perPage: 20 })
        .then((result: any) => {
          if (!cancelled) setState({ items: result.items, loaded: true });
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
        {state.items.map((item: any, index: number) => {
          const rendered = config.renderItem({ item, index });
          return rendered ? React.cloneElement(rendered, { key: String(item.id) }) : null;
        })}
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

import HiddenListingsScreen from "../HiddenListings";
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LISTING_A = {
  id: 10,
  title: "iPhone 12 Pro",
  price: 25000,
  currency: "AFN",
  status: "active",
  thumbnailUrl: null,
};

const LISTING_B = {
  id: 20,
  title: "Old Bicycle",
  price: 3000,
  currency: "AFN",
  status: "active",
  thumbnailUrl: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResult(items: any[]) {
  return {
    items,
    pagination: {
      currentPage: 1,
      nextPage: null,
      prevPage: null,
      totalCount: items.length,
      totalPages: 1,
    },
  };
}

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <HiddenListingsScreen />
    </QueryClientProvider>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (listingsAPI.getHiddenListings as jest.Mock).mockResolvedValue(
    makeResult([LISTING_A, LISTING_B])
  );
  (listingsAPI.unhideListing as jest.Mock).mockResolvedValue(undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HiddenListings — rendering", () => {
  it("renders without throwing", async () => {
    expect(() => renderScreen()).not.toThrow();
    await waitFor(() => expect(screen.queryByTestId("universal-list")).toBeTruthy());
  });

  it("calls getHiddenListings on mount", async () => {
    renderScreen();
    await waitFor(() =>
      expect(listingsAPI.getHiddenListings as jest.Mock).toHaveBeenCalled()
    );
  });

  it("renders a card for each hidden listing", async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText("iPhone 12 Pro")).toBeTruthy();
      expect(screen.getByText("Old Bicycle")).toBeTruthy();
    });
  });

  it("renders a Restore button for each listing", async () => {
    renderScreen();
    await waitFor(() => {
      const btns = screen.getAllByText("hiddenListings.restore");
      expect(btns.length).toBe(2);
    });
  });
});

describe("HiddenListings — empty state", () => {
  it("shows the empty-state title when nothing is hidden", async () => {
    (listingsAPI.getHiddenListings as jest.Mock).mockResolvedValue(makeResult([]));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText("hiddenListings.empty")).toBeTruthy()
    );
  });
});

describe("HiddenListings — restore flow", () => {
  it("calls unhideListing with the correct listing id when Restore is pressed", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("restore-listing-10"));
    });

    await waitFor(() =>
      expect(listingsAPI.unhideListing as jest.Mock).toHaveBeenCalledWith(10)
    );
  });

  it("optimistically removes the card from view on Restore", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("restore-listing-10"));
    });

    await waitFor(() => expect(screen.queryByText("iPhone 12 Pro")).toBeNull());
    // The other listing stays visible.
    expect(screen.getByText("Old Bicycle")).toBeTruthy();
  });

  it("shows a success toast after a successful restore", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("restore-listing-10"));
    });

    await waitFor(() =>
      expect(toast.success as jest.Mock).toHaveBeenCalledWith(
        "hiddenListings.restoreSuccess"
      )
    );
  });

  it("rolls back and shows an error toast on API failure", async () => {
    (listingsAPI.unhideListing as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );
    renderScreen();
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("restore-listing-10"));
    });

    await waitFor(() =>
      expect(toast.error as jest.Mock).toHaveBeenCalledWith(
        "hiddenListings.restoreError"
      )
    );
    // Rolled back — the card reappears.
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());
    expect(toast.success as jest.Mock).not.toHaveBeenCalled();
  });

  it("shows the empty state (not a blank gap) after restoring the only hidden listing", async () => {
    // Regression test for the reviewer-flagged bug: restoring must bump
    // refreshKey and trigger a real re-fetch so the item is removed from
    // UniversalList's items array, letting EmptyState render — not just
    // marked as "restored" locally while renderItem silently returns null.
    (listingsAPI.getHiddenListings as jest.Mock).mockResolvedValue(
      makeResult([LISTING_A])
    );
    renderScreen();
    await waitFor(() => expect(screen.getByText("iPhone 12 Pro")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("restore-listing-10"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("universal-list-empty")).toBeTruthy()
    );
    expect(screen.queryByText("iPhone 12 Pro")).toBeNull();
    // The fetcher was re-invoked (refreshKey bump) to re-fetch page 1.
    expect(listingsAPI.getHiddenListings as jest.Mock).toHaveBeenCalledTimes(2);
  });
});

describe("HiddenListings — RTL locale", () => {
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
    await waitFor(() => expect(screen.queryByTestId("universal-list")).toBeTruthy());

    jest.restoreAllMocks();
  });
});
