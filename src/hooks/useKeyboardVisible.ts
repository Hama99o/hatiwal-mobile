/**
 * useKeyboardVisible — is the soft keyboard on screen right now?
 *
 * WHY THIS EXISTS. Any bar pinned to the bottom of a screen pads itself with the
 * safe-area bottom inset, so it clears the Android gesture bar / iOS home
 * indicator:
 *
 *     paddingBottom: Math.max(insets.bottom, 8) + 12
 *
 * That is correct while the keyboard is CLOSED and wrong the moment it opens.
 * `insets.bottom` keeps reporting its full value (the gesture bar is still
 * *there*, it is simply behind the keyboard now), so the bar goes on reserving
 * ~35-50px for a control the user cannot see — a dead band between the input and
 * the top of the keyboard. Reported on a real device against the chat composer.
 *
 * The keyboard IS the safe area while it is up, so the inset must drop to 0 and
 * only the bar's own base padding remains.
 *
 * Pair it with `keyboardSafeBottom` below rather than re-deriving the arithmetic
 * at each call site.
 *
 * Note on events: Android only ever emits `keyboardDidShow`/`keyboardDidHide`
 * (the `will*` pair is iOS-only), so both are subscribed. iOS gets the `will*`
 * events too, which fire at the start of the animation — so the padding
 * collapses in step with the keyboard rather than a frame behind it.
 */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

/**
 * The bottom padding a keyboard-adjacent bottom bar should use.
 *
 * `insetBottom` — from `useSafeAreaInsets().bottom`.
 * `minInset`    — floor applied to the inset when the keyboard is closed, so a
 *                 device reporting 0 still gets a little breathing room.
 * `base`        — the bar's own padding, always applied.
 *
 * While the keyboard is up the inset is dropped entirely: the keyboard occupies
 * that space, so reserving for it leaves a visible gap.
 */
export function keyboardSafeBottom(
  keyboardVisible: boolean,
  insetBottom: number,
  minInset: number,
  base: number
): number {
  return (keyboardVisible ? 0 : Math.max(insetBottom, minInset)) + base;
}
