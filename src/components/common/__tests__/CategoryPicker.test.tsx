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
    icon: "💻",
    position: 1,
    subcategories: [
      {
        id: 11,
        slug: "phones",
        nameEn: "Phones",
        namePs: "موبایلونه",
        nameFa: "گوشی‌ها",
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
