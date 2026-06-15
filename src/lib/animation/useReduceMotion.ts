import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Returns true when the operating system's "Reduce Motion" accessibility setting
 * is enabled. Listens for real-time changes so the app reacts immediately if the
 * user toggles the setting while the app is open.
 *
 * All animation primitives in src/lib/animation/ check this value before running
 * any animation, ensuring Hatiwal is fully usable with all animations disabled.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Read the initial value
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    // Subscribe to real-time changes (user toggles the setting while app is open)
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled: boolean) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
