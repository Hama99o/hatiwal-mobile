/**
 * keyboardSafeBottom — the arithmetic behind the chat composer's bottom padding.
 *
 * The bug this locks down: with the keyboard OPEN, `insets.bottom` still reports
 * the gesture bar's full height even though the keyboard now covers it, so the
 * old `Math.max(insets.bottom, 8) + 12` reserved ~50px of dead space between the
 * input and the keyboard. Reported on a real device.
 */
import { keyboardSafeBottom, keyboardBarLift } from "../useKeyboardVisible";

describe("keyboardSafeBottom", () => {
  // A typical Android gesture-nav device: 48px inset, 8px floor, 12px base.
  const INSET = 48;

  it("reserves the safe-area inset while the keyboard is CLOSED", () => {
    expect(keyboardSafeBottom(false, INSET, 8, 12)).toBe(60); // 48 + 12
  });

  it("drops the inset entirely while the keyboard is OPEN — the keyboard is the safe area", () => {
    expect(keyboardSafeBottom(true, INSET, 8, 12)).toBe(12); // base only
  });

  it("is exactly the inset smaller when the keyboard opens — the gap that was reported", () => {
    const closed = keyboardSafeBottom(false, INSET, 8, 12);
    const open = keyboardSafeBottom(true, INSET, 8, 12);
    expect(closed - open).toBe(INSET);
  });

  it("applies the floor when a device reports no bottom inset, but only when closed", () => {
    expect(keyboardSafeBottom(false, 0, 8, 12)).toBe(20); // floor 8 + 12
    expect(keyboardSafeBottom(true, 0, 8, 12)).toBe(12); // no floor with keyboard up
  });

  it("keeps the base padding no matter what, so the bar never sits flush", () => {
    expect(keyboardSafeBottom(true, 0, 0, 12)).toBe(12);
    expect(keyboardSafeBottom(true, 99, 99, 12)).toBe(12);
  });

  it("honours the closed-notice variant's larger floor", () => {
    // The closed-conversation notice uses minInset 12 rather than 8.
    expect(keyboardSafeBottom(false, 0, 12, 12)).toBe(24);
    expect(keyboardSafeBottom(false, INSET, 12, 12)).toBe(60);
  });
});

describe("keyboardBarLift — the cross-platform case", () => {
  const KB = 345;
  const FULL = 932;

  it("lifts by the whole keyboard when the OS does NOT shrink the window (iOS, Android edge-to-edge)", () => {
    // Measured on the reporter's iPhone: root stayed 932 with the keyboard open.
    expect(keyboardBarLift(KB, FULL, FULL)).toBe(KB);
  });

  it("lifts by NOTHING when the OS already shrank the window (older Android adjustResize)", () => {
    // Container already ends at the keyboard's top edge; lifting again would
    // reproduce the original bug with a gap exactly one keyboard tall.
    expect(keyboardBarLift(KB, FULL, FULL - KB)).toBe(0);
  });

  it("lifts by the remainder when the OS absorbed only part of it", () => {
    expect(keyboardBarLift(KB, FULL, FULL - 200)).toBe(145);
  });

  it("never returns a negative lift if the window shrank more than the keyboard", () => {
    expect(keyboardBarLift(KB, FULL, FULL - 500)).toBe(0);
  });

  it("is zero whenever the keyboard is closed", () => {
    expect(keyboardBarLift(0, FULL, FULL)).toBe(0);
    expect(keyboardBarLift(0, 0, 0)).toBe(0);
  });

  it("assumes a full-height window when no baseline exists yet", () => {
    // First render with the keyboard already up (rotation, returning to the
    // screen): better to lift than to leave the bar hidden behind the keyboard.
    expect(keyboardBarLift(KB, 0, FULL)).toBe(KB);
  });

  it("ignores small height changes — status/nav bar transitions, not a keyboard", () => {
    expect(keyboardBarLift(KB, FULL, FULL - 10)).toBe(KB);
  });
});
