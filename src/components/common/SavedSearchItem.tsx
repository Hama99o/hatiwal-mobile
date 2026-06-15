import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/reusables/text";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
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

  const parts: string[] = [];
  if (search.locationBased && search.radius) {
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
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.muted, borderless: false }}
      style={[
        styles.chip,
        {
          flexDirection:   isRtl ? "row-reverse" : "row",
          backgroundColor: colors.secondary,
          borderColor:     colors.border,
        },
      ]}
    >
      <Text
        style={[styles.label, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
        numberOfLines={1}
      >
        {summary || t("browse.savedSearch")}
      </Text>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={styles.deleteBtn}
      >
        <X size={14} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems:      "center",
    gap:             8,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:    20,
    borderWidth:     1,
    maxWidth:        240,
  },
  label: {
    fontSize:   13,
    fontWeight: "500",
    flexShrink: 1,
    maxWidth:   180,
  },
  deleteBtn: {
    padding: 4,
  },
});
