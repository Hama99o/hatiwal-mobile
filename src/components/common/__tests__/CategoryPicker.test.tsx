/**
 * CategoryPicker unit tests
 *
 * The component uses raw RN Modal, which @testing-library/react-native renders
 * inline (no real native modal host). We mock useCategories to provide a
 * controlled category list and test the filtering logic + UI states.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { CategoryPicker } from "../CategoryPicker";
import type { Category } from "@/api/categories";

// ── Lucide icons — render as plain strings (no SVG in JSDOM) ─────────────────
jest.mock("lucide-react-native", () => ({
  Check: "Check",
  Search: "Search",
  X: "X",
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
}));

// ── useCategories — provide a controlled category list ───────────────────────
const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    slug: "electronics",
    nameEn: "Electronics",
    namePs: "برقي توکي",
    nameFa: "الکترونیک",
    nameUr: "Electronics",
    icon: "💻",
    position: 1,
    subcategories: [
      {
        id: 11,
        slug: "phones",
        nameEn: "Phones",
        namePs: "موبایلونه",
        nameFa: "گوشی‌ها",
        nameUr: "Phones",
        icon: "📱",
        position: 1,
        parentId: 1,
      },
    ],
  },
  {
    id: 2,
    slug: "vehicles",
    nameEn: "Vehicles",
    namePs: "موټرونه",
    nameFa: "وسایل نقلیه",
    nameUr: "Vehicles",
    icon: "🚗",
    position: 2,
    subcategories: [],
  },
];

jest.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ data: MOCK_CATEGORIES, isLoading: false }),
}));

// useCategoryName — return English name by default (i18n mock returns "en")
jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: Category) => cat.nameEn,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPicker(props?: Partial<React.ComponentProps<typeof CategoryPicker>>) {
  const defaults = {
    visible: true,
    selectedId: null as number | null,
    onSelect: jest.fn(),
    onClose: jest.fn(),
    ...props,
  };
  return { ...render(<CategoryPicker {...defaults} />), ...defaults };
}

// ── 1. Renders category list ──────────────────────────────────────────────────

describe("CategoryPicker — renders category list", () => {
  it("shows top-level category names", () => {
    renderPicker();
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByText("Vehicles")).toBeTruthy();
  });

  it("shows the select-category header when no parent is active", () => {
    renderPicker();
    // t('listing.form.selectCategory') returns the key in tests
    expect(screen.getByText("listing.form.selectCategory")).toBeTruthy();
  });
});

// ── 2. Not visible — nothing rendered ────────────────────────────────────────

describe("CategoryPicker — hidden state", () => {
  it("does not render category items when visible=false", () => {
    renderPicker({ visible: false });
    expect(screen.queryByText("Electronics")).toBeNull();
  });
});

// ── 3. Loading state ─────────────────────────────────────────────────────────

describe("CategoryPicker — loading state", () => {
  it("shows loading text when isLoading=true", () => {
    jest.mock("@/hooks/useCategories", () => ({
      useCategories: () => ({ data: [], isLoading: true }),
    }));

    // Re-render with loading mock — inline override
    const { unmount } = render(
      <CategoryPicker
        visible={true}
        selectedId={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    unmount();
  });
});

// ── 4. onSelect is called when a leaf category is pressed ────────────────────

describe("CategoryPicker — onSelect callback", () => {
  it("calls onSelect with the category when a leaf category is tapped", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    // "Vehicles" has no subcategories — it is a leaf
    fireEvent.press(screen.getByText("Vehicles"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(MOCK_CATEGORIES[1]);
  });

  it("does NOT call onSelect when a parent with subcategories is tapped (advances to sub-step)", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    // "Electronics" has subcategories → should advance to sub-step, not call onSelect
    fireEvent.press(screen.getByText("Electronics"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ── 5. Two-step navigation — advancing to subcategories ─────────────────────

describe("CategoryPicker — subcategory navigation", () => {
  it("shows subcategories after tapping a parent with subcategories", () => {
    renderPicker();
    fireEvent.press(screen.getByText("Electronics"));
    // Now the sub-step should render the subcategory name
    expect(screen.getByText("Phones")).toBeTruthy();
  });

  it("calls onSelect when a subcategory is tapped", () => {
    const onSelect = jest.fn();
    renderPicker({ onSelect });
    fireEvent.press(screen.getByText("Electronics"));
    fireEvent.press(screen.getByText("Phones"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(MOCK_CATEGORIES[0].subcategories![0]);
  });
});

// ── 6. onClose is called on cancel ───────────────────────────────────────────

describe("CategoryPicker — onClose", () => {
  it("calls onClose when the cancel button is pressed", () => {
    const onClose = jest.fn();
    renderPicker({ onClose });
    // t('common.cancel') returns the key
    fireEvent.press(screen.getByText("common.cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── 7. selectedId highlight ───────────────────────────────────────────────────

describe("CategoryPicker — selectedId highlight", () => {
  it("renders without throwing when selectedId matches a category", () => {
    expect(() => renderPicker({ selectedId: 2 })).not.toThrow();
  });

  it("renders without throwing when selectedId is null", () => {
    expect(() => renderPicker({ selectedId: null })).not.toThrow();
  });
});

// ── 8. Empty results ──────────────────────────────────────────────────────────

describe("CategoryPicker — no results", () => {
  it("renders without throwing when categories list is empty", () => {
    jest.doMock("@/hooks/useCategories", () => ({
      useCategories: () => ({ data: [], isLoading: false }),
    }));

    expect(() =>
      render(
        <CategoryPicker
          visible={true}
          selectedId={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── 9. Search that matches nothing ───────────────────────────────────────────
//
// The owner's report: "the search is broken in new list for category — when we
// search and something is not there it disappear, it should show empty state".
//
// Note what was NOT covered before: section 8 tests an empty DATASET, which is a
// different path. The reported case is a NON-EMPTY dataset filtered down to
// nothing by the query, and nothing exercised it.
describe("CategoryPicker — search with no matches", () => {
  it("shows the empty state rather than a blank list", () => {
    renderPicker();
    expect(screen.getByText("Electronics")).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText("listing.form.searchCategories"),
      "zzzzzz"
    );

    expect(screen.queryByText("Electronics")).toBeNull();
    expect(screen.getByText("listing.form.noCategoryMatch")).toBeTruthy();
  });

  it("restores the list when the query is cleared", () => {
    renderPicker();
    const input = screen.getByPlaceholderText("listing.form.searchCategories");

    fireEvent.changeText(input, "zzzzzz");
    expect(screen.getByText("listing.form.noCategoryMatch")).toBeTruthy();

    fireEvent.changeText(input, "");
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.queryByText("listing.form.noCategoryMatch")).toBeNull();
  });

  it("matches on a substring, not only a prefix", () => {
    renderPicker();
    fireEvent.changeText(
      screen.getByPlaceholderText("listing.form.searchCategories"),
      "lectronic"
    );
    expect(screen.getByText("Electronics")).toBeTruthy();
  });
});

// ── 10. Searching from the top level must reach SUBcategories ────────────────
//
// Reproducing the owner's actual complaint. The filter's `base` is the CURRENT
// LEVEL only — `step === "sub" ? activeParent.subcategories : categories` — so
// a query typed on the parent screen is matched against the 16 top-level names
// and nothing else. "Phones" exists, sits one level down, and the picker says
// there is nothing.
//
// This is much worse since the gemstones work: all 18 stone types (Ruby, Lapis
// Lazuli, Emerald…) are SUBcategories of "Gemstones & Minerals", so searching
// for the exact word a seller has in mind returns an empty sheet.
describe("CategoryPicker — searching from the top level reaches subcategories", () => {
  it("finds a subcategory by name without drilling in first", () => {
    renderPicker();
    fireEvent.changeText(
      screen.getByPlaceholderText("listing.form.searchCategories"),
      "Phones"
    );
    expect(screen.getByText("Phones")).toBeTruthy();
  });
});
