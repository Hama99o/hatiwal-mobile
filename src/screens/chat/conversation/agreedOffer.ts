/**
 * agreedOffer — TASK-C763.
 *
 * TASK-O947's one-tap reserve prompt only ever fires on the path where the
 * SELLER taps Accept (`shouldPromptReserveAfterAccept` in
 * `./reserveAfterAccept.ts` returns `false` whenever `!isOwner`) — its own
 * docstring names the hole it leaves open: "the buyer accepting a seller's
 * counter-offer". When the seller counters and the BUYER accepts, the seller
 * gets an `offer_accepted` bubble but the agreed price is never turned into a
 * reserve — the only route back is re-picking the buyer (and retyping a price
 * the thread already agreed) from `ListingHeader`'s generic lifecycle button.
 * Same dead end if the seller dismisses O947's one-shot prompt ("Not now") —
 * it never reappears.
 *
 * This module is the pure, independently-testable single source of truth for
 * "is there a live agreed deal in this thread right now, and should the
 * owner see a persistent banner offering to reserve for it" — consumed by
 * `Conversation.tsx` (never a fresh per-render scan of `messages`; both
 * functions here read the EXISTING `buildOfferIndex` Map from
 * `./offerGuards.ts`, memoized once per message-list change).
 */
import type { Message } from "@/api/conversations";
import type { OfferRowFlags } from "./offerGuards";

/** The subset of `Message` this module actually reads. */
export type AgreedOfferMessage = Pick<
  Message,
  "id" | "kind" | "body" | "offerAmount" | "offerCurrency"
>;

export interface AgreedOffer {
  /** The offer/offer_counter message that was accepted — never the accept response itself. */
  offerMessageId: number;
  amount: number;
  currency: string | null;
}

/**
 * One pass over the FULL (chronological, oldest→newest) message list,
 * consuming the existing `buildOfferIndex` Map rather than re-scanning —
 * returns the newest `offer`/`offer_counter` whose `OfferRowFlags.outcome`
 * is `"accepted"`, or `null` when nothing in the thread has been accepted
 * yet. Amount/currency come from the pre-parsed `offerAmount`/`offerCurrency`
 * serializer fields, falling back to the same `body.split("|")` parse
 * `handleSendCounter`/`handleOpenCounterSheet` already use for legacy rows
 * missing those fields. No side effects.
 */
export function findAgreedOffer(
  messages: AgreedOfferMessage[],
  offerIndex: Map<number, OfferRowFlags>
): AgreedOffer | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind !== "offer" && m.kind !== "offer_counter") continue;
    if (offerIndex.get(m.id)?.outcome !== "accepted") continue;

    const parts = (m.body ?? "").split("|");
    const amount = m.offerAmount ?? Number(parts[0] ?? 0);
    if (!amount || amount <= 0) continue;
    const currency = m.offerCurrency ?? parts[1] ?? null;

    return { offerMessageId: m.id, amount, currency };
  }
  return null;
}

/**
 * Pure guard for whether `Conversation.tsx` should render the
 * `AgreedDealBanner` — hoisted out of the render tree (mirrors
 * `offerGuards.ts`/`threadAvailability.ts`'s own reasoning) so a test can
 * only pass by exercising the exact predicate the screen renders from,
 * instead of a hand-copied duplicate that could silently drift from it.
 *
 * Never true for the buyer (`isOwner` false), nor for a draft/reserved/sold
 * listing (only `active` — once reserved/sold the deal already has its
 * lifecycle outcome; a fresh `active` listing with no accepted offer yet has
 * nothing to show), nor when the newest offer/counter is still pending,
 * declined, or superseded (`findAgreedOffer` returns `null` in all of those
 * cases).
 */
export function shouldShowAgreedDealBanner(params: {
  isOwner: boolean;
  listing: { status?: string | null } | null | undefined;
  agreedOffer: AgreedOffer | null;
}): boolean {
  const { isOwner, listing, agreedOffer } = params;
  if (!isOwner) return false;
  if (!listing || listing.status !== "active") return false;
  return agreedOffer !== null;
}
