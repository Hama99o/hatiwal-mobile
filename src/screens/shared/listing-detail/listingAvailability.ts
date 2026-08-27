/**
 * listingAvailability — SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.2.1).
 *
 * `ListingDetail.tsx` is a large, deeply-coupled screen (gallery, gesture
 * handler / reanimated scroll animations, React Query, multiple sheets) —
 * exactly the kind of file `threadAvailability.ts`'s own docstring already
 * flagged as unmountable for pure logic tests. Rather than let the three
 * "is this listing reachable / contactable / a dead end" predicates live
 * inline (and be exercised only by an eventual, expensive full-screen
 * render), they are hoisted here — mirrors the existing
 * `threadAvailability.ts` / `recoveryBand.ts` split so the guard that ships
 * is the SAME one the tests exercise, not a hand-copied duplicate that can
 * quietly drift.
 *
 * The behaviour change this module encodes: a `reserved` listing is no
 * longer a dead end. It is "still for sale, someone is first in line" —
 * contactable exactly like `active`, with only "Make an Offer" paused (a
 * NEW price negotiation from a different buyer while a specific buyer's
 * hold is already in progress doesn't make sense — §3.2's explicit,
 * deliberate judgment call). Only `sold` (and any other non-live status —
 * draft, removed) is a genuine dead end with nowhere to go but "similar
 * listings" / "more from this seller".
 */

export interface ListingAvailabilityFields {
  status?: string | null;
}

/**
 * The sticky action bar's Message/Offer row vs. the recovery block.
 * `false` for the listing's own owner regardless of status — that branch is
 * the separate "your own listing" notice, never this one.
 */
export function canContactListing(params: {
  listing: ListingAvailabilityFields | null | undefined;
  isOwnListing: boolean;
}): boolean {
  const { listing, isOwnListing } = params;
  if (!listing || isOwnListing) return false;
  return listing.status === "active" || listing.status === "reserved";
}

/**
 * "Make an Offer" needs its OWN explicit gate now that `canContactListing`
 * includes `reserved` — before this ticket it only ever rendered because
 * `canContactListing` hid the entire block for anything non-active, so
 * widening that alone would have silently un-hidden offers on a reserved
 * listing. Offers stay paused on a reserved listing even though messaging
 * itself no longer is (§3.2).
 *
 * `sold` is excluded here too, defensively — in production this function is
 * only ever reached after `canContactListing` has already gated out `sold`
 * (ListingDetail.tsx nests the offer button inside `canContact`'s true
 * branch), but this predicate is meant to stand on its own as "is an offer
 * ever appropriate on this listing", not rely on a caller's outer guard.
 */
export function canOfferOnListing(params: {
  listing: ListingAvailabilityFields | null | undefined;
  isNegotiable: boolean;
}): boolean {
  const { listing, isNegotiable } = params;
  if (!listing || !isNegotiable) return false;
  return listing.status !== "reserved" && listing.status !== "sold";
}

/**
 * The "see similar / more from seller" recovery block — SOLD-ONLY as of
 * SF-M3. A reserved, not-owned listing now falls into `canContactListing`'s
 * true branch instead (the normal Message/Offer row, Offer hidden).
 *
 * A type predicate (not a plain boolean) so `ListingDetail.tsx` can call
 * this directly on `listing.status` and still pass the narrowed `"sold"`
 * literal straight into `ListingUnavailableActions`'s `status` prop without
 * a separate cast.
 */
export function isListingDeadEnd(status: string | null | undefined): status is "sold" {
  return status === "sold";
}
