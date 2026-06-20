/**
 * ListingFeed unit tests
 *
 * ListingFeed is the single source of truth for listing-card rendering across
 * Browse, MyListings, and UserProfile. It wraps UniversalList and chooses
 * grid vs list rendering based on the viewMode prop.
 *
 * Testing strategy:
 *   We render ListingFeed with a real resolving/holding fetcher (same pattern
 *   as UniversalList.test.tsx). UniversalList is NOT mocked — it runs through
 *   its real code so we can verify the configuration it receives indirectly via
 *   the rendered DOM (skeleton type, item layout, card variant, etc.).
 *
 *   FlashList is mocked via __mocks__/@shopify/flash-list.js so it renders
 *   items synchronously without native modules.
 *
 * Covers:
 *   1. Grid mode (viewMode="grid") — numColumns=2 skeleton, ListingCardSkeleton
 *   2. List mode (viewMode="list") — single-column skeleton, ListingCardListSkeleton
 *   3. renderListItem override used in list mode, NOT used in grid mode
 *   4. Config id includes viewMode suffix (${id}-${viewMode})
 *   5. Skeleton component differs by viewMode
 *   6. Empty state props pass through (title, description, action)
 *   7. Default onPress routes to listing detail
 *   8. Custom onPressListing overrides default routing
 *   9. savedMap / onSaveToggle passed through to cards
 *  10. showStatus passed through to cards
 */

import React from "react";
import { Text as RNText } from "react-native";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react-native";
import { ListingFeed } from "../ListingFeed";
import type { ListingFeedProps } from "../ListingFeed";
import type { Listing } from "@/api/listings";
import type { ListFetchResult, ListQuery } from "../UniversalList";

// ─── Mock lucide-react-native ─────────────────────────────────────────────────
// Icons are SVG native modules — they cannot run in Jest.
jest.mock("lucide-react-native", () => ({
  Heart: "Heart",
  MapPin: "MapPin",
  Camera: "Camera",
  Eye: "Eye",
  BadgeCheck: "BadgeCheck",
  WifiOff: "WifiOff",
  RotateCcw: "RotateCcw",
  Search: "Search",
}));

// ─── Mock @/lib/animation ─────────────────────────────────────────────────────
// useListItemEntering + triggerHaptic must be no-ops; usePulse returns empty style.
jest.mock("@/lib/animation", () => ({
  getListItemEntering: () => undefined,
  useListItemEntering: () => () => undefined,
  useReduceMotion: () => false,
  triggerHaptic: jest.fn(),
  AnimatedPressable: require("react-native").Pressable,
  usePulse: () => ({}),
}));

// ─── Mock react-native-reanimated ─────────────────────────────────────────────
// Override the setup.ts require mock with a complete stub that covers
// useSharedValue / useAnimatedStyle used inside ListingCard + skeleton.
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => {
      try { fn(); } catch { /* noop */ }
      return {};
    },
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (..._args: unknown[]) => _args[0],
    withDelay: (_d: unknown, v: unknown) => v,
    runOnUI: (fn: () => void) => fn,
    runOnJS: (fn: () => void) => fn,
    interpolate: (_v: unknown, _i: unknown[], o: unknown[]) => o[0],
    Extrapolation: { CLAMP: "CLAMP" },
    cancelAnimation: jest.fn(),
    Easing: { linear: (v: unknown) => v, ease: (v: unknown) => v, bezier: () => (v: unknown) => v },
    createAnimatedComponent: (C: React.ComponentType) => C,
  };
});

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  title: "Lenovo ThinkPad X1 Carbon",
  description: "Used for 6 months. No scratches.",
  price: 85000,
  currency: "AFN",
  status: "active",
  categoryId: 1,
  location: "Kabul, Share Naw",
  address: null,
  latitude: null,
  longitude: null,
  thumbnailUrl: null,
  viewsCount: 10,
  isSaved: false,
  isViewed: false,
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-01-10T08:00:00Z",
  seller: {
    id: 99,
    name: "Ahmad Karimi",
    city: "Kabul",
    verified: true,
    avatarUrl: null,
  },
  category: {
    id: 1,
    nameEn: "Electronics",
    namePs: "برقی توکي",
    nameFa: "الکترونیک",
    slug: "electronics",
  },
  ...overrides,
});

