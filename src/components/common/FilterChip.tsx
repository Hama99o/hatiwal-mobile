import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { AnimatedPressable, useReduceMotion } from "@/lib/animation";

/**
 * FilterChip — the single, shared pill used by every horizontally-scrollable
 * filter row that toggles a value on/off (TASK-R517 dedup fix).
 *
 * Extracted out of the inline read-state (All/Unread/Read) and role
 * (Buying/Selling) chip blocks in `Conversations.tsx`, which were the 4th
 * copy-pasted chip pattern in the app (see `ConditionChips.tsx`,
 * `CategoryChipRow.tsx`, `ListingFiltersBar.tsx` — docs/REFACTOR_DUPLICATION.md).
 * Consolidating fixes three review items in one place:
 *  - 44pt minimum touch target, via a TRANSPARENT outer `AnimatedPressable`
 *    (`minHeight: 44`) wrapping a visually-compact inner pill — the tap area
 *    never has to grow the visible chip to a near-square lozenge.
 *  - Full accessibility: `accessibilityRole="button"` +
 *    `accessibilityState={{ selected }}` + `accessibilityLabel`.
 *  - `AnimatedPressable` (haptic + press-in/out scale) plus a selection-pop
 *    spring (1 → 1.06) on activation, mirroring `CategoryChipRow`'s
 *    `AnimatedChip` — no more bare, unanimated `Pressable` for a control that
 *    triggers a server round-trip.
 *
 * ONE active visual language for every chip built from this component —
 * translucent `primaryAlpha` fill + `primary` border/text — so no chip group
 * ever competes with the screen's higher-level primary action (e.g. the
 * Inbox/Archived tab toggle, which keeps the stronger solid `primary` fill to
 * itself).
 */
export interface FilterChipProps {
  label: string;
  /** Optional leading lucide icon (e.g. role chips: Store / ShoppingBag). */
  icon?: LucideIcon;
  /** Optional leading small dot instead of an icon (the "Unread" chip). */
  dot?: boolean;
  isActive: boolean;
  onPress: () => void;
  isRtl?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export function FilterChip({
  label,
  icon: Icon,
  dot,
  isActive,
  onPress,
  isRtl = false,
  testID,
  accessibilityLabel,
}: FilterChipProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withSpring(isActive ? 1.06 : 1, { damping: 14, stiffness: 260 });
  }, [isActive, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        haptic
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={accessibilityLabel ?? label}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 7,
            paddingHorizontal: 13,
            borderRadius: 999,
            borderWidth: 1,
            backgroundColor: isActive ? colors.primaryAlpha : colors.muted,
            borderColor: isActive ? colors.primary : "transparent",
          }}
        >
          {dot ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isActive ? colors.primary : colors.mutedForeground,
              }}
            />
          ) : null}
          {Icon ? (
            <Icon size={12} color={isActive ? colors.primary : colors.mutedForeground} />
          ) : null}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isActive ? colors.primary : colors.foreground,
            }}
          >
            {label}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
