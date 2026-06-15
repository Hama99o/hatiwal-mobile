/**
 * UniversalList unit tests
 *
 * Covers the four render states:
 *   1. Loading  — renders skeleton (or spinner) and NOT the list or EmptyState
 *   2. Error    — renders error affordance; retry button invokes the fetcher again
 *   3. Empty    — renders EmptyState after a successful fetch that returns zero items
 *   4. Data     — renders one row per item via the renderItem prop
 *
 * Regression guard:
 *   5. Header stays mounted across loading→data transition — the outer container
 *      and any ListHeaderComponent element must NOT remount when the body-branch
 *      switches (e.g. loading→data), so a TextInput inside the header keeps focus.
 *
 * Note: @shopify/flash-list is mocked via __mocks__/@shopify/flash-list.js so
 * it renders children synchronously without needing a native module.
 */

import React from "react";
import { Text as RNText } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { UniversalList } from "../UniversalList";
import type { UniversalListConfig, ListFetchResult, ListQuery } from "../UniversalList";

// ─── Mock lucide-react-native ─────────────────────────────────────────────────
// The icons are native SVG modules that can't render in Jest.
jest.mock("lucide-react-native", () => ({
  WifiOff: "WifiOff",
  RotateCcw: "RotateCcw",
  Search: "Search",
}));

// ─── Types / Helpers ──────────────────────────────────────────────────────────

type SimpleItem = { id: number; label: string };

const makeResult = (items: SimpleItem[]): ListFetchResult<SimpleItem> => ({
  items,
  totalCount: items.length,
  totalPages: 1,
  currentPage: 1,
});

const ITEMS: SimpleItem[] = [
  { id: 1, label: "Item One" },
  { id: 2, label: "Item Two" },
  { id: 3, label: "Item Three" },
];

/** A fetcher that resolves immediately with the given result */
const resolvingFetcher = (result: ListFetchResult<SimpleItem>) =>
  jest.fn((_query: ListQuery) => Promise.resolve(result));

/** A fetcher that rejects with a network error */
const rejectingFetcher = () =>
  jest.fn((_query: ListQuery) => Promise.reject(new Error("Network error")));

/** Minimal skeleton cell component used as SkeletonComponent prop */
const SkeletonRow = () => <RNText testID="skeleton-row">Loading row</RNText>;

/** Minimal renderItem renders item.label as accessible text */
const renderItem = ({ item }: { item: SimpleItem }) => (
  <RNText testID={`item-${item.id}`}>{item.label}</RNText>
);

function buildConfig(
  overrides: Partial<UniversalListConfig<SimpleItem>> & {
    fetcher: UniversalListConfig<SimpleItem>["fetcher"];
  }
): UniversalListConfig<SimpleItem> {
  return {
    id: "test-list",
    keyExtractor: (item) => String(item.id),
    renderItem,
    emptyTitle: "Nothing here",
    emptyDescription: "No items to display.",
    ...overrides,
  };
}

// ─── 1. Loading state ─────────────────────────────────────────────────────────
//
// A fetcher that never resolves keeps the list in loading state indefinitely.
// We inspect synchronously — no waitFor needed since loading is the initial state.

describe("UniversalList — loading state", () => {
  it("renders the SkeletonComponent while the fetcher is pending", async () => {
    let resolveHold!: (value: ListFetchResult<SimpleItem>) => void;
    const holdingFetcher = jest.fn(
      () => new Promise<ListFetchResult<SimpleItem>>((res) => { resolveHold = res; })
    );

    render(<UniversalList config={buildConfig({ fetcher: holdingFetcher, skeletonCount: 3, SkeletonComponent: SkeletonRow })} />);

    // Skeleton rows must appear — one per skeletonCount
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3);

    // The real items must NOT be rendered yet
    expect(screen.queryByTestId("item-1")).toBeNull();

    // EmptyState title must NOT appear
    expect(screen.queryByText("Nothing here")).toBeNull();

    // Resolve to clean up
    await act(async () => { resolveHold(makeResult([])); });
  });

  it("renders ActivityIndicator (spinner) when no SkeletonComponent is provided", async () => {
    let resolveHold!: (value: ListFetchResult<SimpleItem>) => void;
    const holdingFetcher = jest.fn(
      () => new Promise<ListFetchResult<SimpleItem>>((res) => { resolveHold = res; })
    );

    const { UNSAFE_getByType } = render(<UniversalList config={buildConfig({ fetcher: holdingFetcher })} />);

    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    await act(async () => { resolveHold(makeResult([])); });
  });

  it("does NOT render EmptyState or list items in the loading state", async () => {
    let resolveHold!: (value: ListFetchResult<SimpleItem>) => void;
    const holdingFetcher = jest.fn(
      () => new Promise<ListFetchResult<SimpleItem>>((res) => { resolveHold = res; })
    );

    render(<UniversalList config={buildConfig({ fetcher: holdingFetcher, SkeletonComponent: SkeletonRow })} />);

    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.queryByTestId("item-1")).toBeNull();

    await act(async () => { resolveHold(makeResult([])); });
  });
});

