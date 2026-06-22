/**
 * browseFilters — pure utility for Browse filter state.
 *
 * Extracted here so it can be unit-tested independently of the React component.
 */

import type { ListingCondition, ListingSort } from "@/api/listings";
import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";

export interface BrowseFilterState {
  /** Debounced search term (already settled — not the raw input). */
  debouncedSearch: string;
  categoryId: number | null;
  condition: ListingCondition | null;
  priceMin: string;
  priceMax: string;
  /** Non-null when the buyer has pinned a map location. */
  coordinates: MapCanvasCoords | null;
  sellerActiveDays: number | null;
  /** null means the server default (newest-first) — NOT counted as an active filter. */
  sort: ListingSort | null;
}

/**
 * Returns the total number of active (non-default) filters/sorts.
 *
 * Rules:
 * - `sort === null` is the default (newest-first) → NOT counted.
 * - `subcategoryLabel` is always paired with `categoryId` → counted via `categoryId`.
 * - `coordinates !== null` implies the location range filter is active (counts as 1).
 */
export function computeActiveFilterCount(state: BrowseFilterState): number {
  return (
    (state.debouncedSearch ? 1 : 0) +
    (state.categoryId !== null ? 1 : 0) +
    (state.condition ? 1 : 0) +
    (state.priceMin ? 1 : 0) +
    (state.priceMax ? 1 : 0) +
    (state.coordinates !== null ? 1 : 0) +
    (state.sellerActiveDays !== null ? 1 : 0) +
    (state.sort !== null ? 1 : 0)
  );
}

/** The default (all-cleared) Browse filter state. */
export const DEFAULT_BROWSE_FILTER_STATE: BrowseFilterState = {
  debouncedSearch: "",
  categoryId: null,
  condition: null,
  priceMin: "",
  priceMax: "",
  coordinates: null,
  sellerActiveDays: null,
  sort: null,
};
