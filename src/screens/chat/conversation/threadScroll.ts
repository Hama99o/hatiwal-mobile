/**
 * threadScroll — when the message thread may follow its own bottom.
 *
 * Extracted from Conversation.tsx so the rule that caused the half-scroll bug
 * (owner report, 2026-09-02: "when we send message it did not scroll till it
 * should… I need to scroll manual to see it") is testable rather than implied
 * by two refs and a throttled scroll handler.
 *
 * The bug: `onScroll` is throttled to 200ms, so it fires DURING a programmatic
 * animated scroll and recomputed "is the user near the bottom?" from an offset
 * the animation had not finished travelling. That wrote back `false`, and every
 * later layout pass — the bubble's final height, an offer/meetup card measuring,
 * the bottom bar growing as QuickReplies appear, the keyboard opening — was then
 * refused permission to finish the scroll. The thread stopped wherever the first
 * animation happened to reach, leaving a tall last bubble part-hidden.
 */

/** Distance from the bottom, in px, still counted as "at the bottom". */
export const NEAR_BOTTOM_PX = 120;

/**
 * How long a programmatic scroll-to-bottom stays authoritative.
 *
 * Must outlast the whole settle sequence — append, bubble measure, bar
 * re-measure, keyboard animation — or the gate reopens mid-flight and the bug
 * returns. 700ms covers the 460ms retry chain with margin.
 */
export const SCROLL_LOCK_MS = 700;

export type ScrollMetrics = {
  /** Total scrollable content height, including contentContainer padding. */
  contentHeight: number;
  /** Height of the visible viewport. */
  viewportHeight: number;
  /** Current vertical scroll offset. */
  offsetY: number;
};

/**
 * Is the thread parked close enough to the bottom that new messages should
 * follow automatically?
 *
 * A thread SHORTER than its viewport is always at the bottom: the subtraction
 * goes negative, which is below any positive threshold, so this is correct
 * rather than accidental — but it is the case a naive `>= 0` check gets wrong.
 */
export function isNearBottom(m: ScrollMetrics, threshold = NEAR_BOTTOM_PX): boolean {
  return m.contentHeight - m.viewportHeight - m.offsetY < threshold;
}

/**
 * May a scroll event update the near-bottom flag?
 *
 * `false` while a programmatic scroll owns the list. Those intermediate offsets
 * are not where the user chose to be, and treating them as a user intent is
 * exactly what cancelled the scroll half-way.
 */
export function shouldTrackScrollPosition(now: number, lockUntil: number): boolean {
  return now >= lockUntil;
}

/** When a scroll-to-bottom started now should stop owning the list. */
export function scrollLockDeadline(now: number, lockMs = SCROLL_LOCK_MS): number {
  return now + lockMs;
}

/**
 * May a scroll EVENT be read as the user choosing where to sit?
 *
 * Only if the user is actually dragging. This is the rule the time-based lock
 * alone got wrong, measured on device (2026-09-02): the final unanimated jump
 * cleared the lock in the same instant it fired, so the scroll event that jump
 * produced — throttled by up to 200ms, and therefore arriving AFTER the lock had
 * lifted — was recorded as user intent. `isNearBottom` was computed from a
 * mid-flight offset, came out false, and the tall bubble's own later growth was
 * then refused a scroll. The list finished 399px short of its end and a tall
 * meetup/offer card sat 21px behind the composer, which is exactly the reported
 * symptom.
 *
 * A programmatic scroll must never be able to say "the user wants to be here".
 * Only a drag can.
 */
export function shouldTrackFromScrollEvent(
  isUserDragging: boolean,
  now: number,
  lockUntil: number
): boolean {
  return isUserDragging && shouldTrackScrollPosition(now, lockUntil);
}
