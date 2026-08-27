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
  /**
   * SF-B2 (docs/SELL_FLOW_REDESIGN.md §6) — units currently held for a buyer
   * on an OPEN reservation, public-safe (no buyer identity — that stays on
   * the owner-only `sale`/`current_sale` field). Present on every serializer
   * view (`:list`/`:detailed`/`:seller_list`/`:owner_detailed` alike), 0 when
   * there is no open hold. Advisory only — never subtracted from
   * `availableUnits` (§3.6): a held unit is still counted as available to
   * every OTHER buyer until the seller actually marks it sold.
   */
  heldUnits?: number | null;
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
 * Whether any units have actually sold yet.
 *
 * Drives the seller's phrasing: "15 of 15 left" is literally true on a listing
 * nobody has bought from, but it reads as noise — there is no progress to show
 * and the second number just repeats the first. Seen on-device during QA
 * (qa/reports/run-017) and fixed there: the owner gets the plain "15 in stock"
 * until the first sale, and "12 of 15 left" once the count means something.
 */
export function hasSoldSome(listing: StockFields | null | undefined): boolean {
  if (!listing) return false;
  return availableUnitsOf(listing) < totalUnitsOf(listing);
}

/**
 * How many units are currently held for a specific buyer (SF-M4,
 * docs/SELL_FLOW_REDESIGN.md §4.2.2/§4.5). Never leaks who they are held
 * for — that identity, when the caller is allowed to see it, comes from the
 * separate owner-only `sale`/`current_sale` field, not from here.
 *
 * Callers MUST gate any UI on `hasStockToShow(listing)` first, exactly like
 * every other stock control in this file — a single-item listing's held
 * count (0 or 1, never shown as a count) is carried entirely by
 * `StatusBadge`/`ListingStatusBanner`'s existing "Reserved" treatment, not by
 * this pill.
 */
export function heldUnitsOf(listing: StockFields | null | undefined): number {
  if (!listing) return 0;
  return Math.max(0, listing.heldUnits ?? 0);
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
