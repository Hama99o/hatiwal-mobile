/**
 * offerQuantity — SF-M11 (docs/SELL_FLOW_REDESIGN.md).
 *
 * The mobile half of "an offer carries how many units it is for". Before this,
 * a buyer on a 15-unit listing could only type a price, and the quantity lived
 * in prose the seller had to remember: the composer sent
 * "3 × AFN 14,000 = AFN 42,000" as TEXT, mark-sold opened at 1, and if the
 * seller didn't retype 3 the batch silently kept 2 units that were already
 * gone. `OfferSheet`'s own `perUnit` docstring named the hole
 * ("an offer carries no quantity of its own, so nothing downstream
 * disambiguates it"); this closes it.
 *
 * Pure, so the rules are testable without a screen — and so both the buyer's
 * composer and the seller's mark-sold prefill read ONE implementation instead
 * of each remembering the null rule.
 */

/**
 * The server's machine-readable code for "you asked for more units than are
 * left" (`Message::OFFER_QUANTITY_ABOVE_AVAILABLE_CODE`). Mapped to our own
 * en/ps/fa copy rather than shown raw: `errors` is English Rails prose, and a
 * Pashto or Dari user must never be shown an untranslated sentence. Same
 * contract as `QUANTITY_BELOW_SOLD_UNITS_CODE` in
 * `@/screens/seller/listing-form/quantityReconciliation`.
 */
export const OFFER_QUANTITY_ABOVE_AVAILABLE_CODE =
  "offer_quantity_above_available_units";

/** i18n key for that code. */
export const OFFER_QUANTITY_ABOVE_AVAILABLE_KEY =
  "chat.offer.quantityAboveAvailable";

/**
 * How many units an offer is actually for.
 *
 * `null`/`undefined` from the serializer means UNSPECIFIED — a non-offer kind,
 * a single-item listing, a sender who named no quantity, or any offer written
 * before SF-B11 shipped. Every one of those means ONE unit in practice, but
 * that inference belongs here and not at six call sites. Anything ≤ 0 or
 * non-integer is also one: the column is validated positive server-side, so a
 * junk value can only come from a corrupted row, and answering "1" keeps a
 * thread readable instead of rendering "0 × AFN 14,000".
 */
export function offerUnits(offerQuantity?: number | null): number {
  if (offerQuantity == null) return 1;
  if (!Number.isFinite(offerQuantity)) return 1;
  const n = Math.floor(offerQuantity);
  return n > 0 ? n : 1;
}

/**
 * True when this offer names a quantity worth SHOWING — i.e. more than one
 * unit. A "1 ×" prefix on a single-unit offer is noise, and on a single-item
 * listing it would be actively confusing, so the UI stays byte-identical to
 * today for both.
 */
export function shouldShowOfferUnits(offerQuantity?: number | null): boolean {
  return offerUnits(offerQuantity) > 1;
}

export interface ParsedOfferQuantity {
  /** The value to send, or null when the field should not be sent at all. */
  value: number | null;
  /** i18n key for an inline field error, or null when the input is usable. */
  errorKey: string | null;
}

/**
 * Validate the composer's quantity field BEFORE sending, so the common
 * mistakes are caught inline instead of as a server 422 the buyer has to
 * decode. Mirrors the server's own rules (`Message#offer_quantity` numericality
 * + `offer_quantity_within_available_units`) rather than inventing softer ones
 * — a client that accepts what the server rejects is how "nothing happened and
 * no error appeared" bugs are born.
 *
 * @param raw       the text field's value, as typed
 * @param available `listing.availableUnits` — the ceiling, when known
 */
export function parseOfferQuantity(
  raw: string,
  available?: number | null
): ParsedOfferQuantity {
  const trimmed = (raw ?? "").trim();
  // Empty is not an error: the buyer simply didn't say, which the server
  // treats as unspecified. Send nothing.
  if (trimmed === "") return { value: null, errorKey: null };

  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return { value: null, errorKey: "chat.offer.quantityInvalid" };
  }
  if (available != null && available > 0 && n > available) {
    return { value: null, errorKey: OFFER_QUANTITY_ABOVE_AVAILABLE_KEY };
  }
  return { value: n, errorKey: null };
}