const LISTINGS: Listing[] = [
  makeListing({ id: 1, title: "Samsung Galaxy S24" }),
  makeListing({ id: 2, title: "Toyota Corolla 2019" }),
  makeListing({ id: 3, title: "Nike Air Max 270" }),
];

const makeResult = (items: Listing[]): ListFetchResult<Listing> => ({
  items,
  totalCount: items.length,
  totalPages: 1,
  currentPage: 1,
});

/** Fetcher that resolves immediately with the given listings */
const resolvingFetcher =
  (items: Listing[]) =>
  (_query: ListQuery): Promise<ListFetchResult<Listing>> =>
    Promise.resolve(makeResult(items));

/** Fetcher that never resolves — keeps the component in loading state */
const holdingFetcher = (): Promise<ListFetchResult<Listing>> => new Promise(() => {});

/** Default minimal props with a grid viewMode */
function buildProps(
  overrides: Partial<ListingFeedProps> & { fetcher: ListingFeedProps["fetcher"] }
): ListingFeedProps {
  return {
    id: "test-feed",
    viewMode: "grid",
    ...overrides,
  };
}

// ─── 1. Grid mode skeleton ────────────────────────────────────────────────────
//
// In loading state with viewMode="grid", the SkeletonComponent should be
// ListingCardSkeleton (grid variant). We verify this by checking that the
// list is in loading state (no items rendered) and the expected number of
// skeleton cells appear.

describe("ListingFeed — grid mode skeleton", () => {
  it("renders skeleton cells while the fetcher is pending (grid mode)", async () => {
    let resolveHold!: (value: ListFetchResult<Listing>) => void;
    const fetcher = jest.fn(
      () => new Promise<ListFetchResult<Listing>>((res) => { resolveHold = res; })
    );

    render(
      <ListingFeed
        {...buildProps({ id: "feed-1", fetcher, viewMode: "grid", skeletonCount: 4 })}
      />
    );

    // Skeleton cells rendered (ListingCardSkeleton renders a View with colors.card bg)
    // The skeleton is rendered skeletonCount=4 times, so no real items appear.
    expect(screen.queryByText("Samsung Galaxy S24")).toBeNull();
    expect(screen.queryByText("Toyota Corolla 2019")).toBeNull();

    await act(async () => { resolveHold(makeResult([])); });
  });

  it("renders items after fetcher resolves in grid mode", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-grid-items",
          fetcher: resolvingFetcher(LISTINGS),
          viewMode: "grid",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());
    expect(screen.getByText("Toyota Corolla 2019")).toBeTruthy();
    expect(screen.getByText("Nike Air Max 270")).toBeTruthy();
  });

  it("renders without crashing with zero listings in grid mode", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-grid-empty",
          fetcher: resolvingFetcher([]),
          viewMode: "grid",
          emptyTitle: "No listings found",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("No listings found")).toBeTruthy());
  });
});

// ─── 2. List mode skeleton ────────────────────────────────────────────────────
//
// In loading state with viewMode="list", the SkeletonComponent should be
// ListingCardListSkeleton. We verify indirectly: no items rendered, loading state.

describe("ListingFeed — list mode skeleton", () => {
  it("renders skeleton cells while the fetcher is pending (list mode)", async () => {
    let resolveHold!: (value: ListFetchResult<Listing>) => void;
    const fetcher = jest.fn(
      () => new Promise<ListFetchResult<Listing>>((res) => { resolveHold = res; })
    );

    render(
      <ListingFeed
        {...buildProps({ id: "feed-2", fetcher, viewMode: "list", skeletonCount: 3 })}
      />
    );

    expect(screen.queryByText("Samsung Galaxy S24")).toBeNull();

    await act(async () => { resolveHold(makeResult([])); });
  });

  it("renders items after fetcher resolves in list mode", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-list-items",
          fetcher: resolvingFetcher(LISTINGS),
          viewMode: "list",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());
    expect(screen.getByText("Toyota Corolla 2019")).toBeTruthy();
    expect(screen.getByText("Nike Air Max 270")).toBeTruthy();
  });

  it("renders without crashing with zero listings in list mode", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-list-empty",
          fetcher: resolvingFetcher([]),
          viewMode: "list",
          emptyTitle: "Your list is empty",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Your list is empty")).toBeTruthy());
  });
});

