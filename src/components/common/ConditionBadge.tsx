import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import type { ListingCondition } from "@/api/listings";

interface ConditionBadgeProps {
  condition: ListingCondition;
}

// Small neutral pill showing an item's condition (Brand new / Like new / …).
// Translated via `listing.condition.<key>`; reused on the detail screen and
// anywhere a listing's condition needs a compact label.
export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.muted,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
      accessibilityRole="text"
    >
      <Text
        style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "600" }}
        numberOfLines={1}
      >
        {t(`listing.condition.${condition}`)}
      </Text>
    </View>
  );
}