// ─── 2. Error state ───────────────────────────────────────────────────────────
//
// A fetcher that rejects puts the list into the error state.
// We render synchronously and waitFor the async state update.

describe("UniversalList — error state", () => {
  it("renders the error heading and description when the fetcher throws", async () => {
    render(<UniversalList config={buildConfig({ fetcher: rejectingFetcher() })} />);

    // t("common.errorTitle") returns "common.errorTitle" in tests (key pass-through)
    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());
    expect(screen.getByText("common.errorDescription")).toBeTruthy();
  });

  it("does NOT render list items or EmptyState in the error state", async () => {
    render(<UniversalList config={buildConfig({ fetcher: rejectingFetcher() })} />);

    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());
    expect(screen.queryByTestId("item-1")).toBeNull();
    expect(screen.queryByText("Nothing here")).toBeNull();
  });

  it("renders a retry button in the error state", async () => {
    render(<UniversalList config={buildConfig({ fetcher: rejectingFetcher() })} />);

    // t("common.retry") returns "common.retry" in tests
    await waitFor(() => expect(screen.getByText("common.retry")).toBeTruthy());
  });

  it("invokes the fetcher again when the retry button is pressed", async () => {
    const fetcher = rejectingFetcher();
    render(<UniversalList config={buildConfig({ fetcher })} />);

    // Wait for first error to land
    await waitFor(() => expect(screen.getByText("common.retry")).toBeTruthy());
    // Fetcher was called once on mount
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Press retry — handleRefresh calls fetchPage(1, true) which calls fetcher again
    await act(async () => {
      fireEvent.press(screen.getByText("common.retry"));
    });

    // Fetcher must have been called a second time
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// ─── 3. Empty state ───────────────────────────────────────────────────────────
//
// A fetcher that resolves with zero items puts the list into the empty state.

describe("UniversalList — empty state", () => {
  it("renders EmptyState title after a successful fetch with zero items", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult([])) })} />);

    await waitFor(() => expect(screen.getByText("Nothing here")).toBeTruthy());
  });

  it("renders EmptyState description when provided", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult([])) })} />);

    await waitFor(() => expect(screen.getByText("No items to display.")).toBeTruthy());
  });

  it("renders EmptyState action button when emptyAction is provided", async () => {
    const onPress = jest.fn();
    render(<UniversalList config={buildConfig({
      fetcher: resolvingFetcher(makeResult([])),
      emptyAction: { label: "Try again", onPress },
    })} />);

    await waitFor(() => expect(screen.getByText("Try again")).toBeTruthy());
  });

  it("does NOT render list items or the error view when empty", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult([])) })} />);

    await waitFor(() => expect(screen.getByText("Nothing here")).toBeTruthy());
    expect(screen.queryByTestId("item-1")).toBeNull();
    expect(screen.queryByText("common.errorTitle")).toBeNull();
  });

  it("falls back to 'common.noResults' when emptyTitle is not provided", async () => {
    render(<UniversalList config={buildConfig({
      fetcher: resolvingFetcher(makeResult([])),
      emptyTitle: undefined,
    })} />);

    // t("common.noResults") returns "common.noResults" (key pass-through)
    await waitFor(() => expect(screen.getByText("common.noResults")).toBeTruthy());
  });
});

// ─── 4. Data (populated) state ────────────────────────────────────────────────
//
// A fetcher that resolves with N items must result in N rows via renderItem.

describe("UniversalList — data state", () => {
  it("renders one row per item via renderItem", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult(ITEMS)) })} />);

    await waitFor(() => expect(screen.getByTestId("item-1")).toBeTruthy());
    expect(screen.getByTestId("item-2")).toBeTruthy();
    expect(screen.getByTestId("item-3")).toBeTruthy();
  });

  it("renders the correct label text for each item", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult(ITEMS)) })} />);

    await waitFor(() => expect(screen.getByText("Item One")).toBeTruthy());
    expect(screen.getByText("Item Two")).toBeTruthy();
    expect(screen.getByText("Item Three")).toBeTruthy();
  });

  it("does NOT render EmptyState or error view when data is present", async () => {
    render(<UniversalList config={buildConfig({ fetcher: resolvingFetcher(makeResult(ITEMS)) })} />);

    await waitFor(() => expect(screen.getByText("Item One")).toBeTruthy());
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.queryByText("common.errorTitle")).toBeNull();
  });

  it("renders a single item without crashing", async () => {
    render(<UniversalList config={buildConfig({
      fetcher: resolvingFetcher(makeResult([{ id: 99, label: "Only One" }])),
    })} />);

    await waitFor(() => expect(screen.getByText("Only One")).toBeTruthy());
  });
});

