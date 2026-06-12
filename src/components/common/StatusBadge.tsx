import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useColorScheme } from "nativewind";

export type ListingStatus = "draft" | "active" | "reserved" | "sold";

interface StatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";

  const bg = {
    draft: colors.muted,
    active: dark ? "rgba(20,83,45,0.9)" : "rgba(220,252,231,0.9)",
    reserved: dark ? "rgba(120,53,15,0.9)" : "rgba(254,243,199,0.9)",
    sold: colors.secondary,
  }[status];

  const textColor = {
    draft: colors.mutedForeground,
    active: dark ? "#86efac" : "#15803d",
    reserved: dark ? "#fcd34d" : "#92400e",
    sold: colors.secondaryForeground,
  }[status];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
      accessibilityRole="text"
    >
      <Text
        style={{ color: textColor, fontSize: 11, fontWeight: "600" }}
        numberOfLines={1}
      >
        {t(`listing.status.${status}`)}
      </Text>
    </View>
  );
}
