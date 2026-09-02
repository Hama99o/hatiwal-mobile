/**
 * CategoryChipRow — horizontal scrollable chip row for category filtering.
 *
 * Extracted verbatim from the inline chip block inside BrowseHeader so both
 * Browse and any future screen that needs a category filter can reuse it.
 *
 * Props:
 *   categories  — array of top-level Category objects (usually from useCategories)
 *   selectedId  — currently active category id, or null for "All"
 *   onSelect    — called with the category id when a chip is pressed,
 *                 or null when the "All" chip is pressed
 *   isRtl       — flip the scroll direction for Pashto / Dari
 *
 * Uses Pressable (not Badge) to preserve the exact 44pt-minimum touch target
 * required by the mobile prompt rules. Colors come from useColors() so dark
 * mode works correctly at runtime.
 *
 * Each category chip prepends the category's emoji icon (when present) to the
 * leading side of the chip label. Spacing between icon and text uses
 * marginEnd (RTL-safe — always "after" in reading direction) rather than
 * marginRight. The "All" chip uses a neutral Lucide LayoutGrid icon.
 */

import React, { useEffect } from "react";
import { View, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { LayoutGrid } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import type { Category } from "@/api/categories";
import { useCategoryName } from "@/hooks/useCategoryName";
import { AnimatedPressable, useReduceMotion } from "@/lib/animation";

/**
 * AnimatedChip — wraps an AnimatedPressable child in a spring-scale Animated.View
 * that pops to 1.08 when the chip becomes active and returns to 1 when deselected.
 * The scale animation is suppressed when the system "Reduce Motion" setting is on.
 */
function AnimatedChip({
  isActive,
  children,
  style,
  onPress,
  haptic,
  accessibilityRole,
  accessibilityState,
}: {
  isActive: boolean;
  children: React.ReactNode;
  style?: object;
  onPress: () => void;
  haptic?: boolean;
  accessibilityRole?: "button";
  accessibilityState?: { selected?: boolean };
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withSpring(isActive ? 1.08 : 1, {
      damping: 12,
      stiffness: 280,
    });
  }, [isActive, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        haptic={haptic}
        style={style}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
}

export interface CategoryChipRowProps {
  categories: Category[] | undefined;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  isRtl: boolean;
}

export function CategoryChipRow({
  categories,
  selectedId,
  onSelect,
  isRtl,
}: CategoryChipRowProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const getCategoryName = useCategoryName();

  if (!categories || categories.length === 0) return null;

  return (
    <View
      style={{
        height: 56,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          // 16, not 12 — the same page gutter the search bar and the card grid use,
          // so the first chip lines up with them instead of sitting closer to the
          // screen edge than everything above and below it.
          paddingHorizontal: 16,
          gap: 8,
          alignItems: "center",
          // NO `row-reverse` here. A horizontal ScrollView is ALREADY laid out
          // right-to-left when I18nManager.isRTL is on, so reversing the content
          // container on top of that flips it back: the first chip ("All") ends up
          // at the far LEFT while an RTL scroller starts scrolled to the RIGHT — so
          // "ټول" was off-screen entirely and the row opened mid-list with a chip
          // sliced against the border. Reported from the device in Pashto.
          //
          // Note this applies to a horizontal SCROLLER's content container only. The
          // chips' own icon+label rows below still need isRtl row-reverse, because a
          // plain flex row does not flip itself.
          height: 56,
        }}
      >
        {/* "All" chip — minHeight:44 satisfies the 44pt touch target rule */}
        <AnimatedChip
          isActive={selectedId === null}
          onPress={() => onSelect(null)}
          haptic
          style={{
            paddingHorizontal: 16,
            paddingVertical: 11,
            minHeight: 44,
            borderRadius: 20,
            borderWidth: 1.5,
            backgroundColor: selectedId === null ? colors.primary : "transparent",
            borderColor: selectedId === null ? colors.primary : colors.border,
            justifyContent: "center",
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            // `gap`, not marginEnd on the icon: on a manually reversed row a
            // directional margin resolves from the WRITING direction, so the
            // space landed on the icon's OUTER edge and the icon and label
            // touched in ps/fa (owner report, 2026-09-02: "tags or chips were
            // touching the card").
            gap: 5,
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === null }}
        >
          <LayoutGrid
            size={14}
            color={
              selectedId === null ? colors.primaryForeground : colors.mutedForeground
            }
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color:
                selectedId === null
                  ? colors.primaryForeground
                  : colors.foreground,
            }}
          >
            {t("browse.all")}
          </Text>
        </AnimatedChip>

        {/* Category chips — emoji icon leading the localized name */}
        {categories.map((cat) => {
          const isActive = selectedId === cat.id;
          const chipColor = isActive ? colors.primaryForeground : colors.foreground;
          return (
            <AnimatedChip
              key={cat.id}
              isActive={isActive}
              onPress={() => onSelect(cat.id)}
              haptic
              style={{
                paddingHorizontal: 16,
                paddingVertical: 11,
                minHeight: 44,
                borderRadius: 20,
                borderWidth: 1.5,
                backgroundColor: isActive ? colors.primary : "transparent",
                borderColor: isActive ? colors.primary : colors.border,
                justifyContent: "center",
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                // See the "All" chip above — `gap`, never a directional margin.
                gap: 5,
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {cat.icon ? (
                <Text
                  style={{
                    fontSize: 14,
                  }}
                >
                  {cat.icon}
                </Text>
              ) : null}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: chipColor,
                }}
              >
                {getCategoryName(cat)}
              </Text>
            </AnimatedChip>
          );
        })}
      </ScrollView>
    </View>
  );
}
