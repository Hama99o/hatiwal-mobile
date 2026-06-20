/**
 * SavedSearchItem unit tests
 *
 * Verifies the filter-summary composition logic and the two independent
 * press callbacks.  All color/i18n/localization hooks are mocked globally
 * in src/__tests__/setup.ts, so t(key) returns the key and useColors()
 * returns a fixed token map.
 *
 * Summary composition rules (from the component):
 *   1. locationBased=true && radius     → t("browse.withinRadius", { km: radius })
 *   2. else if location                 → location string
 *   3. categoryName                     → appended
 *   4. priceMin || priceMax             → "min-max" range appended
 *   Parts are joined with " • ".
 *   Empty parts array                   → t("browse.savedSearch") fallback
 */

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

// Mutable categories data so we can verify the saved search localizes via its
// stored categoryId relation when the category is loaded, and falls back to the
// English categoryName snapshot otherwise. Default: not loaded (fallback path).
let mockCategoriesData: unknown = undefined;
jest.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ data: mockCategoriesData }),
}));

import { SavedSearchItem } from "../SavedSearchItem";
import type { SavedSearch } from "@/api/saved-searches";

beforeEach(() => {
  mockCategoriesData = undefined;
});

// ── Fixture factory ───────────────────────────────────────────────────────────

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
};

function makeSearch(overrides: Partial<SavedSearch> = {}): SavedSearch {
  return { ...BASE_SEARCH, ...overrides };
}

function renderItem(
  search: SavedSearch,
  onPress = jest.fn(),
  onDelete = jest.fn()
) {
  return render(
    <SavedSearchItem search={search} onPress={onPress} onDelete={onDelete} />
  );
}

// ── 1. Fallback when no filter fields are set ─────────────────────────────────

describe("SavedSearchItem — empty-summary fallback", () => {
  it("shows browse.savedSearch when no filter fields are set", () => {
    renderItem(makeSearch());
    expect(screen.getByText("browse.savedSearch")).toBeTruthy();
  });

  it("shows browse.savedSearch when location is empty string and no other fields", () => {
    renderItem(makeSearch({ location: "" }));
    expect(screen.getByText("browse.savedSearch")).toBeTruthy();
  });

  it("shows browse.savedSearch when locationBased=true but radius is null", () => {
    // radius falsy — the locationBased branch is skipped; no location string either
    renderItem(makeSearch({ locationBased: true, radius: null }));
    expect(screen.getByText("browse.savedSearch")).toBeTruthy();
  });
});

// ── 2. Radius-based location summary ─────────────────────────────────────────

describe("SavedSearchItem — radius search summary", () => {
  it("shows browse.withinRadius when locationBased=true and radius is set", () => {
    renderItem(
      makeSearch({ locationBased: true, radius: 10, latitude: 34.5, longitude: 69.2 })
    );
    // t("browse.withinRadius", { km: 10 }) returns the key in tests
    expect(screen.getByText("browse.withinRadius")).toBeTruthy();
  });

  it("uses withinRadius for any non-zero radius value", () => {
    renderItem(
      makeSearch({ locationBased: true, radius: 50, latitude: 34.5, longitude: 69.2 })
    );
    expect(screen.getByText("browse.withinRadius")).toBeTruthy();
  });

  it("does NOT show the raw location string when locationBased+radius is set", () => {
    renderItem(
      makeSearch({
        locationBased: true,
        radius: 10,
        location: "Kabul",
        latitude: 34.5,
        longitude: 69.2,
      })
    );
    // withinRadius branch takes priority; raw "Kabul" should not appear in summary
    expect(screen.queryByText("Kabul")).toBeNull();
    expect(screen.getByText("browse.withinRadius")).toBeTruthy();
  });
});

// ── 3. Text-based location summary ───────────────────────────────────────────

describe("SavedSearchItem — text location summary", () => {
  it("shows the location string when locationBased=false and location is set", () => {
    renderItem(makeSearch({ location: "Kabul, Share Naw" }));
    expect(screen.getByText("Kabul, Share Naw")).toBeTruthy();
  });

  it("shows the location string when locationBased=true but radius is null", () => {
    // radius falsy → withinRadius branch is skipped, falls through to location
    renderItem(
      makeSearch({ locationBased: true, radius: null, location: "Mazar" })
    );
    expect(screen.getByText("Mazar")).toBeTruthy();
  });
});

// ── 4. Category in summary ────────────────────────────────────────────────────

describe("SavedSearchItem — category in summary", () => {
  it("includes categoryName (English snapshot) when categories aren't loaded", () => {
    renderItem(makeSearch({ categoryName: "Electronics" }));
    expect(screen.getByText("Electronics")).toBeTruthy();
  });

  it("localizes the category via the stored categoryId relation when loaded", () => {
    // Live category (id 5) with a fresh name; the saved search carries a stale
    // English snapshot. The chip must use the resolved category (the relation),
    // which useCategoryName renders in the active language (en → nameEn here).
    mockCategoriesData = [
      { id: 5, slug: "electronics", icon: "📱", position: 1, nameEn: "Electronics", namePs: "برقي", nameFa: "برقی", subcategories: [] },
    ];
    renderItem(makeSearch({ categoryId: 5, categoryName: "STALE SNAPSHOT" }));
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.queryByText("STALE SNAPSHOT")).toBeNull();
  });

  it("resolves a subcategory id nested under a top-level category", () => {
    mockCategoriesData = [
      {
        id: 1, slug: "electronics", icon: "📱", position: 1, nameEn: "Electronics", namePs: "", nameFa: "",
        subcategories: [{ id: 9, slug: "phones", icon: "📱", position: 1, nameEn: "Phones", namePs: "", nameFa: "" }],
      },
    ];
    renderItem(makeSearch({ categoryId: 9, categoryName: "ignored" }));
    expect(screen.getByText("Phones")).toBeTruthy();
  });

  it("combines location and category with bullet separator", () => {
    renderItem(makeSearch({ location: "Kabul", categoryName: "Vehicles" }));
    expect(screen.getByText("Kabul • Vehicles")).toBeTruthy();
  });

  it("combines radius and category with bullet separator", () => {
    renderItem(
      makeSearch({
        locationBased: true,
        radius: 10,
        latitude: 34.5,
        longitude: 69.2,
        categoryName: "Electronics",
      })
    );
    expect(screen.getByText("browse.withinRadius • Electronics")).toBeTruthy();
  });
});

