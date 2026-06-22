import React from "react";
import { View, type ViewStyle } from "react-native";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "secondary" | "muted";

interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = "default", style }: BadgeProps) {
  const colors = useColors();

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
      style={[
        {
          backgroundColor: backgroundMap[variant],
          borderRadius: 999,
          minWidth: 20,
          height: 20,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
        },
        style,
      ]}
    >
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