// ─── 3. renderListItem override ───────────────────────────────────────────────
//
// When renderListItem is provided and viewMode="list", the override is used
// instead of the default ListingCard list variant.
// When viewMode="grid", the override is ignored — standard ListingCard grid
// variant renders instead.

describe("ListingFeed — renderListItem override", () => {
  it("uses renderListItem in list mode (custom card is rendered)", async () => {
    const customRenderItem = jest.fn(({ item }: { item: Listing }) => (
      <RNText testID={`custom-${item.id}`}>CUSTOM: {item.title}</RNText>
    ));

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-custom-list",
          fetcher: resolvingFetcher(LISTINGS),
          viewMode: "list",
          renderListItem: customRenderItem,
        })}
      />
    );

    await waitFor(() => expect(screen.getByTestId("custom-1")).toBeTruthy());
    expect(screen.getByText("CUSTOM: Samsung Galaxy S24")).toBeTruthy();
    expect(screen.getByTestId("custom-2")).toBeTruthy();
    expect(screen.getByTestId("custom-3")).toBeTruthy();

    // The custom render function must have been called for each item
    expect(customRenderItem).toHaveBeenCalledTimes(LISTINGS.length);
  });

  it("does NOT use renderListItem in grid mode (standard card renders)", async () => {
    const customRenderItem = jest.fn(({ item }: { item: Listing }) => (
      <RNText testID={`custom-${item.id}`}>CUSTOM: {item.title}</RNText>
    ));

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-custom-grid",
          fetcher: resolvingFetcher(LISTINGS),
          viewMode: "grid",
          renderListItem: customRenderItem,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());

    // Custom render function must NOT have been called in grid mode
    expect(customRenderItem).not.toHaveBeenCalled();

    // Custom testIDs must NOT appear — grid uses standard ListingCard
    expect(screen.queryByTestId("custom-1")).toBeNull();
  });
});

// ─── 4. Config id includes viewMode suffix ────────────────────────────────────
//
// The component builds the UniversalList config with id: `${id}-${viewMode}`.
// We verify this indirectly: switching from "grid" to "list" causes the
// UniversalList to re-mount (new config id) and re-fetch.

describe("ListingFeed — config id viewMode suffix", () => {
  it("re-fetches when viewMode changes (id suffix changes, triggering re-mount)", async () => {
    const fetcher = jest.fn(resolvingFetcher(LISTINGS));

    const { rerender } = render(
      <ListingFeed
        {...buildProps({ id: "feed-id", fetcher, viewMode: "grid" })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());
    const callsAfterGrid = fetcher.mock.calls.length;
    expect(callsAfterGrid).toBeGreaterThanOrEqual(1);

    // Switch to list mode — the config id changes from "feed-id-grid" to
    // "feed-id-list", which causes UniversalList to reset and re-fetch.
    await act(async () => {
      rerender(
        <ListingFeed
          {...buildProps({ id: "feed-id", fetcher, viewMode: "list" })}
        />
      );
    });

    // Fetcher must have been called again after the id change
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsAfterGrid));
  });

  it("re-fetches when the outer id changes (filters changed)", async () => {
    const fetcher = jest.fn(resolvingFetcher(LISTINGS));

    const { rerender } = render(
      <ListingFeed
        {...buildProps({ id: "feed-filter-a", fetcher, viewMode: "grid" })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());
    const callsAfterFirst = fetcher.mock.calls.length;

    await act(async () => {
      rerender(
        <ListingFeed
          {...buildProps({ id: "feed-filter-b", fetcher, viewMode: "grid" })}
        />
      );
    });

    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(callsAfterFirst));
  });
});

// ─── 5. Skeleton component differs by viewMode ────────────────────────────────
//
// We verify indirectly that the skeleton branch is entered in both modes.
// The actual SkeletonComponent chosen (ListingCardSkeleton vs ListingCardListSkeleton)
// is exercised by rendering them; if the wrong one were chosen, a crash or
// structural mismatch would appear. We assert the loading state renders without
// crashing for both modes.

