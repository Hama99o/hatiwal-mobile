import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { SavedSearch } from "@/api/saved-searches";
import type { Category } from "@/api/categories";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryName } from "@/hooks/useCategoryName";
import { useReduceMotion } from "@/lib/animation";

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
  const reduceMotion = useReduceMotion();

  // Subtle entrance + low-amplitude scale pulse for the new-matches badge.
  // Gated by system reduce-motion: when enabled the badge appears statically.
  const badgeScale = useSharedValue(0.6);
  useEffect(() => {
    const hasNew = (search.newMatchesCount ?? 0) > 0;
    if (!hasNew) {
      cancelAnimation(badgeScale);
      badgeScale.value = 1;
      return;
    }
    if (reduceMotion) {
      badgeScale.value = 1;
      return;
    }
    // Entrance pop then subtle pulse
    badgeScale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 200 }),
        withTiming(1.06, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1,
      false
    );
  }, [badgeScale, search.newMatchesCount, reduceMotion]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

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

  const newCount = search.newMatchesCount ?? 0;

  return (
    <Pressable
      onPress={onPress}
      // Every chip shares this id; flows select the Nth with `index`. The only
      // other handle was the search's own name, which is user data.
      testID="saved-search-chip"
      android_ripple={{ color: colors.muted, borderless: false }}
      style={[
        styles.chip,
        {
          flexDirection:   isRtl ? "row-reverse" : "row",
          backgroundColor: colors.secondary,
          borderColor:     newCount > 0 ? colors.primary : colors.border,
          borderWidth:     newCount > 0 ? 1.5 : 1,
        },
      ]}
    >
      <Text
        style={[styles.label, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
        numberOfLines={1}
      >
        {summary || t("browse.savedSearch")}
      </Text>
      {newCount > 0 && (
        <Animated.View style={[isRtl ? styles.badgeRtl : styles.badge, badgeAnimatedStyle]}>
          <Badge
            label={t("browse.newMatches", { count: newCount })}
            variant="default"
          />
        </Animated.View>
      )}
      <Pressable
        onPress={onDelete}
        hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
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
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      20,
    maxWidth:          280,
    minHeight:         44,
  },
  label: {
    fontSize:   13,
    fontWeight: "500",
    flexShrink: 1,
    maxWidth:   180,
  },
  badge: {
    marginLeft: -2,
  },
  badgeRtl: {
    marginRight: -2,
  },
  deleteBtn: {
    padding: 4,
  },
});
