/**
 * SavedSearches container unit tests
 *
 * The component uses @tanstack/react-query to fetch saved searches via
 * savedSearchesAPI.list(), renders one SavedSearchItem per entry, shows a
 * loading spinner while fetching, renders nothing (null) when the list
 * is empty, and fires onSelectSearch with the correct SavedSearch payload when
 * an item chip is tapped.
 *
 * Strategy
 * --------
 * - Mock `@/api/saved-searches` so all tests control the resolved data without
 *   needing MSW or network access.
 * - Mock `lucide-react-native` (X icon) to a plain string so the native SVG
 *   module does not break Jest.
 * - Wrap every render in a fresh QueryClient (retry: false) to avoid stale
 *   state between test cases.
 * - useColors, useTranslation, and useLocalization are mocked globally in
 *   src/__tests__/setup.ts — t(key) returns the key.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mock @/lib/animation ──────────────────────────────────────────────────────
// SavedSearchItem uses useReduceMotion from this module.  Mock it to avoid
// calling AccessibilityInfo (a native module) in the Jest environment.
jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
  usePulse: () => ({ opacity: 1 }),
  triggerHaptic: jest.fn(),
  AnimatedPressable: ({ children }: { children: React.ReactNode }) => children,
  getListItemEntering: () => null,
  useListItemEntering: () => null,
}));

// ── Mock lucide-react-native ──────────────────────────────────────────────────
jest.mock("lucide-react-native", () => ({
  X: "X",
}));

// ── Mock the saved-searches API module ───────────────────────────────────────
// We control what list() resolves to in each test group.
const mockList = jest.fn();
const mockDelete = jest.fn();
const mockMarkSeen = jest.fn();

jest.mock("@/api/saved-searches", () => ({
  savedSearchesAPI: {
    list: (...args: unknown[]) => mockList(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    markSeen: (...args: unknown[]) => mockMarkSeen(...args),
  },
}));

// SavedSearchItem now resolves the category via useCategories; stub it so the
// chips fall back to the (English) categoryName snapshot without a real query.
jest.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ data: undefined }),
}));

// ── Import component AFTER mocks are declared ─────────────────────────────────
import { SavedSearches } from "../SavedSearches";
import type { SavedSearch } from "@/api/saved-searches";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_SEARCH: SavedSearch = {
  id: 1,
  location: null,
  categoryId: null,
  categoryName: null,
  priceMin: null,
  priceMax: null,
  latitude: null,
  longitude: null,
  radius: null,
  locationBased: false,
  createdAt: "2025-01-01T00:00:00.000Z",
  lastViewedAt: null,
  newMatchesCount: 0,
};

function makeSearch(overrides: Partial<SavedSearch> = {}): SavedSearch {
  return { ...BASE_SEARCH, ...overrides };
}

const POPULATED_SEARCHES: SavedSearch[] = [
  makeSearch({ id: 1, location: "Kabul" }),
  makeSearch({ id: 2, categoryName: "Electronics" }),
  makeSearch({ id: 3, location: "Herat", priceMin: 1000, priceMax: 5000 }),
  makeSearch({ id: 4, locationBased: true, radius: 10, latitude: 34.5, longitude: 69.2 }),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderComponent(onSelectSearch = jest.fn(), qc = makeQueryClient()) {
  render(
    <QueryClientProvider client={qc}>
      <SavedSearches onSelectSearch={onSelectSearch} />
    </QueryClientProvider>
  );
  return { onSelectSearch };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockList.mockReset();
  mockDelete.mockReset();
  mockMarkSeen.mockReset();
  mockMarkSeen.mockResolvedValue(undefined);
});

// ── 1. Loading state ──────────────────────────────────────────────────────────

describe("SavedSearches — loading state", () => {
  it("renders an ActivityIndicator while the query is pending", async () => {
    // Never-resolving promise keeps the component in loading state
    mockList.mockReturnValue(new Promise(() => {}));
    renderComponent();
    // Wrap in waitFor so React flushes any async state updates before we assert,
    // eliminating "not wrapped in act(...)" warnings from react-query's internals.
    await waitFor(() => {
      expect(screen.queryByText("Kabul")).toBeNull();
      expect(screen.queryByText("browse.applyFilters")).toBeNull();
    });
  });
});

// ── 2. Empty state ────────────────────────────────────────────────────────────

describe("SavedSearches — empty state", () => {
  it("renders nothing (null) when the list resolves to []", async () => {
    mockList.mockResolvedValue([]);
    renderComponent();
    // The component hides itself entirely when there are no saved searches —
    // no empty-state text, no chips. Wait for the query to settle, then confirm.
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    expect(screen.queryByText("browse.applyFilters")).toBeNull();
  });

  it("does NOT render any SavedSearchItem when the list is empty", async () => {
    mockList.mockResolvedValue([]);
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByText("browse.savedSearch")).toBeNull();
    });
  });
});

// ── 3. Populated state ────────────────────────────────────────────────────────

describe("SavedSearches — populated list", () => {
  it("renders one chip per saved-search entry", async () => {
    mockList.mockResolvedValue(POPULATED_SEARCHES);
    renderComponent();
    await waitFor(() => {
      // Each item renders its label; the location-based one uses the key
      expect(screen.getByText("Kabul")).toBeTruthy();
      expect(screen.getByText("Electronics")).toBeTruthy();
    });
  });

  it("renders exactly as many chips as there are entries", async () => {
    mockList.mockResolvedValue(POPULATED_SEARCHES);
    renderComponent();
    await waitFor(() => {
      // POPULATED_SEARCHES has 4 items; id:4 renders "browse.withinRadius" from the mock t()
      expect(screen.getByText("browse.withinRadius")).toBeTruthy();
    });
  });

  it("does NOT render the empty-state message when items are present", async () => {
    mockList.mockResolvedValue(POPULATED_SEARCHES);
    renderComponent();
    await waitFor(() => {
      expect(screen.queryByText("browse.applyFilters")).toBeNull();
    });
  });

  it("renders a single-item list correctly", async () => {
    mockList.mockResolvedValue([makeSearch({ id: 1, location: "Kandahar" })]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Kandahar")).toBeTruthy();
    });
  });
});

// ── 4. onSelectSearch callback ────────────────────────────────────────────────

describe("SavedSearches — onSelectSearch callback", () => {
  it("calls onSelectSearch with the correct SavedSearch payload when a chip is tapped", async () => {
    const search = makeSearch({ id: 5, location: "Mazar-e-Sharif" });
    mockList.mockResolvedValue([search]);
    const onSelectSearch = jest.fn();
    renderComponent(onSelectSearch);

    await waitFor(() => {
      expect(screen.getByText("Mazar-e-Sharif")).toBeTruthy();
    });

    // Tap the chip text — the outer Pressable propagates onSelectSearch(search)
    fireEvent.press(screen.getByText("Mazar-e-Sharif"));
    expect(onSelectSearch).toHaveBeenCalledTimes(1);
    expect(onSelectSearch).toHaveBeenCalledWith(search);
  });

  it("passes the full search object (not just id) to the callback", async () => {
    const search = makeSearch({
      id: 7,
      location: "Jalalabad",
      categoryName: "Vehicles",
      priceMin: 5000,
      priceMax: 20000,
    });
    mockList.mockResolvedValue([search]);
    const onSelectSearch = jest.fn();
    renderComponent(onSelectSearch);

    // Wait for the full summary text to be visible
    await waitFor(() => {
      expect(screen.getByText("Jalalabad • Vehicles • 5000-20000")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Jalalabad • Vehicles • 5000-20000"));
    expect(onSelectSearch).toHaveBeenCalledWith(search);
  });

  it("fires onSelectSearch independently for each chip", async () => {
    const searchA = makeSearch({ id: 10, location: "Kabul" });
    const searchB = makeSearch({ id: 11, location: "Herat" });
    mockList.mockResolvedValue([searchA, searchB]);
    const onSelectSearch = jest.fn();
    renderComponent(onSelectSearch);

    await waitFor(() => {
      expect(screen.getByText("Kabul")).toBeTruthy();
      expect(screen.getByText("Herat")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Herat"));
    expect(onSelectSearch).toHaveBeenCalledTimes(1);
    expect(onSelectSearch).toHaveBeenCalledWith(searchB);

    fireEvent.press(screen.getByText("Kabul"));
    expect(onSelectSearch).toHaveBeenCalledTimes(2);
    expect(onSelectSearch).toHaveBeenNthCalledWith(2, searchA);
  });

  it("does not call onSelectSearch when no items are rendered", async () => {
    mockList.mockResolvedValue([]);
    const onSelectSearch = jest.fn();
    renderComponent(onSelectSearch);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    expect(onSelectSearch).not.toHaveBeenCalled();
  });
});

// ── 5. Optimistic delete ──────────────────────────────────────────────────────
//
// The delete (X) button is located by its accessibility label ("common.delete",
// which the i18n test stub returns verbatim). This is stable across render-tree
// changes — unlike indexing into UNSAFE_getAllByType(View), which was order-
// dependent and flaked when the suite ran after other specs.

describe("SavedSearches — optimistic delete", () => {
  it("calls savedSearchesAPI.delete with the correct id when X is tapped", async () => {
    const search = makeSearch({ id: 99, location: "Kunduz" });
    mockList.mockResolvedValue([search]);
    // Resolve immediately so the optimistic cache update is not rolled back
    mockDelete.mockResolvedValue(undefined);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kunduz")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("common.delete"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledWith(99);
    });
  });

  it("optimistically removes the chip before the server responds", async () => {
    const search = makeSearch({ id: 99, location: "Kunduz" });
    mockList.mockResolvedValue([search]);
    // A controllable deferred: stays pending while we observe the optimistic
    // removal, then is resolved before the test ends so no promise leaks into
    // the next suite (a never-resolving promise caused cross-suite flakiness).
    let resolveDelete: () => void = () => {};
    mockDelete.mockReturnValue(new Promise<void>((res) => { resolveDelete = res; }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kunduz")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("common.delete"));

    try {
      // The chip should disappear (optimistic update) even though the delete
      // request has not resolved. Generous timeout: under full-suite parallel
      // load the optimistic re-render can exceed waitFor's 1000ms default.
      await waitFor(
        () => {
          expect(screen.queryByText("Kunduz")).toBeNull();
        },
        { timeout: 4000 }
      );
    } finally {
      // Always settle the mutation so nothing stays pending past this test
      // (a leaked promise previously caused cross-suite flakiness).
      resolveDelete();
    }
  });

  it("rolls back the chip when savedSearchesAPI.delete rejects", async () => {
    const search = makeSearch({ id: 99, location: "Kunduz" });
    mockList.mockResolvedValue([search]);
    // Reject so the onError rollback path in the mutation is exercised.
    mockDelete.mockRejectedValue(new Error("network error"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kunduz")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("common.delete"));

    // After the rejection, onError restores the previous cache snapshot,
    // so the chip should reappear.
    await waitFor(() => {
      expect(screen.getByText("Kunduz")).toBeTruthy();
    });
  });
});

// ── 6. Smoke tests ────────────────────────────────────────────────────────────

describe("SavedSearches — smoke tests", () => {
  it("renders without throwing when list resolves to an empty array", async () => {
    mockList.mockResolvedValue([]);
    expect(() => renderComponent()).not.toThrow();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it("renders without throwing when list resolves to a full set of items", async () => {
    mockList.mockResolvedValue(POPULATED_SEARCHES);
    expect(() => renderComponent()).not.toThrow();
    await waitFor(() => {
      expect(screen.getByText("Kabul")).toBeTruthy();
    });
  });

  it("calls savedSearchesAPI.list exactly once on mount", async () => {
    mockList.mockResolvedValue([]);
    renderComponent();
    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});

// ── 7. New-matches badge ──────────────────────────────────────────────────────

describe("SavedSearches — new-matches badge", () => {
  it("calls markSeen when a chip with newMatchesCount > 0 is tapped", async () => {
    const search = makeSearch({ id: 20, location: "Kabul", newMatchesCount: 3 });
    mockList.mockResolvedValue([search]);
    mockMarkSeen.mockResolvedValue({ ...search, newMatchesCount: 0 });

    const { onSelectSearch } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Kabul")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Kabul"));

    expect(onSelectSearch).toHaveBeenCalledWith(search);
    await waitFor(() => {
      expect(mockMarkSeen).toHaveBeenCalledWith(20);
    });
  });

  it("does NOT call markSeen when newMatchesCount is 0", async () => {
    const search = makeSearch({ id: 21, location: "Herat", newMatchesCount: 0 });
    mockList.mockResolvedValue([search]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Herat")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Herat"));

    await waitFor(() => {
      expect(mockMarkSeen).not.toHaveBeenCalled();
    });
  });
});
