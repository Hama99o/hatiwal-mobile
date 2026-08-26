/**
 * ScrollToTopButton — the single "back to top" affordance for every long list.
 *
 * Presentational only: it does not know what it scrolls. Pair it with
 * `useScrollToTop`, which owns the offset tracking and the jump. Wired once
 * inside UniversalList, so Bazaar, Saved, Messages, Hidden, Recently viewed,
 * Reviews and My reports all get it without repeating anything.
 *
 * Placement notes:
 *   • Sits above the FloatingTabBar, and adds the safe-area inset on top of it
 *     rather than replacing it, the way FloatingTabBar itself does.
 *   • End-aligned, so it mirrors to the left in RTL (ps / fa) automatically —
 *     `end` rather than `right`.
 */
import React from "react";
import { Pressable, View, I18nManager } from "react-native";
import { ArrowUp } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

/** Clears the floating tab bar (its own height plus its bottom gap). */
const TAB_BAR_CLEARANCE = 92;
const SIZE = 44; // design system: touch targets >= 44px

interface ScrollToTopButtonProps {
  visible: boolean;
  onPress: () => void;
  /** Screens with no tab bar (a pushed detail route) can drop the clearance. */
  bottomOffset?: number;
  testID?: string;
}

export function ScrollToTopButton({
  visible,
  onPress,
  bottomOffset = TAB_BAR_CLEARANCE,
  testID = "scroll-to-top-button",
}: ScrollToTopButtonProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Unmount rather than render at opacity 0: an invisible view over the list
  // would still swallow taps meant for the last row.
  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        end: 16,
        bottom: insets.bottom + bottomOffset,
      }}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t("common.scrollToTop")}
        hitSlop={8}
        android_ripple={{ color: colors.primaryForeground, borderless: true }}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          // Matches FloatingTabBar's soft float so the two read as one layer.
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <ArrowUp size={22} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

/** Exported for tests that assert placement maths without mounting a list. */
export const SCROLL_TO_TOP_TAB_BAR_CLEARANCE = TAB_BAR_CLEARANCE;
/** True when the button mirrors to the left edge (RTL locales). */
export const scrollToTopIsMirrored = () => I18nManager.isRTL;
