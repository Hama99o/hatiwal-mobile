/**
 * Multi-quantity stock rules — docs/SPIKE_LISTING_QUANTITY.md, Tier 1.
 *
 * One place, because the same three questions get asked on the listing detail
 * screen, the seller's own detail screen, and (next) the web client: is there a
 * count worth showing, how many are actually LEFT, and is it running out?
 * Duplicating the thresholds is how mobile ends up calling 3-of-15 "low" while
 * web calls it fine, on the same listing, on the same day.
 */

/** What the backend sends on every listing view (ListingSerializer base fields). */
export interface StockFields {
  quantity?: number | null;
  availableUnits?: number | null;
  multiUnit?: boolean | null;
}

/**
 * What is LEFT — never the original count. Showing 15 when 13 are gone is the
 * stale-number failure that damages trust more than showing nothing at all: a
 * buyer travels across Kabul for a bag that sold on Tuesday.
 *
 * Falls back to `quantity` for a payload that predates `available_units`, and to
 * 1 for one that predates the columns entirely — an older listing is a
 * single-item listing.
 */
export function availableUnitsOf(listing: StockFields | null | undefined): number {
  if (!listing) return 0;
  const available = listing.availableUnits ?? listing.quantity ?? 1;
  return Math.max(0, available);
}

/** The seller's original count, for the "3 of 15 left" phrasing. */
export function totalUnitsOf(listing: StockFields | null | undefined): number {
  if (!listing) return 0;
  return Math.max(0, listing.quantity ?? 1);
}

/**
 * Whether ANY stock UI belongs on screen.
 *
 * The spike's governing rule: a single-item listing must be byte-identical to
 * what it was before this feature existed. So this is deliberately strict — the
 * server's own `multi_unit` flag decides, not a client-side `quantity > 1`
 * guess, so all three clients agree with the API on the same listing.
 */
export function hasStockToShow(listing: StockFields | null | undefined): boolean {
  return listing?.multiUnit === true;
}

/**
 * Running out — the amber treatment.
 *
 * Two rules OR'd, mirroring ExpiryBadge's absolute-plus-proportional pair rather
 * than inventing a threshold: "2 left" is urgent whether the batch was 3 or 300,
 * and a fifth of the batch is urgent whatever the absolute number.
 *
 * Sold out (0 left) is NOT low stock: the listing has moved to `sold` by then and
 * the status banner says so far more clearly than an amber count would.
 */
export function isLowStock(availableUnits: number, totalUnits: number): boolean {
  if (totalUnits <= 1) return false;
  if (availableUnits <= 0) return false;
  return availableUnits <= 2 || availableUnits / totalUnits <= 0.2;
}
