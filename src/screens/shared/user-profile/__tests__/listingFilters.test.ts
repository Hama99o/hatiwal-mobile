import {
  shouldShowListingFilters,
  FILTERS_MIN_LISTINGS,
} from "../listingFilters";

describe("shouldShowListingFilters", () => {
  it("hides the filters for a seller with one listing — the case that broke", () => {
    expect(shouldShowListingFilters("active", 1)).toBe(false);
  });

  it("hides them for an empty profile", () => {
    expect(shouldShowListingFilters("active", 0)).toBe(false);
  });

  it("shows them once there is enough inventory to filter", () => {
    expect(shouldShowListingFilters("active", FILTERS_MIN_LISTINGS)).toBe(true);
    expect(shouldShowListingFilters("active", FILTERS_MIN_LISTINGS + 20)).toBe(true);
  });

  it("is exclusive at the boundary, so the threshold means what it says", () => {
    expect(shouldShowListingFilters("active", FILTERS_MIN_LISTINGS - 1)).toBe(false);
  });

  it("never shows them on the Sold tab, however much was sold", () => {
    expect(shouldShowListingFilters("sold", 99)).toBe(false);
  });

  it("treats a missing count as zero rather than throwing", () => {
    // The profile payload may omit listingsCount; a crash on the trust path
    // would be far worse than hiding a search box.
    expect(shouldShowListingFilters("active", undefined)).toBe(false);
    expect(shouldShowListingFilters("active", null)).toBe(false);
  });
});
