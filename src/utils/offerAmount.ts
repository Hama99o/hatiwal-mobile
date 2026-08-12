/**
 * parseOfferAmount — TASK-C381 (review fix, MUST/DR).
 *
 * The exact `!amount || amount <= 0` guard used to be re-typed at every
 * offer-amount send path: `ListingDetail.tsx`'s `handleSendOffer`,
 * `Conversation.tsx`'s `handleSendOfferInThread` — and NOT AT ALL in
 * `handleSendCounter` / the former `CounterOfferSheet`, which is how a
 * seller (or buyer, since TASK-C381 lets either side counter) could send a
 * counter of "0" or "-500" and have it accepted as a live figure with no
 * validation and no error toast.
 *
 * Hoisted into one pure, exported function so every offer-amount input —
 * the fresh-offer sheet AND the counter sheet, now the same merged
 * `OfferSheet` component (see its `mode` prop) — validates identically, and
 * a future call site can no longer reintroduce the gap.
 *
 * Returns the parsed positive amount, or `null` for anything that is not a
 * finite number greater than zero (empty string, "0", a negative amount,
 * whitespace, or non-numeric text).
 */
export function parseOfferAmount(input: string): number | null {
  const amount = Number(input);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
