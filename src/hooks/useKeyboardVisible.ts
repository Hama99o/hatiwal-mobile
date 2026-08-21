/**
 * Keyboard geometry for screens with a bar pinned to the bottom.
 *
 * WHY THIS IS NOT JUST KeyboardAvoidingView
 * -----------------------------------------
 * Expo SDK 54 (RN 0.81) enforces edge-to-edge on Android, and under edge-to-edge
 * `android:windowSoftInputMode="adjustResize"` no longer shrinks the window: the
 * IME is an inset drawn OVER a full-height window. Measured on device with the
 * keyboard open — the root view's own onLayout height equalled the full screen
 * height (932), and `Keyboard.metrics()` reported height 0 while the keyboard
 * event payload correctly reported 345.
 *
 * Consequences, all of which we hit in turn while chasing a gap under the chat
 * composer:
 *   • `KeyboardAvoidingView behavior="height"` computes its own offset from
 *     numbers that are wrong under edge-to-edge, so it inserts a bogus gap.
 *   • `behavior={undefined}` inserts nothing — correct only if the OS resizes,
 *     which it does not, so the composer ends up under the keyboard.
 *   • `Keyboard.metrics()` cannot be used at all; it returns 0.
 *   • `useSafeAreaInsets().bottom` keeps reporting the gesture bar (34) even
 *     though the keyboard now covers it, so padding for it is dead space.
 *
 * So the app has to lift its own bottom bar by the keyboard's height, taken from
 * the event payload. `react-native-keyboard-controller` solves this properly with
 * native code, but it cannot run in Expo Go — this stays dependency-free.
 */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Keyboard height in dp, 0 when closed. From the event, never Keyboard.metrics(). */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS also emits the will* pair, which fires as the animation starts, so the
    // layout moves with the keyboard instead of a frame behind it. Android only
    // ever emits did*.
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvt, (e) =>
      setHeight(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/** Convenience: is the keyboard up? */
export function useKeyboardVisible(): boolean {
  return useKeyboardHeight() > 0;
}

/**
 * How far the screen's content must be inset from the bottom so a pinned bar
 * lands exactly on top of the keyboard.
 *
 * ANDROID: the keyboard's height, because the window is not resized (see above).
 * iOS: 0 — `KeyboardAvoidingView behavior="padding"` already does it there, and
 * adding this too would double-count.
 */
export function keyboardContentInset(keyboardHeight: number): number {
  return Platform.OS === "android" ? keyboardHeight : 0;
}

/**
 * The bottom padding a keyboard-adjacent bottom bar should use for ITS OWN
 * chrome.
 *
 * `insetBottom` — from `useSafeAreaInsets().bottom`.
 * `minInset`    — floor applied when the keyboard is closed, so a device
 *                 reporting 0 still gets breathing room.
 * `base`        — the bar's own padding, always applied.
 *
 * With the keyboard up the safe-area inset is dropped: the keyboard occupies
 * that space, so reserving for the gesture bar underneath it is dead space.
 */
export function keyboardSafeBottom(
  keyboardVisible: boolean,
  insetBottom: number,
  minInset: number,
  base: number
): number {
  return (keyboardVisible ? 0 : Math.max(insetBottom, minInset)) + base;
}
