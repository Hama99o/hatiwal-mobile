/**
 * useScrollToTop — "back to top" plumbing for any long scrollable.
 *
 * Lives here rather than in each screen because every list in the app needs the
 * same three things: track how far we are down, expose a jump, and only offer
 * the jump once scrolling far enough that it is actually useful.
 *
 * Works with both list flavours in the app without the caller branching:
 *   • FlashList / FlatList — `scrollToOffset`
 *   • ScrollView           — `scrollTo`
 * `scrollToTop()` calls whichever the attached ref exposes.
 */
import { useCallback, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Show the button only past this many px — roughly one screen down. */
export const SCROLL_TO_TOP_THRESHOLD = 700;

interface ScrollableRef {
  scrollToOffset?: (params: { offset: number; animated?: boolean }) => void;
  scrollTo?: (params: { y: number; animated?: boolean }) => void;
}

export function useScrollToTop<T extends ScrollableRef>(
  threshold: number = SCROLL_TO_TOP_THRESHOLD
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      // setState only on a transition — onScroll fires on every frame, and
      // re-rendering a whole list per frame drops the scroll to a crawl.
      setVisible((wasVisible) => {
        const shouldShow = y > threshold;
        return shouldShow === wasVisible ? wasVisible : shouldShow;
      });
    },
    [threshold]
  );

  const scrollToTop = useCallback(() => {
    const target = ref.current;
    if (!target) return;
    if (typeof target.scrollToOffset === "function") {
      target.scrollToOffset({ offset: 0, animated: true });
    } else if (typeof target.scrollTo === "function") {
      target.scrollTo({ y: 0, animated: true });
    }
    // Hide immediately: the animation takes a moment and leaving the button up
    // invites a second tap that does nothing.
    setVisible(false);
  }, []);

  return { ref, visible, onScroll, scrollToTop };
}
