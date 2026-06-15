/**
 * BrowseHeader — search bar, filter panel, category chips, saved searches.
 *
 * Rendered as the `ListHeaderComponent` of UniversalList so it scrolls with
 * the list. All state lives in Browse.tsx and is passed down as props.
 */

import React from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import {
  Sliders,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  ArrowUpDown,
  LayoutGrid,
  List,
  History,
} from "lucide-react-native";
import type { BrowseViewMode } from "@/stores/browseViewMode.store";
import { AnimatedPressable } from "@/lib/animation";

import { Input } from "@/components/reusables/input";
import { Text } from "@/components/reusables/text";
import { ConditionChips } from "@/components/common/ConditionChips";
import { CategoryChipRow } from "@/components/common/CategoryChipRow";
import { SavedSearches } from "@/components/common/SavedSearches";

import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useSearchHistoryStore } from "@/stores/searchHistory.store";
import type { Category } from "@/api/categories";
import type { ListingCondition, ListingSort } from "@/api/listings";
import type { SavedSearch } from "@/api/saved-searches";
import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";

interface BrowseHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  coordinates: MapCanvasCoords | null;
  distance: number;
  /** City/text location label — displayed when coordinates are set */
  location: string | null;
  priceMin: string;
  priceMax: string;
  condition: ListingCondition | null;
  onOpenLocationPicker: () => void;
  onClearLocation: () => void;
  onPriceMinChange: (val: string) => void;
  onPriceMaxChange: (val: string) => void;
  onConditionChange: (val: ListingCondition | null) => void;
  categories: Category[] | undefined;
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  onSelectSavedSearch: (search: SavedSearch) => void;
  sort: ListingSort;
  onSortChange: (val: ListingSort) => void;
  viewMode: BrowseViewMode;
  onViewModeChange: (mode: BrowseViewMode) => void;
}

const SORT_OPTIONS: { key: ListingSort; labelKey: string }[] = [
  { key: "newest",     labelKey: "browse.sort.newest" },
  { key: "oldest",     labelKey: "browse.sort.oldest" },
  { key: "price_asc",  labelKey: "browse.sort.priceAsc" },
  { key: "price_desc", labelKey: "browse.sort.priceDesc" },
];