// ── 5. Price range in summary ─────────────────────────────────────────────────

describe("SavedSearchItem — price range in summary", () => {
  it("shows min-max range when both priceMin and priceMax are set", () => {
    renderItem(makeSearch({ priceMin: 1000, priceMax: 5000 }));
    expect(screen.getByText("1000-5000")).toBeTruthy();
  });

  it("uses '0' as the min when only priceMax is set", () => {
    renderItem(makeSearch({ priceMax: 5000 }));
    expect(screen.getByText("0-5000")).toBeTruthy();
  });

  it("uses '∞' as the max when only priceMin is set", () => {
    renderItem(makeSearch({ priceMin: 2000 }));
    expect(screen.getByText("2000-∞")).toBeTruthy();
  });

  it("combines location, category, and price with bullet separators", () => {
    renderItem(
      makeSearch({
        location: "Kabul",
        categoryName: "Clothes",
        priceMin: 500,
        priceMax: 3000,
      })
    );
    expect(screen.getByText("Kabul • Clothes • 500-3000")).toBeTruthy();
  });

  it("does not add price range when both priceMin and priceMax are null", () => {
    renderItem(makeSearch({ location: "Kabul", priceMin: null, priceMax: null }));
    // Summary is just "Kabul", no bullet
    expect(screen.getByText("Kabul")).toBeTruthy();
  });
});

// ── 6. Full summary combinations ─────────────────────────────────────────────

describe("SavedSearchItem — full summary combinations", () => {
  it("builds a full radius + category + price summary", () => {
    renderItem(
      makeSearch({
        locationBased: true,
        radius: 25,
        latitude: 34.5,
        longitude: 69.2,
        categoryName: "Vehicles",
        priceMin: 10000,
        priceMax: 50000,
      })
    );
    expect(
      screen.getByText("browse.withinRadius • Vehicles • 10000-50000")
    ).toBeTruthy();
  });

  it("builds a location + price summary (no category)", () => {
    renderItem(
      makeSearch({ location: "Herat", priceMin: null, priceMax: 20000 })
    );
    expect(screen.getByText("Herat • 0-20000")).toBeTruthy();
  });
});

// ── 7. onPress callback ───────────────────────────────────────────────────────
//
// In the test renderer TouchableOpacity compiles down to a View with
// accessible=true. We access the two tap targets via UNSAFE_getAllByType(View):
//   index 0 → outer row TouchableOpacity  (onPress)
//   index 1 → inner delete TouchableOpacity (onDelete)

describe("SavedSearchItem — onPress callback", () => {
  it("fires onPress when the item row is pressed", () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    const { UNSAFE_getAllByType } = renderItem(
      makeSearch({ location: "Kabul" }),
      onPress,
      onDelete
    );

    const [rowTap] = UNSAFE_getAllByType(View);
    fireEvent.press(rowTap);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("onPress is independent of onDelete — multiple presses accumulate only on onPress", () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    const { UNSAFE_getAllByType } = renderItem(
      makeSearch({ location: "Kabul" }),
      onPress,
      onDelete
    );

    const [rowTap] = UNSAFE_getAllByType(View);
    fireEvent.press(rowTap);
    fireEvent.press(rowTap);

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenCalledTimes(0);
  });
});

// ── 8. onDelete callback ──────────────────────────────────────────────────────

describe("SavedSearchItem — onDelete callback", () => {
  it("fires onDelete when the X icon button is pressed", () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    const { UNSAFE_getAllByType } = renderItem(
      makeSearch({ location: "Kabul" }),
      onPress,
      onDelete
    );

    // index 1 is the inner delete TouchableOpacity
    const [, deleteTap] = UNSAFE_getAllByType(View);
    fireEvent.press(deleteTap);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("onDelete is independent of onPress — multiple deletes don't trigger onPress", () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    const { UNSAFE_getAllByType } = renderItem(
      makeSearch({ location: "Kabul" }),
      onPress,
      onDelete
    );

    const [, deleteTap] = UNSAFE_getAllByType(View);
    fireEvent.press(deleteTap);
    fireEvent.press(deleteTap);

    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onPress).toHaveBeenCalledTimes(0);
  });
});

// ── 9. Smoke tests ────────────────────────────────────────────────────────────

describe("SavedSearchItem — smoke tests", () => {
  it("renders without throwing with all fields populated", () => {
    expect(() =>
      renderItem(
        makeSearch({
          locationBased: true,
          radius: 10,
          latitude: 34.5,
          longitude: 69.2,
          categoryName: "Electronics",
          priceMin: 1000,
          priceMax: 9999,
        })
      )
    ).not.toThrow();
  });

  it("renders without throwing with a bare search (all nulls)", () => {
    expect(() => renderItem(makeSearch())).not.toThrow();
  });
});
