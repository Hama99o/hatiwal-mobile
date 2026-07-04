/**
 * BrowseHeader — search bar, filter panel, category chips, saved searches.
 *
 * Rendered as the `ListHeaderComponent` of UniversalList so it scrolls with
 * the list. All state lives in Browse.tsx and is passed down as props.
 */

import React from "react";
import { View, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
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
  UserCheck,
  Navigation,
  TrendingDown,
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
  sort: ListingSort | null;
  onSortChange: (val: ListingSort | null) => void;
  /** True while the "Nearest" chip is acquiring the device's GPS location. */
  nearestLoading: boolean;
  /** Tapping the "Nearest" chip — parent acquires location, sets/clears sort=nearest, toasts on failure. */
  onToggleNearest: () => void;
  /** When non-null, only listings from sellers active within this many days are shown. */
  sellerActiveDays: number | null;
  onSellerActiveDaysChange: (val: number | null) => void;
  /** TASK-B384: true when the "Deals" (recent price-drop) chip is toggled on. */
  priceDropped: boolean;
  onTogglePriceDropped: () => void;
  viewMode: BrowseViewMode;
  onViewModeChange: (mode: BrowseViewMode) => void;
  /** Non-null when Browse is filtered to a specific subcategory (leaf node).
   *  Shown as a removable active-filter chip below the category chip row. */
  subcategoryLabel: string | null;
  onClearSubcategory: () => void;
  /** Total number of currently-active filters/sorts (0 when default Browse). */
  activeFilterCount: number;
  /** Resets every filter to its default in one tap. */
  onClearAllFilters: () => void;
}

