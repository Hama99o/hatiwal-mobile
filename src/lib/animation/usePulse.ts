import { useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useReduceMotion } from "./useReduceMotion";

/**
 * Returns an animated style with a pulsing opacity (0.4 → 1 → 0.4 …).
 *
 * When the system "Reduce Motion" setting is on the shimmer loop is skipped
 * and a static full-opacity style is returned instead, so skeleton placeholders
 * remain visible but do not animate.
 */
export function usePulse() {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      // Cancel any in-flight withRepeat loop before snapping to fully visible,
      // so the prior animation cannot continue driving opacity after the assignment.
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 750 }),
        withTiming(1, { duration: 750 })
      ),
      -1,
      false
    );
  }, [opacity, reduceMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