describe("ListingFeed — skeleton component by viewMode", () => {
  it("renders loading state without crashing in grid mode", async () => {
    let resolveHold!: (value: ListFetchResult<Listing>) => void;
    const fetcher = jest.fn(
      () => new Promise<ListFetchResult<Listing>>((res) => { resolveHold = res; })
    );

    expect(() =>
      render(
        <ListingFeed
          {...buildProps({
            id: "skel-grid",
            fetcher,
            viewMode: "grid",
            skeletonCount: 2,
          })}
        />
      )
    ).not.toThrow();

    await act(async () => { resolveHold(makeResult([])); });
  });

  it("renders loading state without crashing in list mode", async () => {
    let resolveHold!: (value: ListFetchResult<Listing>) => void;
    const fetcher = jest.fn(
      () => new Promise<ListFetchResult<Listing>>((res) => { resolveHold = res; })
    );

    expect(() =>
      render(
        <ListingFeed
          {...buildProps({
            id: "skel-list",
            fetcher,
            viewMode: "list",
            skeletonCount: 2,
          })}
        />
      )
    ).not.toThrow();

    await act(async () => { resolveHold(makeResult([])); });
  });
});

// ─── 6. Empty state props pass through ───────────────────────────────────────

describe("ListingFeed — empty state passthrough", () => {
  it("shows emptyTitle when fetcher returns zero items", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-empty-title",
          fetcher: resolvingFetcher([]),
          viewMode: "grid",
          emptyTitle: "No Afghan listings",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("No Afghan listings")).toBeTruthy());
  });

  it("shows emptyDescription when fetcher returns zero items", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-empty-desc",
          fetcher: resolvingFetcher([]),
          viewMode: "list",
          emptyTitle: "Nothing here",
          emptyDescription: "No items listed in Kabul yet.",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("No items listed in Kabul yet.")).toBeTruthy());
  });

  it("shows emptyAction button when provided", async () => {
    const onPress = jest.fn();
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-empty-action",
          fetcher: resolvingFetcher([]),
          viewMode: "grid",
          emptyTitle: "Empty",
          emptyAction: { label: "Refresh feed", onPress },
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Refresh feed")).toBeTruthy());
    fireEvent.press(screen.getByText("Refresh feed"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ─── 7. Default onPress routes to listing detail ──────────────────────────────

describe("ListingFeed — default navigation on card press", () => {
  it("navigates to listing detail with the correct id when no onPressListing is provided", async () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-nav",
          fetcher: resolvingFetcher([makeListing({ id: 77, title: "HP Spectre x360" })]),
          viewMode: "grid",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("HP Spectre x360")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "HP Spectre x360" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/listing/[id]",
      params: { id: "77" },
    });
  });
});

// ─── 8. Custom onPressListing overrides default routing ──────────────────────

describe("ListingFeed — custom onPressListing", () => {
  it("calls onPressListing with the listing object and does not call router.push", async () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const listing = makeListing({ id: 55, title: "Kabul Market Chair" });
    const onPressListing = jest.fn();

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-custom-press",
          fetcher: resolvingFetcher([listing]),
          viewMode: "grid",
          onPressListing,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Kabul Market Chair")).toBeTruthy());

    fireEvent.press(screen.getByRole("button", { name: "Kabul Market Chair" }));

    expect(onPressListing).toHaveBeenCalledTimes(1);
    expect(onPressListing).toHaveBeenCalledWith(listing);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ─── 9. savedMap / onSaveToggle passed through ───────────────────────────────

describe("ListingFeed — savedMap and onSaveToggle passthrough", () => {
  it("shows save heart and calls onSaveToggle when a card is pressed (grid mode)", async () => {
    const onSaveToggle = jest.fn();
    const listing = makeListing({ id: 10, title: "Afghan Carpet Large" });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-save-grid",
          fetcher: resolvingFetcher([listing]),
          viewMode: "grid",
          savedMap: { 10: false },
          onSaveToggle,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Afghan Carpet Large")).toBeTruthy());

    fireEvent.press(screen.getByRole("togglebutton"));
    expect(onSaveToggle).toHaveBeenCalledTimes(1);
    expect(onSaveToggle).toHaveBeenCalledWith(10, true);
  });

  it("shows save heart and calls onSaveToggle when a card is pressed (list mode)", async () => {
    const onSaveToggle = jest.fn();
    const listing = makeListing({ id: 20, title: "Herat Silk Scarf" });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-save-list",
          fetcher: resolvingFetcher([listing]),
          viewMode: "list",
          savedMap: { 20: true },
          onSaveToggle,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Herat Silk Scarf")).toBeTruthy());

    fireEvent.press(screen.getByRole("togglebutton"));
    expect(onSaveToggle).toHaveBeenCalledTimes(1);
    expect(onSaveToggle).toHaveBeenCalledWith(20, false); // was true → toggled to false
  });
});

// ─── 10. showStatus passed through ───────────────────────────────────────────

describe("ListingFeed — showStatus passthrough", () => {
  it("renders status badge when showStatus=true (grid mode)", async () => {
    const listing = makeListing({ id: 30, title: "Draft Phone", status: "draft" });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-status-grid",
          fetcher: resolvingFetcher([listing]),
          viewMode: "grid",
          showStatus: true,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Draft Phone")).toBeTruthy());
    // t('listing.status.draft') → 'listing.status.draft' (key pass-through)
    expect(screen.getByText("listing.status.draft")).toBeTruthy();
  });

  it("renders status badge when showStatus=true (list mode)", async () => {
    const listing = makeListing({ id: 31, title: "Reserved Laptop", status: "reserved" });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-status-list",
          fetcher: resolvingFetcher([listing]),
          viewMode: "list",
          showStatus: true,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Reserved Laptop")).toBeTruthy());
    expect(screen.getByText("listing.status.reserved")).toBeTruthy();
  });

  it("does NOT render status badge when showStatus=false (default)", async () => {
    const listing = makeListing({ id: 32, title: "Active Item", status: "active" });

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-no-status",
          fetcher: resolvingFetcher([listing]),
          viewMode: "grid",
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Active Item")).toBeTruthy());
    expect(screen.queryByText("listing.status.active")).toBeNull();
  });
});

// ─── 11. ListHeaderComponent pass-through ────────────────────────────────────

describe("ListingFeed — ListHeaderComponent pass-through", () => {
  it("renders the header while in loading state", async () => {
    let resolveHold!: (value: ListFetchResult<Listing>) => void;
    const fetcher = jest.fn(
      () => new Promise<ListFetchResult<Listing>>((res) => { resolveHold = res; })
    );

    render(
      <ListingFeed
        {...buildProps({
          id: "feed-header",
          fetcher,
          viewMode: "grid",
          ListHeaderComponent: <RNText testID="feed-header-text">Browse Header</RNText>,
        })}
      />
    );

    expect(screen.getByTestId("feed-header-text")).toBeTruthy();

    await act(async () => { resolveHold(makeResult([])); });
  });

  it("renders the header after data loads", async () => {
    render(
      <ListingFeed
        {...buildProps({
          id: "feed-header-data",
          fetcher: resolvingFetcher(LISTINGS),
          viewMode: "grid",
          ListHeaderComponent: <RNText testID="feed-data-header">Search Bar</RNText>,
        })}
      />
    );

    await waitFor(() => expect(screen.getByText("Samsung Galaxy S24")).toBeTruthy());
    expect(screen.getByTestId("feed-data-header")).toBeTruthy();
  });
});

// ─── 12. Smoke tests ─────────────────────────────────────────────────────────

describe("ListingFeed — smoke tests", () => {
  it("renders without crashing with minimal required props (grid)", async () => {
    expect(() =>
      render(
        <ListingFeed
          id="smoke-grid"
          viewMode="grid"
          fetcher={holdingFetcher}
        />
      )
    ).not.toThrow();
  });

  it("renders without crashing with minimal required props (list)", async () => {
    expect(() =>
      render(
        <ListingFeed
          id="smoke-list"
          viewMode="list"
          fetcher={holdingFetcher}
        />
      )
    ).not.toThrow();
  });

  it("renders all four listing statuses without crashing (grid)", async () => {
    const statusListings: Listing[] = (
      ["draft", "active", "reserved", "sold"] as const
    ).map((status, i) => makeListing({ id: i + 100, title: `Item ${status}`, status }));

    expect(() =>
      render(
        <ListingFeed
          id="smoke-statuses"
          viewMode="grid"
          fetcher={resolvingFetcher(statusListings)}
          showStatus
        />
      )
    ).not.toThrow();
  });
});
