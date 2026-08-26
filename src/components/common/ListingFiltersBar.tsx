/**
 * ListingFiltersBar — search bar + category chips + grid/list toggle.
 *
 * A shared header component used by UserProfile and MyListings as
 * their ListHeaderComponent, mirroring the BrowseHeader search + category
 * + toggle section but without the advanced filter panel.
 *
 * Layout (top to bottom):
 *   1. Search row: search icon + Input + clear X + grid/list toggle buttons
 *   2. Category chip row: horizontal ScrollView, "All" chip + category chips
 *
 * RTL: all flex rows use isRtl ? "row-reverse" : "row".
 * Colors: all from useColors(), no hardcoded hex.
 */

import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Search, X, LayoutGrid, List } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/reusables/input";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";
import type { Category } from "@/api/categories";
import type { ListingFeedViewMode } from "./ListingFeed";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ListingFiltersBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  categories?: Category[];
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  viewMode: ListingFeedViewMode;
  onViewModeChange: (mode: ListingFeedViewMode) => void;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingFiltersBar({
  search,
  onSearchChange,
  categories,
  categoryId,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  placeholder,
}: ListingFiltersBarProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const getCategoryName = useCategoryName();

  return (
    <>
    <View
      style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 8,
      }}
    >
      {/* ── Search bar row ─────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 8,
          gap: 8,
        }}
      >
        {/* Search input container */}
        <View
          style={{
            flex: 1,
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            backgroundColor: colors.muted,
            borderRadius: 12,
            paddingHorizontal: 12,
            gap: 8,
            minHeight: 44,
          }}
        >
          <Search size={16} color={colors.mutedForeground} />
          <Input
            value={search}
            onChangeText={onSearchChange}
            placeholder={placeholder ?? t("common.search")}
            returnKeyType="search"
            style={{
              flex: 1,
              fontSize: 14,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 0,
              paddingVertical: 0,
              minHeight: 0,
              textAlign: isRtl ? "right" : "left",
            }}
            placeholderTextColor={colors.mutedForeground}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => onSearchChange("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.clear")}
            >
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* View mode toggle: grid / list */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => onViewModeChange("grid")}
            style={{
              width: 38,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: viewMode === "grid" ? colors.primary : colors.muted,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.viewGrid")}
            accessibilityState={{ selected: viewMode === "grid" }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <LayoutGrid
              size={18}
              color={viewMode === "grid" ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => onViewModeChange("list")}
            style={{
              width: 38,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: viewMode === "list" ? colors.primary : colors.muted,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.viewList")}
            accessibilityState={{ selected: viewMode === "list" }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <List
              size={18}
              color={viewMode === "list" ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Category chip row ─────────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <View style={{ height: 48 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              gap: 8,
              alignItems: "center",
              // A horizontal scroller is ALREADY laid out right-to-left when
              // I18nManager.isRTL, so reversing its content container on top of that
              // flips it back: the first item lands at the far edge while the scroller
              // opens scrolled the other way. Same defect as CategoryChipRow (the
              // category chips the user reported as clipped at the border).
              height: 48,
            }}
          >
            {/* "All" chip */}
            <Pressable
              onPress={() => onCategoryChange(null)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                minHeight: 36,
                borderRadius: 20,
                borderWidth: 1.5,
                backgroundColor: categoryId === null ? colors.primary : colors.muted,
                borderColor: categoryId === null ? colors.primary : colors.border,
                justifyContent: "center",
                alignItems: "center",
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: categoryId === null }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: categoryId === null ? colors.primaryForeground : colors.mutedForeground,
                }}
              >
                {t("common.all")}
              </Text>
            </Pressable>

            {/* Category chips */}
            {categories.map((cat) => {
              const isActive = categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => onCategoryChange(cat.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    minHeight: 36,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    backgroundColor: isActive ? colors.primary : colors.muted,
                    borderColor: isActive ? colors.primary : colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: isRtl ? "row-reverse" : "row",
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  {cat.icon ? (
                    <Text style={{ fontSize: 13, marginEnd: 4 }}>{cat.icon}</Text>
                  ) : null}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isActive ? colors.primaryForeground : colors.mutedForeground,
                    }}
                  >
                    {getCategoryName(cat)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
    {/* Spacer between filter bar and listing grid — mirrors Browse's search-history gap */}
    <View style={{ height: 12, backgroundColor: colors.background }} />
    </>
  );
}
