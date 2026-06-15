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
export function triggerHaptic(
  type: HapticType = "light",
  reduceMotion = false
): void {
  try {
    // When Reduce Motion is enabled always fire only the lightest impact.
    if (reduceMotion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    switch (type) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "selection":
        Haptics.selectionAsync();
        break;
    }
  } catch {
    // Not all Android devices support all haptic types — fail silently.
  }
}
