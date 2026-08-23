/**
 * Should the seller-profile listings section show its search + category filters?
 *
 * A seller with ONE active listing was given a search box, a scrolling category
 * chip row and a grid/list toggle. On a 1080x2400 phone that bar pushed their only
 * listing off the bottom of the screen: a buyer arriving on the trust path saw
 * stats, bio, the whole Ratings & Reviews block, the Active/Sold tabs, a search
 * field and category chips before seeing a single thing the seller had for sale.
 *
 * The rule lives here, as a pure function, because it is the kind of threshold
 * that gets argued about and adjusted — and because UserProfile has no unit tests
 * of its own, so a conditional buried in its JSX would ship unverified.
 */

/**
 * Below this many active listings everything fits in a screen or two, so
 * filtering is noise. A designer may reasonably raise it; lowering it below 2
 * would mean offering search for a single item again.
 */
export const FILTERS_MIN_LISTINGS = 5;

export function shouldShowListingFilters(
  activeTab: "active" | "sold",
  listingsCount: number | null | undefined
): boolean {
  // Sold has never had filters — it is a showcase, not an inventory.
  if (activeTab !== "active") return false;
  return (listingsCount ?? 0) >= FILTERS_MIN_LISTINGS;
}
