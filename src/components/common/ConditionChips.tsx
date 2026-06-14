import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { LISTING_CONDITIONS, type ListingCondition } from "@/api/listings";

interface ConditionChipsProps {
  value: ListingCondition | null;
  onChange: (next: ListingCondition | null) => void;
  // When true, tapping the selected chip clears it (filter use). When false,
  // one chip is always selected (form use).
  allowClear?: boolean;
}

// Reusable segmented chip row for picking an item's condition. Shared by the
// create/edit form (single required choice) and the Browse filter (clearable).
// Never hand-roll these chips elsewhere — import this component.
export function ConditionChips({ value, onChange, allowClear = false }: ConditionChipsProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {LISTING_CONDITIONS.map((c) => {
        const selected = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(allowClear && selected ? null : c)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primaryAlpha : colors.card,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(`listing.condition.${c}`)}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: selected ? "700" : "500",
                color: selected ? colors.primary : colors.foreground,
              }}
            >
              {t(`listing.condition.${c}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
