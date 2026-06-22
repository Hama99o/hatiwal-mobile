/**
 * SubcategoryPanel — animated panel that slides in below a parent category card
 * showing its subcategories as horizontal scrollable chips.
 *
 * - "All in <Parent>" chip navigates to Browse filtered by the parent's id
 * - Each subcategory chip navigates to Browse filtered by that subcategory's id
 * - Chips use RNR Badge / Pressable; all colors via useColors(); RTL-safe
 */

import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { LayoutGrid } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";
import type { Category } from "@/api/categories";

interface SubcategoryPanelProps {
  parent: Category;
  onSelectParent: (cat: Category) => void;
  onSelectSubcategory: (cat: Category) => void;
}

export function SubcategoryPanel({
  parent,
  onSelectParent,
  onSelectSubcategory,
}: SubcategoryPanelProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const getCategoryName = useCategoryName();

  const subcategories = parent.subcategories ?? [];

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={{
        backgroundColor: colors.muted,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 4,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: isRtl ? "row-reverse" : "row",
          gap: 8,
          paddingHorizontal: 8,
          alignItems: "center",
        }}
      >
        {/* "All in <Parent>" chip */}
        <Pressable
          onPress={() => onSelectParent(parent)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: colors.primaryAlpha,
            minHeight: 44,
          }}
          accessibilityRole="button"
          accessibilityLabel={t("categories.allIn", { name: getCategoryName(parent) })}
        >
          <LayoutGrid size={13} color={colors.primary} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.primary,
            }}
          >
            {t("categories.allIn", { name: getCategoryName(parent) })}
          </Text>
        </Pressable>

        {/* Subcategory chips */}
        {subcategories.map((sub) => (
          <Pressable
            key={sub.id}
            onPress={() => onSelectSubcategory(sub)}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: colors.card,
              minHeight: 44,
            }}
            accessibilityRole="button"
            accessibilityLabel={getCategoryName(sub)}
          >
            {sub.icon ? (
              <Text style={{ fontSize: 14 }}>{sub.icon}</Text>
            ) : null}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.foreground,
              }}
            >
              {getCategoryName(sub)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