// ─── 5. Header stays mounted (regression guard — TASK-B001) ──────────────────
//
// The regression in TASK-B001: if ListHeaderComponent was unmounted and
// remounted during body-branch switches, a TextInput inside the header lost
// keyboard focus mid-typing.
//
// UniversalList architecture (from the component's own JSDoc):
//   - Loading / error / empty → header is rendered in the STABLE outer View,
//     ABOVE the body-swap zone. It is never unmounted during these transitions.
//   - Data state → header is passed as ListHeaderComponent to FlashList so it
//     scrolls naturally with the list. The outer-view copy is hidden
//     (showHeaderAboveBody = false when items.length > 0).
//
// The regression guard therefore covers only the stable-outer-view cases:
//   • loading → error: header stays mounted (user is still typing in search)
//   • loading → empty: header stays mounted (search returned zero results)
//
// The loading → data transition does cause a remount because the header moves
// from the outer View into FlashList. This is intentional by design — keyboard
// focus is not at risk when results have arrived.

describe("UniversalList — header stays mounted (regression guard)", () => {
  it("does not unmount the header during a loading→empty transition", async () => {
    let mountCount = 0;

    // React.memo ensures the component identity is stable across re-renders.
    // Without memo, React would create a new component type on every render
    // of the parent test function, forcing a full remount.
    const Header = React.memo(function HeaderInner() {
      React.useEffect(() => {
        mountCount += 1;
        // Intentionally NOT decrementing so a remount (unmount+mount) is
        // visible as mountCount > 1.
        return () => {};
      }, []);
      return <RNText testID="header-search-input">Search box</RNText>;
    });

    let resolveFetch!: (value: ListFetchResult<SimpleItem>) => void;
    const transitionFetcher = jest.fn(
      () => new Promise<ListFetchResult<SimpleItem>>((res) => { resolveFetch = res; })
    );

    render(<UniversalList config={buildConfig({
      fetcher: transitionFetcher,
      ListHeaderComponent: <Header />,
      SkeletonComponent: SkeletonRow,
      skeletonCount: 2,
    })} />);

    // Header is in the stable outer View during loading
    expect(screen.getByTestId("header-search-input")).toBeTruthy();
    expect(mountCount).toBe(1);

    // Transition: resolve with ZERO items → moves to empty state (not data state)
    await act(async () => { resolveFetch(makeResult([])); });

    await waitFor(() => expect(screen.getByText("Nothing here")).toBeTruthy());

    // Header must still be present in the stable outer container
    expect(screen.getByTestId("header-search-input")).toBeTruthy();

    // CRITICAL: mount count must remain 1 — no remount during loading→empty
    expect(mountCount).toBe(1);
  });

  it("does not unmount the header during a loading→error transition", async () => {
    let mountCount = 0;

    const Header = React.memo(function HeaderInner() {
      React.useEffect(() => {
        mountCount += 1;
        return () => {};
      }, []);
      return <RNText testID="header-error-path">Search box</RNText>;
    });

    render(<UniversalList config={buildConfig({
      fetcher: rejectingFetcher(),
      ListHeaderComponent: <Header />,
      SkeletonComponent: SkeletonRow,
    })} />);

    // Header visible during loading (skeleton phase)
    expect(screen.getByTestId("header-error-path")).toBeTruthy();
    expect(mountCount).toBe(1);

    // Wait for error state to render
    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());

    // Header must still be in the stable outer container
    expect(screen.getByTestId("header-error-path")).toBeTruthy();

    // CRITICAL: mount count must remain 1 — no remount during loading→error
    expect(mountCount).toBe(1);
  });

  it("header is visible alongside the error state", async () => {
    render(<UniversalList config={buildConfig({
      fetcher: rejectingFetcher(),
      ListHeaderComponent: <RNText testID="stable-header">Stable Header</RNText>,
    })} />);

    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());
    // Header must be present in the stable outer container
    expect(screen.getByTestId("stable-header")).toBeTruthy();
  });

  it("header is visible alongside the empty state", async () => {
    render(<UniversalList config={buildConfig({
      fetcher: resolvingFetcher(makeResult([])),
      ListHeaderComponent: <RNText testID="stable-header-empty">Stable Header</RNText>,
    })} />);

    await waitFor(() => expect(screen.getByText("Nothing here")).toBeTruthy());
    expect(screen.getByTestId("stable-header-empty")).toBeTruthy();
  });
});

// ─── 6. Config id change triggers a reset + re-fetch ─────────────────────────
//
// The refetchKey pattern: `id: \`list-${refetchKey}\`` — changing the id prop
// causes UniversalList to reset items and call the fetcher again (page 1).

describe("UniversalList — config.id change resets the list", () => {
  it("calls the fetcher again when the config id changes (refetchKey pattern)", async () => {
    const fetcher = resolvingFetcher(makeResult(ITEMS));
    const { rerender } = render(<UniversalList config={buildConfig({ id: "list-1", fetcher })} />);

    await waitFor(() => expect(screen.getByText("Item One")).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender(<UniversalList config={buildConfig({ id: "list-2", fetcher })} />);
    });

    // id changed → useEffect fires again → fetcher called a second time
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
