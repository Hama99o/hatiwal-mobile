/**
 * threadScroll — unit tests for the half-scroll fix (owner report 2026-09-02).
 *
 * Exercises the REAL exported helpers that Conversation.tsx imports, never a
 * hand-copied duplicate (see offerGuards.test.ts's header on the tautology this
 * house avoids repeating).
 */
import { describe, it, expect } from "@jest/globals";
import {
  isNearBottom,
  shouldTrackFromScrollEvent,
  shouldTrackScrollPosition,
  scrollLockDeadline,
  NEAR_BOTTOM_PX,
  SCROLL_LOCK_MS,
} from "../threadScroll";

describe("isNearBottom", () => {
  it("true when parked exactly at the bottom", () => {
    expect(isNearBottom({ contentHeight: 2000, viewportHeight: 800, offsetY: 1200 })).toBe(true);
  });

  it("true just inside the threshold", () => {
    expect(isNearBottom({ contentHeight: 2000, viewportHeight: 800, offsetY: 1081 })).toBe(true);
  });

  it("false just outside the threshold — reading history is not following", () => {
    expect(isNearBottom({ contentHeight: 2000, viewportHeight: 800, offsetY: 1080 })).toBe(false);
  });

  it("true for a thread shorter than the viewport (negative distance)", () => {
    // The case a naive `>= 0` check gets wrong: two messages in a tall window.
    expect(isNearBottom({ contentHeight: 300, viewportHeight: 800, offsetY: 0 })).toBe(true);
  });

  it("false mid-animation, which is precisely why it must not be consulted then", () => {
    // A send appended a 900px bubble; the animation has travelled 200 of it.
    const midFlight = { contentHeight: 2900, viewportHeight: 800, offsetY: 1400 };
    expect(isNearBottom(midFlight)).toBe(false);
    // ...and the lock is what stops that false from being written back.
    expect(shouldTrackScrollPosition(1_000, scrollLockDeadline(900))).toBe(false);
  });
});

describe("shouldTrackScrollPosition", () => {
  it("blocks tracking while a programmatic scroll owns the list", () => {
    const now = 10_000;
    expect(shouldTrackScrollPosition(now, scrollLockDeadline(now))).toBe(false);
  });

  it("allows tracking once the lock has expired", () => {
    const started = 10_000;
    expect(shouldTrackScrollPosition(started + SCROLL_LOCK_MS, scrollLockDeadline(started))).toBe(true);
  });

  it("allows tracking when no scroll is in flight (lock cleared to 0)", () => {
    expect(shouldTrackScrollPosition(Date.now(), 0)).toBe(true);
  });

  it("outlasts the 460ms retry chain — a shorter lock would reopen the bug", () => {
    const started = 0;
    expect(shouldTrackScrollPosition(460, scrollLockDeadline(started))).toBe(false);
    expect(SCROLL_LOCK_MS).toBeGreaterThan(460);
  });
});

describe("constants", () => {
  it("keeps the near-bottom threshold the screen was tuned against", () => {
    expect(NEAR_BOTTOM_PX).toBe(120);
  });
});

// ── The device-measured bug: a programmatic scroll must not look like intent ──
//
// Measured on 2026-09-02: the list stopped 399px short of its end and a tall
// meetup card sat 21px behind the composer, while Maestro reported the flow as
// passed (its visibility test cannot see occlusion).
describe("shouldTrackFromScrollEvent", () => {
  it("ignores a scroll event that no drag produced — the 399px-short bug", () => {
    // The final programmatic jump's own event, arriving after the lock lifted.
    expect(shouldTrackFromScrollEvent(false, 2_000, 1_000)).toBe(false);
  });

  it("still ignores it while the lock is also held (belt and braces)", () => {
    expect(shouldTrackFromScrollEvent(false, 1_000, 2_000)).toBe(false);
  });

  it("honours a real drag once no programmatic scroll is in flight", () => {
    expect(shouldTrackFromScrollEvent(true, 2_000, 1_000)).toBe(true);
  });

  it("defers to the lock even during a drag started mid-jump", () => {
    // A drag that begins while a jump is still settling must not have its
    // mid-flight offsets recorded either.
    expect(shouldTrackFromScrollEvent(true, 1_000, 2_000)).toBe(false);
  });
});
