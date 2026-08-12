/**
 * offerGuards — TASK-C381 (review fix, MUST).
 *
 * `Conversation.tsx`'s renderItem used to compute, INLINE, for every
 * offer/offer_counter row on every render: a `.find()` for a direct
 * accept/decline response, a `.some()` for "has this been countered",
 * another `.some()` for "has this counter itself been superseded by a
 * further counter" — three full scans of the (unbounded) `messages` array
 * PER ROW, and `offerInThread.test.tsx` hand-copied its own duplicate of the
 * resulting `canCounterBack`/`canRespondToOffer` predicates instead of
 * testing the real ones — a tautology that could never fail no matter how
 * the real guard drifted.
 *
 * This module is the single source of truth for both problems:
 *  - `buildOfferIndex` does ONE pass over `messages` and returns a `Map`
 *    keyed by message id, so `Conversation.tsx` can build it once per
 *    message-list change (`useMemo`) instead of re-scanning per row.
 *  - `canRespondToOffer` / `canCounterBack` are the real predicates —
 *    imported by both `Conversation.tsx` and its test file, so a test can
 *    only pass by exercising the actual logic.
 *
 * Review fix (DR): "only the newest pending offer should keep live
 * actions" — either participant can open a brand-new, STANDALONE `offer`
 * from the composer at any time (TASK-C381's whole point), including while
 * an earlier offer/counter is still unanswered. Without this, a seller
 * could Accept a stale first offer after the buyer already moved on to a
 * second, higher one. `buildOfferIndex` treats every unanswered,
 * un-countered offer/counter as "superseded" EXCEPT the single most
 * recently sent one — the live tip of the negotiation — the same way a
 * direct counter already superseded the offer it replied to.
 */
import type { Message } from "@/api/conversations";

export type OfferOutcome = "accepted" | "declined" | null;

/** The subset of `Message` this module actually reads — keeps the pure
 *  functions here trivially testable with plain object literals. */
export type OfferThreadMessage = Pick<Message, "id" | "kind" | "respondsToId">;

export interface OfferRowFlags {
  /** A direct `offer_accepted`/`offer_declined` response pointed at this message. */
  outcome: OfferOutcome;
  /**
   * No direct outcome yet, but this offer/counter is no longer the one to
   * act on — either a further `offer_counter` replied to it, or the
   * negotiation has moved on to a newer, later offer/counter while this one
   * was never answered. Renders a muted "no longer active" chip instead of
   * blank space (see `MessageBubble`'s `offerOutcome="countered"`), and
   * never offers live Accept/Decline/Counter actions.
   */
  isSuperseded: boolean;
}

/**
 * One pass over the FULL (unfiltered) message list — never the search-
 * filtered or day-grouped rows, so accept/decline/counter responses that
 * chat search hides can still be found — producing every offer/offer_counter
 * message's outcome + superseded state.
 */
export function buildOfferIndex(
  messages: OfferThreadMessage[]
): Map<number, OfferRowFlags> {
  const supersededByCounterIds = new Set<number>();
  const outcomeByRespondsTo = new Map<number, "accepted" | "declined">();

  for (const m of messages) {
    if (m.kind === "offer_counter" && m.respondsToId != null) {
      supersededByCounterIds.add(m.respondsToId);
    } else if (
      (m.kind === "offer_accepted" || m.kind === "offer_declined") &&
      m.respondsToId != null
    ) {
      outcomeByRespondsTo.set(
        m.respondsToId,
        m.kind === "offer_accepted" ? "accepted" : "declined"
      );
    }
  }

  // The single most recently sent offer/offer_counter with neither a direct
  // outcome nor a reply counter yet — the live tip of the negotiation.
  // `messages` is chronological (oldest→newest), so the last match wins.
  let newestPendingId: number | null = null;
  for (const m of messages) {
    if (m.kind !== "offer" && m.kind !== "offer_counter") continue;
    if (supersededByCounterIds.has(m.id)) continue;
    if (outcomeByRespondsTo.has(m.id)) continue;
    newestPendingId = m.id;
  }

  const index = new Map<number, OfferRowFlags>();
  for (const m of messages) {
    if (m.kind !== "offer" && m.kind !== "offer_counter") continue;
    const outcome = outcomeByRespondsTo.get(m.id) ?? null;
    const supersededByCounter = supersededByCounterIds.has(m.id);
    const isStalePending =
      outcome == null && !supersededByCounter && m.id !== newestPendingId;
    index.set(m.id, {
      outcome,
      isSuperseded: supersededByCounter || isStalePending,
    });
  }
  return index;
}

/**
 * Whether the recipient of this offer/counter can still tap Accept/Decline.
 * `flags` comes from `buildOfferIndex`; `undefined` (no entry — not an
 * offer/offer_counter row) is always `false`.
 */
export function canRespondToOffer(flags: OfferRowFlags | undefined): boolean {
  if (!flags) return false;
  return flags.outcome == null && !flags.isSuperseded;
}

/**
 * Whether the recipient of this offer/counter can tap "Counter" to reopen
 * the sheet prefilled with this amount. Identical to `canRespondToOffer`
 * except it is never true for the SENDER of the message — mirrors
 * `Conversation.tsx`'s `onOfferCounter` wiring, which (unlike
 * `onOfferRespond`) has always gated on `!isMine` at the call site rather
 * than relying solely on `MessageBubble`'s own `!isMine` render guard.
 */
export function canCounterBack(params: {
  isMine: boolean;
  flags: OfferRowFlags | undefined;
}): boolean {
  if (params.isMine) return false;
  return canRespondToOffer(params.flags);
}
