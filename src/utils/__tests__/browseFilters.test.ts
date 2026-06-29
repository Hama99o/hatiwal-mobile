/**
 * browseFilters unit tests
 *
 * Covers:
 *   - computeActiveFilterCount returns 0 when all defaults
 *   - Each individual filter increments the count by 1
 *   - Default sort (null = newest-first) is NOT counted
 *   - Non-default sort IS counted
 *   - Combinations (category + priceMin → 2; full set → 8)
 *   - DEFAULT_BROWSE_FILTER_STATE has count 0
 */

import {
  computeActiveFilterCount,
  DEFAULT_BROWSE_FILTER_STATE,
  type BrowseFilterState,
} from "../browseFilters";

const defaults: BrowseFilterState = { ...DEFAULT_BROWSE_FILTER_STATE };

describe("computeActiveFilterCount", () => {
  it("returns 0 when all filters are at their defaults", () => {
    expect(computeActiveFilterCount(defaults)).toBe(0);
  });

  it("returns 0 for DEFAULT_BROWSE_FILTER_STATE", () => {
    expect(computeActiveFilterCount(DEFAULT_BROWSE_FILTER_STATE)).toBe(0);
  });

  it("counts a non-empty debouncedSearch as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, debouncedSearch: "laptop" })
    ).toBe(1);
  });

  it("does NOT count an empty debouncedSearch", () => {
    expect(
      computeActiveFilterCount({ ...defaults, debouncedSearch: "" })
    ).toBe(0);
  });

  it("counts a non-null categoryId as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, categoryId: 3 })
    ).toBe(1);
  });

  it("does NOT count null categoryId", () => {
    expect(
      computeActiveFilterCount({ ...defaults, categoryId: null })
    ).toBe(0);
  });

  it("counts a non-null condition as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, condition: "like_new" })
    ).toBe(1);
  });

  it("counts a non-empty priceMin as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, priceMin: "5000" })
    ).toBe(1);
  });

  it("counts a non-empty priceMax as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, priceMax: "50000" })
    ).toBe(1);
  });

  it("counts non-null coordinates (location range) as 1", () => {
    expect(
      computeActiveFilterCount({
        ...defaults,
        coordinates: { latitude: 34.52, longitude: 69.18 },
      })
    ).toBe(1);
  });

  it("counts non-null sellerActiveDays as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, sellerActiveDays: 7 })
    ).toBe(1);
  });

  it("does NOT count null sort (default newest-first)", () => {
    expect(
      computeActiveFilterCount({ ...defaults, sort: null })
    ).toBe(0);
  });

  it("counts a non-null sort as 1", () => {
    expect(
      computeActiveFilterCount({ ...defaults, sort: "price_asc" })
    ).toBe(1);
  });

  it("counts each non-default sort variant as 1", () => {
    const sorts = ["oldest", "price_asc", "price_desc", "most_viewed", "nearest"] as const;
    sorts.forEach((s) => {
      expect(
        computeActiveFilterCount({ ...defaults, sort: s })
      ).toBe(1);
    });
  });

  it("category + priceMin active → count is 2", () => {
    expect(
      computeActiveFilterCount({ ...defaults, categoryId: 2, priceMin: "10000" })
    ).toBe(2);
  });

  it("category + priceMin + priceMax active → count is 3", () => {
    expect(
      computeActiveFilterCount({
        ...defaults,
        categoryId: 1,
        priceMin: "1000",
        priceMax: "99000",
      })
    ).toBe(3);
  });

  it("all eight filters active → count is 8", () => {
    const allActive: BrowseFilterState = {
      debouncedSearch: "test",
      categoryId: 5,
      condition: "good",
      priceMin: "100",
      priceMax: "9000",
      coordinates: { latitude: 34.0, longitude: 70.0 },
      sellerActiveDays: 7,
      sort: "most_viewed",
    };
    expect(computeActiveFilterCount(allActive)).toBe(8);
  });

  it("subcategoryLabel paired with categoryId → only categoryId counted (no double-count)", () => {
    // subcategoryLabel itself is not in BrowseFilterState — it's always paired
    // with categoryId. Confirm that setting categoryId counts as exactly 1.
    expect(
      computeActiveFilterCount({ ...defaults, categoryId: 12 })
    ).toBe(1);
  });
});
