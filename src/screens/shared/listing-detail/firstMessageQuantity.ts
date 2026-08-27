/**
 * firstMessageQuantity — SF-M6: builds `FirstMessageSheet`'s prefilled
 * message text once a buyer has set a multi-unit quantity via the shared
 * `QuantityStepper` on `ListingDetail`.
 *
 * docs/SELL_FLOW_REDESIGN.md §4.3 — the whole point of this ticket: Hatiwal
 * has no payment and no delivery, so if a buyer and seller agree on a bare
 * number ("40,000") one may mean per-unit and the other the whole lot, and
 * they only discover the mismatch face to face at the meetup, with nothing to
 * arbitrate it. When `multiUnit && quantity > 1`, the prefilled (still
 * editable) message states unit price × qty = total IN WRITING, e.g.:
 *
 *   "Hi! I'd like to buy 3 × AFN 14,000 = AFN 42,000. Is this still available?"
 *
 * For a single-item listing, or a multi-unit listing left at the default
 * qty=1, the message is untouched (`listing.detail.defaultMessage`) — this is
 * the hard rule the whole redesign lives or dies on: a single-item listing
 * must stay byte-identical to today.
 *
 * No backend change: the quantity is never persisted as structured data
 * anywhere, only as stated intent in prose, sent through the existing `POST
 * /listings/:listing_id/conversations` like every other first message.
 *
 * Pure + standalone (mirrors `reserveAfterAccept.ts`'s own pure/side-effect
 * split) so the unit×qty=total arithmetic, the currency formatting, and the
 * bidi isolation of the two formatted amounts are independently testable
 * without mounting `FirstMessageSheet`'s full Modal/KeyboardAvoidingView/
 * react-query tree.
 */
import { wrapBidiIsolate } from "@/screens/chat/conversation/reserveAfterAccept";

export interface BuildFirstMessageTextParams {
  /** Buyer-selected quantity from ListingDetail's `QuantityStepper` (default 1). */
  quantity: number;
  /** `listing.multiUnit` (`hasStockToShow(listing)`) — gates the whole template. */
  multiUnit: boolean;
  /** The listing's own asking price — always PER UNIT (docs/SPIKE_LISTING_QUANTITY.md §0c). */
  unitPrice: number;
  currency: string;
  /** `t("listing.detail.defaultMessage")` — returned as-is when the template doesn't apply. */
  defaultMessage: string;
  formatCurrency: (amount: number, currency?: string) => string;
  /**
   * `useLocalization().formatNumber` — the qty itself is also rendered "in
   * the buyer's own locale's number formatting" (SF-M6 acceptance
   * criterion), not just the two currency amounts: ps/fa render Arabic-Indic
   * digits (e.g. "۳"), not a bare Latin "3".
   */
  formatNumber: (value: number) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * Pure — never calls the network, never mutates anything. Returns the plain
 * default message for a single-item listing, a multi-unit listing left at
 * qty=1, or any non-finite/non-positive quantity (defensive: a buyer must
 * never see "1 × AFN 0 = AFN 0" from a listing still loading).
 */
export function buildFirstMessageText(params: BuildFirstMessageTextParams): string {
  const { quantity, multiUnit, unitPrice, currency, defaultMessage, formatCurrency, formatNumber, t } =
    params;

  if (!multiUnit) return defaultMessage;
  if (!Number.isFinite(quantity) || quantity <= 1) return defaultMessage;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return defaultMessage;

  const total = unitPrice * quantity;

  return t("listing.detail.firstMessageQuantityTemplate", {
    // Bidi-isolated exactly like reserveAfterAccept.ts's own prices/names
    // spliced into an RTL (ps/fa) sentence — see wrapBidiIsolate's doc comment.
    // Without this, an LTR-formatted number/currency amount interpolated into
    // a Pashto/Dari sentence can visually reorder around the surrounding "×"/"=".
    qty: wrapBidiIsolate(formatNumber(quantity)),
    unitPrice: wrapBidiIsolate(formatCurrency(unitPrice, currency)),
    total: wrapBidiIsolate(formatCurrency(total, currency)),
  });
}
