/**
 * keyboardSafeBottom — the arithmetic behind the chat composer's bottom padding.
 *
 * The bug this locks down: with the keyboard OPEN, `insets.bottom` still reports
 * the gesture bar's full height even though the keyboard now covers it, so the
 * old `Math.max(insets.bottom, 8) + 12` reserved ~50px of dead space between the
 * input and the keyboard. Reported on a real device.
 */
import { keyboardSafeBottom, keyboardContentInset } from "../useKeyboardVisible";
import { Platform } from "react-native";

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

describe("keyboardContentInset", () => {
  // Measured on device (Expo SDK 54, Android): with the keyboard open the root
  // view's own onLayout height was still the FULL screen height (932) and the
  // keyboard event reported 345 — the window is not resized under edge-to-edge,
  // so the screen must inset itself by exactly the keyboard height.
  it("insets by the full keyboard height on Android", () => {
    (Platform as { OS: string }).OS = "android";
    expect(keyboardContentInset(345)).toBe(345);
    expect(keyboardContentInset(0)).toBe(0);
  });

  it("insets nothing on iOS — KeyboardAvoidingView padding already does it, so this would double-count", () => {
    (Platform as { OS: string }).OS = "ios";
    expect(keyboardContentInset(345)).toBe(0);
    expect(keyboardContentInset(0)).toBe(0);
  });
});
