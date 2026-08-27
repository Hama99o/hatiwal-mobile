/**
 * threadAvailability — TASK-K729 (review fix, MEDIUM).
 *
 * `canOfferInThread` and `showUnavailableNotice` used to live inline inside
 * Conversation.tsx (an unmountable, deeply-coupled screen — ActionCable,
 * composer draft persistence, FlatList, gesture-handler/reanimated — see
 * offerInThread.test.tsx's header), so nothing ever tested the REAL
 * predicates. Both guard suites re-declared hand-copied duplicates instead
 * (offerInThread.test.tsx, ComposerActionsSheet.test.tsx), which is exactly
 * how a stale/wrong copy of the matrix could drift from the real one and
 * stay green. Hoisted here — mirrors the existing split for
 * `reserveAfterAccept.ts` / `groupMessagesByDay.ts` — so Conversation.tsx
 * imports these directly and the test files import the SAME functions.
 */

export interface ThreadAvailabilityListing {
  status?: string | null;
  negotiable?: boolean | null;
}

/**
 * Composer's offer-button visibility guard. True only on an open
 * conversation about a listing that exists, isn't deleted, isn't reserved or
 * sold (TASK-K729 — once the seller has committed to a buyer, a NEW offer no
 * longer makes sense), and is negotiable (`negotiable !== false`).
 */
export function canOfferInThread(params: {
  /** `!isClosed && !!currentConversationId` in Conversation.tsx. */
  canSend: boolean;
  listing: ThreadAvailabilityListing | null | undefined;
  listingDeleted?: boolean;
}): boolean {
  const { canSend, listing, listingDeleted } = params;
  return (
    canSend &&
    !!listing &&
    !listingDeleted &&
    listing.status !== "sold" &&
    listing.status !== "reserved" &&
    listing.negotiable !== false
  );
}

/**
 * The buyer-facing sold recovery notice's visibility guard. Never shown to
 * the listing's own seller (`isOwner`) — they already have the lifecycle
 * controls in ListingHeader and the buyer info in SaleBuyerCard elsewhere —
 * and never before the viewer is actually known (`viewerKnown`, i.e.
 * `!!currentUser`), which prevents a seller opening a sold thread on a cold
 * start from flashing the buyer-facing copy for one frame while auth is
 * still hydrating (isOwner reads false until `currentUser` resolves).
 *
 * SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.4.3) — SOLD-ONLY as of this ticket.
 * `reserved` no longer means "unavailable": the backend keeps a reserved
 * listing live and message-able (SF-B1), so a reserved thread is a normal,
 * fully-usable conversation — no recovery notice, no dead end. Only a
 * terminal `sold` listing still shows this notice.
 */
export function showUnavailableNotice(params: {
  isOwner: boolean;
  /** `!!currentUser` — the viewer's identity must be resolved first. */
  viewerKnown: boolean;
  listing: ThreadAvailabilityListing | null | undefined;
  listingDeleted?: boolean;
}): boolean {
  const { isOwner, viewerKnown, listing, listingDeleted } = params;
  return (
    viewerKnown &&
    !isOwner &&
    !!listing &&
    !listingDeleted &&
    listing.status === "sold"
  );
}

/**
 * The reason ComposerActionsSheet's offer row is missing, so the sheet never
 * silently drops the row with zero explanation (LOW finding: "the vanished
 * control is still unexplained where the user looks"). Returns the listing's
 * status ONLY when that status (reserved/sold) is specifically why the offer
 * row is gone — never for the other reasons `canOfferInThread` already
 * covers (closed conversation, deleted listing, firm price), which have
 * their own, separate notices elsewhere in the thread and would be a
 * misleading reason to show here.
 */
export function offerUnavailableStatus(params: {
  canSend: boolean;
  listing: ThreadAvailabilityListing | null | undefined;
  listingDeleted?: boolean;
}): "reserved" | "sold" | null {
  const { canSend, listing, listingDeleted } = params;
  if (!canSend || !listing || listingDeleted) return null;
  if (listing.status === "reserved") return "reserved";
  if (listing.status === "sold") return "sold";
  return null;
}
