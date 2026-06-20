import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/reusables/text";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { SavedSearch } from "@/api/saved-searches";
import type { Category } from "@/api/categories";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryName } from "@/hooks/useCategoryName";

interface SavedSearchItemProps {
  search: SavedSearch;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * Find a category by id across both top-level categories and their nested
 * subcategories (the /categories index returns top-level rows with subcategories
 * embedded), so a saved search on either level resolves to a localizable record.
 */
function findCategoryById(cats: Category[] | undefined, id: number): Category | undefined {
  if (!cats) return undefined;
  for (const c of cats) {
    if (c.id === id) return c;
    const sub = c.subcategories?.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

export function SavedSearchItem({ search, onPress, onDelete }: SavedSearchItemProps) {
  const colors = useColors();
  const { isRtl } = useLocalization();
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const getCategoryName = useCategoryName();

  // The saved search stores the category as a relation (categoryId). Resolve it
  // to the live category so the chip shows the name in the ACTIVE language —
  // falling back to the server's (English) categoryName snapshot if the category
  // isn't loaded yet or no longer exists.
  const matchedCategory =
    search.categoryId != null ? findCategoryById(categories, search.categoryId) : undefined;
  const categoryLabel = matchedCategory ? getCategoryName(matchedCategory) : search.categoryName;

  const parts: string[] = [];
  if (search.locationBased && search.radius) {
    parts.push(t("browse.withinRadius", { km: search.radius }));
  } else if (search.location) {
    parts.push(search.location);
  }
  if (categoryLabel) parts.push(categoryLabel);
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
        accessibilityRole="button"
        accessibilityLabel={t("common.delete")}
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
