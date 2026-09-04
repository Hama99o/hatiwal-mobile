import React from "react";
import { View, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "secondary" | "muted";

interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  style?: ViewStyle;
  /**
   * Optional leading icon (TASK-R517: ConversationRow's Buying/Selling role
   * pill) — extends the shared component instead of forking a bespoke pill,
   * per the house rule ("extend the shared component, don't fork it").
   * Sized/colored to match the label text so callers never hand-roll icon
   * sizing per variant.
   */
  icon?: LucideIcon;
  /**
   * Handle for E2E taps and unit queries. Badges carry counts that flows and tests
   * genuinely need to read — the chat unread count above all — and asserting on the
   * bare number instead collides with prices, times and ids on the same screen.
   */
  testID?: string;
}

export function Badge({
  label,
  variant = "default",
  style,
  icon: Icon,
  testID,
}: BadgeProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();

  const backgroundMap: Record<BadgeVariant, string> = {
    default:     colors.primary,
    success:     colors.success,
    warning:     colors.warning,
    destructive: colors.destructive,
    secondary:   colors.secondary,
    muted:       colors.muted,
  };

  const textColorMap: Record<BadgeVariant, string> = {
    default:     colors.primaryForeground,
    success:     colors.successForeground,
    warning:     colors.warningForeground,
    destructive: colors.destructiveForeground,
    secondary:   colors.secondaryForeground,
    muted:       colors.mutedForeground,
  };

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: backgroundMap[variant],
          borderRadius: 999,
          minWidth: 20,
          height: 20,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingHorizontal: 6,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={11} color={textColorMap[variant]} /> : null}
      <Text
        // A BADGE IS ONE LINE, and the `height: 20` above says so. Without this
        // the label is free to wrap, and then the second line is CLIPPED by that
        // fixed height — the owner reported it as "the chips inside are touching
        // or hiding a little bit" (2026-09-04), seen at 360dp as a stock chip
        // reading "9 of 15 left" with "left" sliced off.
        //
        // It also fixes the cause, not just the symptom. Yoga sizes a flex item
        // by asking Text "how tall are you at width W?"; a wrappable Text answers
        // "28px, two lines", so a chip that does NOT fit in the row's remaining
        // space gets squeezed into it instead of being moved down — which is why
        // the parent's existing `flexWrap: "wrap"` (MyListingDetail.tsx:335,
        // SellerListingCard.tsx:262) looked like it was doing nothing. Pinned to
        // one line, Text reports its true single-line width, the chip no longer
        // fits, and flexWrap finally moves it to its own full-width line.
        //
        // `flexShrink` is the backstop for a label too long even on its own line
        // — it ellipsizes rather than overflowing the card. That matters most in
        // ps/fa, whose translations run wider than the English these widths were
        // eyeballed against, and for the widest label this app builds:
        // "13 available · 2 held for Ahmad".
        numberOfLines={1}
        style={{
          color: textColorMap[variant],
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 14,
          flexShrink: 1,
        }}
      >
        {String(label)}
      </Text>
    </View>
  );
}
