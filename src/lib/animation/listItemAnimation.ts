import { FadeInDown } from "react-native-reanimated";
import { useReduceMotion } from "./useReduceMotion";

/**
 * Hook that returns a staggered FadeInDown entering animation for a list item
 * at the given index. When the system "Reduce Motion" setting is on, undefined
 * is returned instead so Reanimated skips the entering transition entirely.
 *
 * Usage in a list renderer:
 *   const getEntering = useListItemEntering();
 *   <Animated.View entering={getEntering(index)}>…</Animated.View>
 */
export function useListItemEntering() {
  const reduceMotion = useReduceMotion();

  return (index: number) => {
    if (reduceMotion) return undefined;
    const cappedIndex = Math.min(index, 8);
    return FadeInDown.delay(cappedIndex * 40).springify();
  };
}

/**
 * @deprecated Use `useListItemEntering()` hook instead.
 * Kept for backwards compatibility — callers that cannot use hooks can still
 * import this, but it will always animate (no reduce-motion check).
 */
export function getListItemEntering(index: number) {
  const cappedIndex = Math.min(index, 8);
  return FadeInDown.delay(cappedIndex * 40).springify();
}
