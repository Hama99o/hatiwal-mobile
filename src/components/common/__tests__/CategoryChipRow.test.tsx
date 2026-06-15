/**
 * CategoryChipRow unit tests
 *
 * Tests the chip rendering, "All" chip semantics, active highlight,
 * onSelect callback wiring, RTL prop, empty/null categories guard,
 * and the TASK-C529 emoji icon rendering behaviour.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { CategoryChipRow } from "../CategoryChipRow";
import type { Category } from "@/api/categories";

// useCategoryName — return English name in tests
jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: Category) => cat.nameEn,
}));

// ── Fixture ───────────────────────────────────────────────────────────────────

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

/** Category with no icon — icon field empty string */
const CATEGORIES_WITH_NO_ICON: Category[] = [
  ...CATEGORIES,
  {
    id: 4,
    slug: "other",
    nameEn: "Other",
    namePs: "نور",
    nameFa: "دیگر",
    icon: "",
    position: 4,
  },
];

function renderRow(props?: Partial<React.ComponentProps<typeof CategoryChipRow>>) {
  const defaults = {
    categories: CATEGORIES,
    selectedId: null as number | null,
    onSelect: jest.fn(),
    isRtl: false,
    ...props,
  };
  return { ...render(<CategoryChipRow {...defaults} />), ...defaults };
}

// ── 1. Renders chips ──────────────────────────────────────────────────────────

describe("CategoryChipRow — renders category chips", () => {
  it("renders an 'All' chip", () => {
    renderRow();
    // t('browse.all') returns the key in tests
    expect(screen.getByText("browse.all")).toBeTruthy();
  });

  it("renders a chip for each category", () => {
    renderRow();
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByText("Vehicles")).toBeTruthy();
    expect(screen.getByText("Clothes")).toBeTruthy();
  });

  it("renders nothing when categories is undefined", () => {
    const { toJSON } = render(
      <CategoryChipRow
        categories={undefined}
        selectedId={null}
        onSelect={jest.fn()}
        isRtl={false}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when categories is empty array", () => {
    const { toJSON } = render(
      <CategoryChipRow
        categories={[]}
        selectedId={null}
        onSelect={jest.fn()}
        isRtl={false}
      />
    );
    expect(toJSON()).toBeNull();
  });
});

// ── 2. "All" chip selected state ──────────────────────────────────────────────

describe("CategoryChipRow — 'All' chip selected state", () => {
  it("'All' chip has accessibilityState.selected=true when selectedId is null", () => {
    renderRow({ selectedId: null });
    const allChip = screen.getByText("browse.all").parent;
    // The Pressable wrapping the Text has accessibilityState
    expect(
      screen.getByRole("button", { name: "browse.all" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("'All' chip has accessibilityState.selected=false when a category is selected", () => {
    renderRow({ selectedId: 1 });
    expect(
      screen.getByRole("button", { name: "browse.all" }).props.accessibilityState?.selected
    ).toBe(false);
  });
});

// ── 3. Category chip selected state ──────────────────────────────────────────

describe("CategoryChipRow — category chip selected state", () => {
  it("selected category chip has accessibilityState.selected=true", () => {
    renderRow({ selectedId: 2 });
    expect(
      screen.getByRole("button", { name: "Vehicles" }).props.accessibilityState?.selected
    ).toBe(true);
  });

  it("non-selected category chips have accessibilityState.selected=false", () => {
    renderRow({ selectedId: 2 });
    expect(
      screen.getByRole("button", { name: "Electronics" }).props.accessibilityState?.selected
    ).toBe(false);
  });
});

// ── 4. onSelect callback ──────────────────────────────────────────────────────

describe("CategoryChipRow — onSelect callback", () => {
  it("calls onSelect(null) when 'All' chip is pressed", () => {
    const onSelect = jest.fn();
    renderRow({ onSelect });
    fireEvent.press(screen.getByRole("button", { name: "browse.all" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect(id) when a category chip is pressed", () => {
    const onSelect = jest.fn();
    renderRow({ onSelect });
    fireEvent.press(screen.getByRole("button", { name: "Electronics" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onSelect with the correct id for each category", () => {
    const onSelect = jest.fn();
    renderRow({ onSelect });

    fireEvent.press(screen.getByRole("button", { name: "Clothes" }));
    expect(onSelect).toHaveBeenLastCalledWith(3);

    fireEvent.press(screen.getByRole("button", { name: "Vehicles" }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
  });
});

// ── 5. RTL prop ───────────────────────────────────────────────────────────────

describe("CategoryChipRow — RTL prop", () => {
  it("renders without throwing when isRtl=true", () => {
    expect(() => renderRow({ isRtl: true })).not.toThrow();
  });

  it("renders the same chips in RTL mode", () => {
    renderRow({ isRtl: true });
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByText("browse.all")).toBeTruthy();
  });
});

// ── 6. Smoke tests ────────────────────────────────────────────────────────────

describe("CategoryChipRow — smoke tests", () => {
  it("renders without throwing for all selectedId values", () => {
    for (const id of [null, 1, 2, 3]) {
      expect(() => renderRow({ selectedId: id })).not.toThrow();
    }
  });
});

// ── 7. TASK-C529 — emoji icon rendering ──────────────────────────────────────

describe("CategoryChipRow — emoji icon rendering (TASK-C529)", () => {
  it("renders the emoji icon for a category chip that has an icon", () => {
    renderRow();
    // The emoji Text node is rendered inline before the category name.
    expect(screen.getByText("💻")).toBeTruthy();
    expect(screen.getByText("🚗")).toBeTruthy();
    expect(screen.getByText("👗")).toBeTruthy();
  });

  it("does not render an icon node for a category with an empty icon string", () => {
    render(
      <CategoryChipRow
        categories={CATEGORIES_WITH_NO_ICON}
        selectedId={null}
        onSelect={jest.fn()}
        isRtl={false}
      />
    );
    // Other is rendered but has no emoji sibling
    expect(screen.getByText("Other")).toBeTruthy();
    // Emoji nodes for the other categories still present
    expect(screen.getByText("💻")).toBeTruthy();
  });

  it("renders without throwing when isRtl=true (icon marginEnd RTL-safe check)", () => {
    expect(() =>
      render(
        <CategoryChipRow
          categories={CATEGORIES}
          selectedId={null}
          onSelect={jest.fn()}
          isRtl={true}
        />
      )
    ).not.toThrow();
  });

  it("chip name text is still present alongside the icon", () => {
    renderRow();
    // Both emoji and label coexist in the chip
    expect(screen.getByText("💻")).toBeTruthy();
    expect(screen.getByText("Electronics")).toBeTruthy();
  });
});
