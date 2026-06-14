import React from "react";
import { TouchableOpacity } from "react-native";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import type { SavedSearch } from "@/api/saved-searches";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

interface SavedSearchItemProps {
  search: SavedSearch;
  onPress: () => void;
  onDelete: () => void;
}

export function SavedSearchItem({ search, onPress, onDelete }: SavedSearchItemProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const { t } = useTranslation();

  // Build filter summary
  const parts: string[] = [];
  if (search.locationBased && search.radius) {
    // Map-based search — show the radius rather than raw "lat, lng".
    parts.push(t("browse.withinRadius", { km: search.radius }));
  } else if (search.location) {
    parts.push(search.location);
  }
  if (search.categoryName) parts.push(search.categoryName);
  if (search.priceMin || search.priceMax) {
    const min = search.priceMin ? `${search.priceMin}` : "0";
    const max = search.priceMax ? `${search.priceMax}` : "∞";
    parts.push(`${min}-${max}`);
  }

  const summary = parts.join(" • ");

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.secondary,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        maxWidth: "85%",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: colors.foreground,
          flex: 1,
          textAlign: isRtl ? "right" : "left",
        }}
        numberOfLines={1}
      >
        {summary || t("browse.savedSearch")}
      </Text>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={8}
        style={{ padding: 4 }}
      >
        <X size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
