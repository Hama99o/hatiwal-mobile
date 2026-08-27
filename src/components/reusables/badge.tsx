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
        style={{
          color: textColorMap[variant],
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 14,
        }}
      >
        {String(label)}
      </Text>
    </View>
  );
}
