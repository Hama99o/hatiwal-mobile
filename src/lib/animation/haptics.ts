import * as Haptics from "expo-haptics";

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "selection";

/**
 * Trigger a haptic feedback effect.
 *
 * @param type      The desired haptic type. Defaults to "light".
 * @param reduceMotion  When true (system Reduce Motion is on) only the lightest
 *                  impact (ImpactFeedbackStyle.Light) is fired, regardless of the
 *                  requested type. This avoids disorienting feedback for users who
 *                  have opted out of motion.
 */
/**
 * The expo-haptics calls return PROMISES, so a `try/catch` around them never
 * sees a failure — it escapes as an unhandled rejection. On Android it always
 * fails: app.json blocks android.permission.VIBRATE, so every call rejects
 * with a SecurityException, which in a dev build is a full-screen red box.
 */
function fire(p: Promise<unknown>): void {
  p.catch(() => undefined);
}

export function triggerHaptic(
  type: HapticType = "light",
  reduceMotion = false
): void {
  try {
    // When Reduce Motion is enabled always fire only the lightest impact.
    if (reduceMotion) {
      fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      return;
    }

    switch (type) {
      case "light":
        fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        break;
      case "medium":
        fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
        break;
      case "heavy":
        fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        break;
      case "success":
        fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        break;
      case "error":
        fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
        break;
      case "selection":
        fire(Haptics.selectionAsync());
        break;
    }
  } catch {
    // Not all Android devices support all haptic types — fail silently.
  }
}
