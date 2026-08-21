/**
 * Keyboard geometry for screens with a bar pinned to the bottom.
 *
 * WHY THIS IS NOT JUST KeyboardAvoidingView
 * -----------------------------------------
 * NOTE ON PLATFORMS: the gap this was written for turned out to be on iOS, not
 * Android — see Conversation.tsx's bottom-bar comment. The observations below
 * about Android edge-to-edge still hold and are why nothing here assumes the
 * window resizes.
 *
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

/**
 * How far a bottom-anchored bar must be lifted so it sits on the keyboard.
 *
 * DO NOT simplify this to "the keyboard's height". Whether that is right depends
 * on something the app cannot assume:
 *
 *   • If the OS does NOT shrink the window for the keyboard (iOS, and Android
 *     under the edge-to-edge that Expo SDK 54 enforces), the container still
 *     spans the full screen and the bar must be lifted by the whole keyboard.
 *   • If the OS DOES shrink it (older Android `adjustResize`, some OEM skins,
 *     iPad split view / Stage Manager), the container already ends at the
 *     keyboard's top edge — lifting it again would leave a gap exactly as large
 *     as the keyboard.
 *
 * Getting this wrong is the bug this whole module exists for, and it was wrong
 * for four rounds because a platform was assumed rather than measured. So it is
 * measured: pass the container's height while the keyboard is CLOSED and its
 * height NOW. If those differ, the OS shrank it and did the work already.
 *
 * Self-correcting on every platform and window mode, with no Platform branch.
 *
 * @param keyboardHeight current keyboard height (0 when closed)
 * @param baselineHeight container height measured with the keyboard closed
 * @param currentHeight  container height right now
 */
export function keyboardBarLift(
  keyboardHeight: number,
  baselineHeight: number,
  currentHeight: number
): number {
  if (keyboardHeight <= 0) return 0;
  // No baseline yet (first render with the keyboard already up): assume the
  // common case — a full-height window — rather than risk hiding the bar.
  if (baselineHeight <= 0) return keyboardHeight;

  // A tolerance, not equality: status/nav bar transitions and rotation settle a
  // few px off, and a genuine keyboard resize is hundreds of px.
  const shrank = baselineHeight - currentHeight > 24;
  if (!shrank) return keyboardHeight;

  // The OS shrank the container. Lift only by whatever it did NOT absorb, so a
  // partial resize is handled too, and never below zero.
  return Math.max(0, keyboardHeight - (baselineHeight - currentHeight));
}