const SORT_OPTIONS: { key: ListingSort; labelKey: string }[] = [
  { key: "newest",      labelKey: "browse.sort.newest" },
  { key: "oldest",      labelKey: "browse.sort.oldest" },
  { key: "price_asc",   labelKey: "browse.sort.priceAsc" },
  { key: "price_desc",  labelKey: "browse.sort.priceDesc" },
  { key: "most_viewed", labelKey: "browse.sort.mostViewed" },
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
  nearestLoading,
  onToggleNearest,
  sellerActiveDays,
  onSellerActiveDaysChange,
  priceDropped,
  onTogglePriceDropped,
  viewMode,
  onViewModeChange,
  subcategoryLabel,
  onClearSubcategory,
  activeFilterCount,
  onClearAllFilters,
}: BrowseHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  const history           = useSearchHistoryStore((s) => s.history);
  const removeFromHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory      = useSearchHistoryStore((s) => s.clear);

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
            accessibilityLabel={t("browse.filtersToggle")}
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
              {/* Horizontal scroll keeps all 5 pills readable at their
                  natural width — no flex-shrink, no multi-line truncation.
                  RTL: content wrapper uses row-reverse so the leading pill
                  (Newest first) stays on the start edge in ps/fa. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  gap: 8,
                  paddingHorizontal: 2,
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      // Toggle: tapping the active sort clears it (back to the
                      // default newest order), mirroring the condition chips.
                      onPress={() => onSortChange(isActive ? null : opt.key)}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 20,
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
                          fontSize: 13,
                          fontWeight: "600",
                          color: isActive ? colors.primaryForeground : colors.foreground,
                        }}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* "Nearest" chip — acquires the device's GPS location on tap
                    (via expo-location, see Browse.tsx `handleToggleNearest`)
                    instead of being a plain value like the pills above. */}
                <Pressable
                  onPress={onToggleNearest}
                  disabled={nearestLoading}
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    backgroundColor: sort === "nearest" ? colors.primary : "transparent",
                    borderColor: sort === "nearest" ? colors.primary : colors.border,
                    opacity: nearestLoading ? 0.7 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === "nearest", busy: nearestLoading }}
                  accessibilityLabel={t("browse.sort.nearest")}
                >
                  {nearestLoading ? (
                    <ActivityIndicator
                      size={13}
                      color={sort === "nearest" ? colors.primaryForeground : colors.mutedForeground}
                    />
                  ) : (
                    <Navigation
                      size={13}
                      color={sort === "nearest" ? colors.primaryForeground : colors.mutedForeground}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: sort === "nearest" ? colors.primaryForeground : colors.foreground,
                    }}
                  >
                    {nearestLoading ? t("browse.nearestLocationLoading") : t("browse.sort.nearest")}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Active sellers chip */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UserCheck size={14} color={colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                  }}
                >
                  {t("browse.sellerActivity")}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  onSellerActiveDaysChange(sellerActiveDays === 7 ? null : 7)
                }
                style={{
                  alignSelf: isRtl ? "flex-end" : "flex-start",
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor:
                    sellerActiveDays === 7 ? colors.primary : "transparent",
                  borderColor:
                    sellerActiveDays === 7 ? colors.primary : colors.border,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: sellerActiveDays === 7 }}
                accessibilityHint={t("browse.activeSellersHint")}
              >
                <UserCheck
                  size={14}
                  color={
                    sellerActiveDays === 7
                      ? colors.primaryForeground
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color:
                      sellerActiveDays === 7
                        ? colors.primaryForeground
                        : colors.foreground,
                  }}
                >
                  {t("browse.activeSellers")}
                </Text>
                {sellerActiveDays === 7 && (
                  <X size={12} color={colors.primaryForeground} />
                )}
              </Pressable>
            </View>

            {/* Deals chip — TASK-B384: toggles the recent price-drop filter */}
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TrendingDown size={14} color={colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.mutedForeground,
                  }}
                >
                  {t("browse.filters.dealsLabel")}
                </Text>
              </View>
              <Pressable
                onPress={onTogglePriceDropped}
                style={{
                  alignSelf: isRtl ? "flex-end" : "flex-start",
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor: priceDropped ? colors.primary : "transparent",
                  borderColor: priceDropped ? colors.primary : colors.border,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: priceDropped }}
                accessibilityHint={t("browse.filters.dealsHint")}
              >
                <TrendingDown
                  size={14}
                  color={priceDropped ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: priceDropped ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {t("browse.filters.deals")}
                </Text>
                {priceDropped && <X size={12} color={colors.primaryForeground} />}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ── Category chip row ─────────────────────────────────────────────
          The full categories hub is reached from the dedicated Categories tab
          in the bottom navbar, so no in-header "browse categories" button. */}
      <CategoryChipRow
        categories={categories}
        selectedId={categoryId}
        onSelect={onCategoryChange}
        isRtl={isRtl}
      />

      {/* ── Active subcategory filter chip ────────────────────────────────
          Shown only when Browse is narrowed to a specific subcategory (leaf).
          Displays the subcategory's English name (set via URL param from the
          Categories hub) and an X button to clear the narrowing. */}
      {subcategoryLabel !== null && (
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: colors.primaryAlpha,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.primary,
              }}
              numberOfLines={1}
            >
              {t("browse.subcategoryFilter", { name: subcategoryLabel })}
            </Text>
            <Pressable
              onPress={onClearSubcategory}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("browse.clearSubcategory")}
            >
              <X size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Active-filters summary pill ──────────────────────────────────
           Shown only when at least one filter/sort is non-default. Presents
           the total count and a one-tap "Clear all" affordance. RTL-safe. */}
      {activeFilterCount > 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Count pill */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: colors.primaryAlpha,
            }}
          >
            <Sliders size={13} color={colors.primary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.primary,
              }}
            >
              {t("browse.filtersActive", { count: activeFilterCount })}
            </Text>
          </View>

          {/* Clear all button */}
          <Pressable
            onPress={onClearAllFilters}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.clearAllFilters")}
          >
            <X size={14} color={colors.destructive} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.destructive,
              }}
            >
              {t("browse.clearAllFilters")}
            </Text>
          </Pressable>
        </Animated.View>
      )}

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