export function BrowseHeader({
  search,
  onSearchChange,
  showFilters,
  onToggleFilters,
  coordinates,
  distance,
  location: locationLabel,
  priceMin,
  priceMax,
  condition,
  onOpenLocationPicker,
  onClearLocation,
  onPriceMinChange,
  onPriceMaxChange,
  onConditionChange,
  categories,
  categoryId,
  onCategoryChange,
  onSelectSavedSearch,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: BrowseHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  const history        = useSearchHistoryStore((s) => s.history);
  const removeFromHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory   = useSearchHistoryStore((s) => s.clear);

  return (
    <View style={{ marginBottom: 4 }}>
      {/* ── Search bar row ─────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
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
              placeholder={t("browse.searchPlaceholder")}
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
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(140)}
              >
                <AnimatedPressable
                  onPress={() => onSearchChange("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.clear")}
                  haptic
                >
                  <X size={16} color={colors.mutedForeground} />
                </AnimatedPressable>
              </Animated.View>
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

          {/* Filter toggle */}
          <AnimatedPressable
            onPress={onToggleFilters}
            haptic
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: showFilters ? colors.primary : colors.muted,
              justifyContent: "center",
              alignItems: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.filters")}
            accessibilityState={{ expanded: showFilters }}
          >
            <Sliders
              size={20}
              color={
                showFilters ? colors.primaryForeground : colors.mutedForeground
              }
            />
          </AnimatedPressable>
        </View>

        {/* ── Recent searches — shown when input is empty and history exists ── */}
        {!showFilters && search === "" && history.length > 0 && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 10,
            }}
          >
            <View
              style={{
                flexDirection:  isRtl ? "row-reverse" : "row",
                alignItems:     "center",
                justifyContent: "space-between",
                marginBottom:   8,
              }}
            >
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 5 }}>
                <History size={13} color={colors.mutedForeground} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>
                  {t("browse.recentSearches")}
                </Text>
              </View>
              <Pressable
                onPress={clearHistory}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 12, color: colors.primary }}>
                  {t("browse.clearHistory")}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {history.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => onSearchChange(term)}
                  style={[
                    historyStyles.chip,
                    {
                      flexDirection:   isRtl ? "row-reverse" : "row",
                      paddingLeft:     isRtl ? 6 : 12,
                      paddingRight:    isRtl ? 12 : 6,
                      backgroundColor: colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[historyStyles.label, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {term}
                  </Text>
                  <Pressable
                    onPress={() => removeFromHistory(term)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={historyStyles.deleteBtn}
                  >
                    <X size={12} color={colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Filter panel (collapsible) ─────────────────────────────── */}
        {showFilters && (
          <View
            style={{
              gap: 12,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {/* Location & range */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("browse.location")}
              </Text>
              <Pressable
                onPress={onOpenLocationPicker}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                }}
                accessibilityRole="button"
              >
                <MapPin
                  size={18}
                  color={
                    coordinates ? colors.primary : colors.mutedForeground
                  }
                />
                <View style={{ flex: 1 }}>
                  {coordinates ? (
                    <>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.foreground,
                          textAlign: isRtl ? "right" : "left",
                        }}
                      >
                        {t("browse.withinRadius", { km: distance })}
                      </Text>
                      {locationLabel ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                            textAlign: isRtl ? "right" : "left",
                          }}
                          numberOfLines={1}
                        >
                          {locationLabel}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.mutedForeground,
                        textAlign: isRtl ? "right" : "left",
                      }}
                    >
                      {t("browse.setLocationRange")}
                    </Text>
                  )}
                </View>
                {coordinates ? (
                  <Pressable
                    onPress={onClearLocation}
                    hitSlop={10}
                    style={{ padding: 2 }}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.clear")}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.primary,
                      }}
                    >
                      {t("common.clear")}
                    </Text>
                  </Pressable>
                ) : isRtl ? (
                  <ChevronLeft size={18} color={colors.mutedForeground} />
                ) : (
                  <ChevronRight size={18} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>

            {/* Price range */}
            <View
              style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 10 }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
                  {t("browse.priceMin")}
                </Text>
                <Input
                  value={priceMin}
                  onChangeText={onPriceMinChange}
                  placeholder="0"
                  keyboardType="numeric"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
                  {t("browse.priceMax")}
                </Text>
                <Input
                  value={priceMax}
                  onChangeText={onPriceMaxChange}
                  placeholder="∞"
                  keyboardType="numeric"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />
              </View>
            </View>

            {/* Condition */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("listing.condition.label")}
              </Text>
              <ConditionChips
                value={condition}
                onChange={onConditionChange}
                allowClear
              />
            </View>

            {/* Sort */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ArrowUpDown size={14} color={colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                  }}
                >
                  {t("browse.sort.label")}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  gap: 8,
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => onSortChange(opt.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        paddingHorizontal: 6,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        backgroundColor: isActive ? colors.primary : "transparent",
                        borderColor: isActive ? colors.primary : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: isActive ? colors.primaryForeground : colors.foreground,
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Category chip row ──────────────────────────────────────────── */}
      <CategoryChipRow
        categories={categories}
        selectedId={categoryId}
        onSelect={onCategoryChange}
        isRtl={isRtl}
      />

      {/* ── Saved searches ─────────────────────────────────────────────── */}
      <SavedSearches onSelectSearch={onSelectSavedSearch} />
    </View>
  );
}

const historyStyles = StyleSheet.create({
  chip: {
    alignItems:      "center",
    gap:             6,
    borderRadius:    20,
    paddingVertical: 6,
  },
  label: {
    fontSize:   13,
    flexShrink: 1,
    maxWidth:   140,
  },
  deleteBtn: {
    padding: 2,
  },
});
