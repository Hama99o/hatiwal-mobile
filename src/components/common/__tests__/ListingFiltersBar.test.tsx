/**
 * ListingFiltersBar unit tests
 *
 * Covers: search input rendering + placeholder, onSearchChange callback,
 * clear-X visibility + callback, category chip rendering ("All" + per-category),
 * category chip callbacks, grid/list toggle callbacks, empty/undefined categories
 * guard, and RTL rendering smoke test.
 *
 * Mocking strategy
 * ----------------
 * - lucide-react-native — each icon reduced to a plain string tag so Jest never
 *   tries to evaluate the native SVG module. Same approach as SavedSearches.test.tsx.
 * - useCategoryName — returns (cat) => cat.nameEn, identical to CategoryChipRow.test.tsx.
 * - useColors, useTranslation, useLocalization — mocked globally in
 *   src/__tests__/setup.ts; t(key) returns the key; isRtl defaults to false.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ListingFiltersBar } from "../ListingFiltersBar";
import type { Category } from "@/api/categories";

// ── Mock lucide-react-native ──────────────────────────────────────────────────
// Reduce every icon to a trivial host element so the SVG native module is never
// evaluated. Mirrors the style used in SavedSearches.test.tsx.
jest.mock("lucide-react-native", () => ({
  Search: "Search",
  X: "X",
  LayoutGrid: "LayoutGrid",
  List: "List",
}));

// ── Mock useCategoryName ──────────────────────────────────────────────────────
// Return English name — identical pattern used by CategoryChipRow.test.tsx.
jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: Category) => cat.nameEn,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 1,
    slug: "electronics",
    nameEn: "Electronics",
    namePs: "برقي توکي",
    nameFa: "الکترونیک",
    icon: "💻",
    position: 1,
  },
  {
    id: 2,
    slug: "vehicles",
    nameEn: "Vehicles",
    namePs: "موټرونه",
    nameFa: "وسایل نقلیه",
    icon: "🚗",
    position: 2,
  },
  {
    id: 3,
    slug: "clothes",
    nameEn: "Clothes",
    namePs: "جامې",
    nameFa: "لباس",
    icon: "👗",
    position: 3,
  },
];

// ── Render helper ─────────────────────────────────────────────────────────────

type RenderProps = Partial<React.ComponentProps<typeof ListingFiltersBar>>;

function renderBar(props: RenderProps = {}) {
  const defaults = {
    search: "",
    onSearchChange: jest.fn(),
    categories: CATEGORIES,
    categoryId: null as number | null,
    onCategoryChange: jest.fn(),
    viewMode: "grid" as const,
    onViewModeChange: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<ListingFiltersBar {...merged} />), ...merged };
}

// ── 1. Search input ───────────────────────────────────────────────────────────

describe("ListingFiltersBar — search input", () => {
  it("renders a TextInput with the default placeholder when none is supplied", () => {
    renderBar();
    // t('common.search') returns the key in tests
    expect(screen.getByPlaceholderText("common.search")).toBeTruthy();
  });

  it("renders a TextInput with the custom placeholder when one is supplied", () => {
    renderBar({ placeholder: "Search listings…" });
    expect(screen.getByPlaceholderText("Search listings…")).toBeTruthy();
  });

  it("reflects the current search value via the controlled prop", () => {
    renderBar({ search: "phone" });
    expect(screen.getByDisplayValue("phone")).toBeTruthy();
  });

  it("calls onSearchChange with the typed text when the input changes", () => {
    const onSearchChange = jest.fn();
    renderBar({ onSearchChange });
    fireEvent.changeText(screen.getByPlaceholderText("common.search"), "laptop");
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("laptop");
  });
});

// ── 2. Clear (X) button ───────────────────────────────────────────────────────

describe("ListingFiltersBar — clear X button", () => {
  it("does NOT render the clear button when search is empty", () => {
    renderBar({ search: "" });
    // accessibilityLabel = t('common.clear') = key in tests
    expect(screen.queryByRole("button", { name: "common.clear" })).toBeNull();
  });

  it("renders the clear button when search has text", () => {
    renderBar({ search: "abc" });
    expect(screen.getByRole("button", { name: "common.clear" })).toBeTruthy();
  });

  it("calls onSearchChange('') when the clear button is pressed", () => {
    const onSearchChange = jest.fn();
    renderBar({ search: "hello", onSearchChange });
    fireEvent.press(screen.getByRole("button", { name: "common.clear" }));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});

// ── 3. Category chips — rendering ─────────────────────────────────────────────

describe("ListingFiltersBar — category chip rendering", () => {
  it("renders an 'All' chip when categories are provided", () => {
    renderBar();
    // t('common.all') returns the key
    expect(screen.getByText("common.all")).toBeTruthy();
  });

  it("renders one chip per category", () => {
    renderBar();
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByText("Vehicles")).toBeTruthy();
    expect(screen.getByText("Clothes")).toBeTruthy();
  });

  it("does NOT render the category row when categories is undefined", () => {
    renderBar({ categories: undefined });
    expect(screen.queryByText("common.all")).toBeNull();
    expect(screen.queryByText("Electronics")).toBeNull();
  });

  it("does NOT render the category row when categories is an empty array", () => {
    renderBar({ categories: [] });
    expect(screen.queryByText("common.all")).toBeNull();
  });

  it("renders the emoji icon for categories that have one", () => {
    renderBar();
    expect(screen.getByText("💻")).toBeTruthy();
    expect(screen.getByText("🚗")).toBeTruthy();
    expect(screen.getByText("👗")).toBeTruthy();
  });
});

// ── 4. Category chips — selected state ───────────────────────────────────────

describe("ListingFiltersBar — category chip selected state", () => {
  it("'All' chip has accessibilityState.selected=true when categoryId is null", () => {
    renderBar({ categoryId: null });
    expect(
      screen.getByRole("button", { name: "common.all" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("'All' chip has accessibilityState.selected=false when a category is selected", () => {
    renderBar({ categoryId: 1 });
    expect(
      screen.getByRole("button", { name: "common.all" }).props.accessibilityState?.selected
    ).toBe(false);
  });

  it("the active category chip has accessibilityState.selected=true", () => {
    renderBar({ categoryId: 2 });
    expect(
      screen.getByRole("button", { name: "Vehicles" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("non-active category chips have accessibilityState.selected=false", () => {
    renderBar({ categoryId: 2 });
    expect(
      screen.getByRole("button", { name: "Electronics" }).props.accessibilityState?.selected
    ).toBe(false);
  });
});

// ── 5. Category chips — callbacks ─────────────────────────────────────────────

describe("ListingFiltersBar — category chip callbacks", () => {
  it("calls onCategoryChange(null) when the 'All' chip is pressed", () => {
    const onCategoryChange = jest.fn();
    renderBar({ onCategoryChange });
    fireEvent.press(screen.getByRole("button", { name: "common.all" }));
    expect(onCategoryChange).toHaveBeenCalledTimes(1);
    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it("calls onCategoryChange(id) when a category chip is pressed", () => {
    const onCategoryChange = jest.fn();
    renderBar({ onCategoryChange });
    fireEvent.press(screen.getByRole("button", { name: "Electronics" }));
    expect(onCategoryChange).toHaveBeenCalledTimes(1);
    expect(onCategoryChange).toHaveBeenCalledWith(1);
  });

  it("calls onCategoryChange with the correct id for each chip", () => {
    const onCategoryChange = jest.fn();
    renderBar({ onCategoryChange });

    fireEvent.press(screen.getByRole("button", { name: "Clothes" }));
    expect(onCategoryChange).toHaveBeenLastCalledWith(3);

    fireEvent.press(screen.getByRole("button", { name: "Vehicles" }));
    expect(onCategoryChange).toHaveBeenLastCalledWith(2);
  });
});

// ── 6. View mode toggle ───────────────────────────────────────────────────────

describe("ListingFiltersBar — view mode toggle", () => {
  it("renders both grid and list toggle buttons", () => {
    renderBar();
    // accessibilityLabel = t('browse.viewGrid') / t('browse.viewList')
    expect(screen.getByRole("button", { name: "browse.viewGrid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "browse.viewList" })).toBeTruthy();
  });

  it("calls onViewModeChange('grid') when the grid button is pressed", () => {
    const onViewModeChange = jest.fn();
    renderBar({ onViewModeChange, viewMode: "list" });
    fireEvent.press(screen.getByRole("button", { name: "browse.viewGrid" }));
    expect(onViewModeChange).toHaveBeenCalledTimes(1);
    expect(onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("calls onViewModeChange('list') when the list button is pressed", () => {
    const onViewModeChange = jest.fn();
    renderBar({ onViewModeChange, viewMode: "grid" });
    fireEvent.press(screen.getByRole("button", { name: "browse.viewList" }));
    expect(onViewModeChange).toHaveBeenCalledTimes(1);
    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });

  it("grid button has accessibilityState.selected=true when viewMode is 'grid'", () => {
    renderBar({ viewMode: "grid" });
    expect(
      screen.getByRole("button", { name: "browse.viewGrid" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("list button has accessibilityState.selected=true when viewMode is 'list'", () => {
    renderBar({ viewMode: "list" });
    expect(
      screen.getByRole("button", { name: "browse.viewList" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("grid button has accessibilityState.selected=false when viewMode is 'list'", () => {
    renderBar({ viewMode: "list" });
    expect(
      screen.getByRole("button", { name: "browse.viewGrid" }).props.accessibilityState?.selected
    ).toBe(false);
  });
});

// ── 7. RTL smoke test ─────────────────────────────────────────────────────────
//
// The global setup.ts mocks useLocalization() with isRtl:false. RTL layout
// differences are flexDirection style changes driven by isRtl — we verify the
// component renders and shows the expected chips regardless.

describe("ListingFiltersBar — RTL", () => {
  it("renders all chips and buttons in default (LTR) mode", () => {
    renderBar();
    expect(screen.getByText("common.all")).toBeTruthy();
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByRole("button", { name: "browse.viewGrid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "browse.viewList" })).toBeTruthy();
  });

  it("renders search input and toggle even when categories is undefined", () => {
    renderBar({ categories: undefined });
    expect(screen.getByPlaceholderText("common.search")).toBeTruthy();
    expect(screen.getByRole("button", { name: "browse.viewGrid" })).toBeTruthy();
  });
});

// ── 8. Smoke tests ────────────────────────────────────────────────────────────

describe("ListingFiltersBar — smoke tests", () => {
  it("renders with all props populated", () => {
    renderBar({
      search: "phone",
      categories: CATEGORIES,
      categoryId: 2,
      viewMode: "list",
      placeholder: "Search items…",
    });
    expect(screen.getByDisplayValue("phone")).toBeTruthy();
    expect(screen.getByText("Vehicles")).toBeTruthy();
  });

  it("renders without crashing when categories is undefined", () => {
    renderBar({ categories: undefined });
    expect(screen.getByPlaceholderText("common.search")).toBeTruthy();
  });

  it("renders without crashing when categories is empty", () => {
    renderBar({ categories: [] });
    expect(screen.getByPlaceholderText("common.search")).toBeTruthy();
  });

  it("renders without crashing in list viewMode", () => {
    renderBar({ viewMode: "list" });
    expect(
      screen.getByRole("button", { name: "browse.viewList" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("renders without crashing in grid viewMode", () => {
    renderBar({ viewMode: "grid" });
    expect(
      screen.getByRole("button", { name: "browse.viewGrid" }).props.accessibilityState?.selected
    ).toBe(true);
  });
});
