/**
 * recoveryBand — price-band maths for the sold/reserved recovery CTA
 * (`ListingUnavailableActions`, TASK-N317).
 *
 * Deliberately a PURE module — no React, no i18n, no imports at all — so the
 * rules below are exercised directly from `__tests__/recoveryBand.test.ts`
 * without mounting a component. Mirrors the web's
 * `hatiwal-web/src/components/listing/recovery-band.ts` function-for-function;
 * the only difference is the return shape (`PriceBand | null` here instead of
 * the web's `{ min: "", max: "" }` URL-string sentinel — the mobile CTA hands
 * its band straight to `router.push({ params })`, which wants real values or
 * nothing at all, not empty strings).
 */

/** The band is ±30% of the dead listing's price. */
export const BAND_SPREAD = 0.3;

/**
 * The ONE currency whose numbers may be handed to the Bazaar's (Browse's)
 * price filter.
 *
 * Rails filters on the raw `price` column — `price_at_least` / `price_at_most`
 * in `listings_controller#index` — with no currency scoping whatsoever, and the
 * feed is overwhelmingly AFN. A band derived from a USD or EUR price would
 * therefore filter AFN stock by dollar numbers: "see similar" on a $900 laptop
 * would ask for AFN 630–1,170 and land the buyer on a page of junk (or on
 * nothing at all). There is no `currency` param to scope the query with, and
 * inventing one is a shared-contract change this card explicitly rules out — so
 * a non-AFN listing simply gets a category-only CTA, which is always truthful.
 */
export const BANDABLE_CURRENCY = "AFN";

export interface PriceBand {
  min: number;
  max: number;
}

/**
 * ±30% price band around a listing price.
 *
 * Returns `null` (→ no band at all) when:
 *  - the price is missing, zero, negative or non-finite — a free/priceless
 *    item must not send a bogus band; or
 *  - the currency isn't AFN (see {@link BANDABLE_CURRENCY}) — Browse's price
 *    filter is currency-blind, so the numbers would mean nothing.
 *
 * `min` is floored at 0 and, for any positive price, is always ≤ `max`.
 */
export function priceBand(
  price: number | null | undefined,
  currency: string | null | undefined
): PriceBand | null {
  if (String(currency ?? "").toUpperCase() !== BANDABLE_CURRENCY) return null;

  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return null;

  const min = Math.max(0, Math.round(p * (1 - BAND_SPREAD)));
  const max = Math.round(p * (1 + BAND_SPREAD));
  // Belt-and-braces: never emit an inverted range (unreachable for p > 0, but
  // a silently empty result set is worse than simply dropping the band).
  if (min > max) return null;

  return { min, max };
}

/**
 * The band to actually put on the CTA: {@link priceBand}, but only when it can
 * be SHOWN to contain live stock.
 *
 * `similarPrices` are the prices of the active listings the CTA's category
 * already has (the same `GET /listings/:id/similar` set the rail above
 * renders — Rails `Listing.similar_to`, i.e. browsable stock in this category
 * and its children). If none of them fall inside the band, the band would
 * send the buyer to an EMPTY Browse feed — the exact dead end this whole card
 * exists to remove — so it is dropped and the CTA falls back to the category
 * alone, which those very listings prove is non-empty.
 */
export function recoveryBand(
  price: number | null | undefined,
  currency: string | null | undefined,
  similarPrices: ReadonlyArray<number | null | undefined>
): PriceBand | null {
  const band = priceBand(price, currency);
  if (!band) return null;

  const inBand = similarPrices.some((sp) => {
    const n = Number(sp);
    return Number.isFinite(n) && n >= band.min && n <= band.max;
  });
  return inBand ? band : null;
}
