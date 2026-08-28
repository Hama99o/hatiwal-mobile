/**
 * SF-M7 — mobile half of SF-B6 (docs/SELL_FLOW_REDESIGN.md's backend contract
 * for reconciling a listing's status when its quantity is edited).
 *
 * WHY THIS FILE EXISTS. The owner's own report: a seller sold all 15 units of
 * a listing, then edited quantity to 20 expecting to sell the remaining 5 —
 * the listing stayed `sold` (invisible to buyers, unsellable) with nothing on
 * screen explaining why nothing happened. Editing it downward instead (to 10,
 * below the 15 already sold) produced an uncaught `ActiveRecord::
 * CheckViolation` → a bare 500 the app rendered as the generic "server error"
 * string, telling the seller nothing.
 *
 * SF-B6 fixes the data: raising quantity above `soldUnits` on a `sold`
 * listing reopens it (status → active, `sold_at` cleared); lowering it below
 * `soldUnits` is refused with a real 422, `{ errors: [...], code:
 * "quantity_below_sold_units" }`.
 *
 * QA-BUG3 (card 301) — SF-B8's sibling floor. Lowering `quantity` below the
 * units currently HELD for a buyer on an open reservation is refused the same
 * way, `{ errors: [...], code: "quantity_below_held_units" }`, but the
 * client had no mapping for it: a seller doing exactly this got the raw
 * English Rails sentence ("Quantity cannot be less than the 10 units on hold
 * for a buyer...") in a Pashto or Dari UI. `quantityBelowHeldUnitsMessage`
 * below closes that gap the same way `quantityBelowSoldUnitsMessage` already
 * closed it for the sold-units floor. The backend guarantees only ONE of the
 * two codes is ever sent for a given refusal (whichever minimum is higher —
 * see `Listing#hold_sets_quantity_floor?`), so a caller trying both mappers
 * in sequence never has to choose between them.
 *
 * This file supplies the pieces of copy ListingForm.tsx needs around that
 * contract — kept pure and separate from the 1900-line screen so both can be
 * unit-tested without rendering it:
 *   1. `quantityBelowSoldUnitsMessage` / `quantityBelowHeldUnitsMessage` —
 *      turn each known 422 into a localized, actionable sentence instead of
 *      the server's raw English (this app ships Pashto and Dari; showing an
 *      untranslated string is a house rule violation, not a style choice).
 *   2. `willReopenOnSave` — whether the reassuring "this puts it back on
 *      sale" note belongs on screen BEFORE the seller ever taps Save.
 */
import { StockFields, totalUnitsOf, availableUnitsOf } from "@/utils/stock";
import { apiErrorCode } from "@/utils/apiError";

/** The one error code this screen reacts to specially — SF-B6's contract. */
export const QUANTITY_BELOW_SOLD_UNITS_CODE = "quantity_below_sold_units";

/** SF-B8's sibling floor — the units currently on hold for a buyer. */
export const QUANTITY_BELOW_HELD_UNITS_CODE = "quantity_below_held_units";

/**
 * How many units of THIS listing have already sold — `quantity -
 * availableUnits`, computed from `stock.ts`'s own two accessors rather than
 * reading `listing.quantity`/`listing.availableUnits` directly, so a
 * nullish/legacy payload degrades exactly the way every other stock UI in
 * the app already does (never re-derived independently).
 */
export function soldUnitsOf(listing: StockFields | null | undefined): number {
  return Math.max(0, totalUnitsOf(listing) - availableUnitsOf(listing));
}

/**
 * The localized, actionable message for SF-B6's refusal — or null for every
 * OTHER error, so a caller falls back to its existing generic handling
 * (`apiErrorMessage`) completely unchanged. This is what keeps the change
 * additive: nothing about how any other mutation failure is shown moves.
 *
 * `formatCount` is the caller's `useLocalization().formatNumber` — passed in
 * rather than imported so the count renders in the seller's own locale's
 * digits (ps/fa use Eastern Arabic-Indic numerals), never a bare JS number.
 */
export function quantityBelowSoldUnitsMessage(
  err: unknown,
  soldUnits: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
  formatCount: (n: number) => string = (n) => String(n)
): string | null {
  if (apiErrorCode(err) !== QUANTITY_BELOW_SOLD_UNITS_CODE) return null;
  const count = formatCount(Math.max(soldUnits, 0));
  return t("listing.form.quantityBelowSoldUnits", { count });
}

/**
 * QA-BUG3 (card 301) — the localized, actionable message for SF-B8's sibling
 * refusal (lowering `quantity` below the units on hold for a buyer), or null
 * for every OTHER error — same contract as `quantityBelowSoldUnitsMessage`
 * above, so a caller tries both in sequence and falls back to its existing
 * generic handling (`apiErrorMessage`) only when neither matches.
 *
 * `heldUnits` is the caller's `heldUnitsOf(listing)` (`@/utils/stock`) —
 * passed in rather than re-derived here, exactly like `soldUnits` above, so
 * this file never disagrees with the rest of the app about what "held" means.
 * `formatCount` is the caller's `useLocalization().formatNumber`, for the
 * same locale-digit reason as `quantityBelowSoldUnitsMessage`.
 */
export function quantityBelowHeldUnitsMessage(
  err: unknown,
  heldUnits: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
  formatCount: (n: number) => string = (n) => String(n)
): string | null {
  if (apiErrorCode(err) !== QUANTITY_BELOW_HELD_UNITS_CODE) return null;
  const count = formatCount(Math.max(heldUnits, 0));
  return t("listing.form.quantityBelowHeldUnits", { count });
}

/**
 * Whether the reassuring "saving puts this back on sale" note belongs under
 * the quantity field right now — before the seller ever taps Save. True only
 * when editing a listing that is CURRENTLY `sold` and the quantity being
 * typed would raise total stock above what has already sold — SF-B6's exact
 * reopen rule. This is a GOOD outcome, worded as one (§4.1's instruction:
 * reassuring, not a warning) — never shown for any other status transition.
 */
export function willReopenOnSave(params: {
  status: string | null | undefined;
  soldUnits: number;
  typedQuantity: number | null | undefined;
}): boolean {
  const { status, soldUnits, typedQuantity } = params;
  if (status !== "sold") return false;
  if (typedQuantity == null || Number.isNaN(typedQuantity)) return false;
  return typedQuantity > soldUnits;
}
