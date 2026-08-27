/**
 * BrowseHeader — search bar, category chips, saved searches.
 *
 * Rendered as the `ListHeaderComponent` of UniversalList so it scrolls with
 * the list. All state lives in Browse.tsx and is passed down as props.
 *
 * The filter controls used to live inline here as a collapsible panel; they
 * now live in the FilterSheet bottom-sheet modal (rendered by Browse.tsx),
 * opened via the Filter (Sliders) button below. This header only owns the
 * toggle button + its active/expanded visual state.
 */

import React from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import {
  Sliders,
  X,
  LayoutGrid,
  List,
  History,
} from "lucide-react-native";
import type { BrowseViewMode } from "@/stores/browseViewMode.store";
import { AnimatedPressable } from "@/lib/animation";

import { Text } from "@/components/reusables/text";
import { SearchBar } from "@/components/common/SearchBar";
import { CategoryChipRow } from "@/components/common/CategoryChipRow";
import { SavedSearches } from "@/components/common/SavedSearches";

import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useSearchHistoryStore } from "@/stores/searchHistory.store";
import type { Category } from "@/api/categories";
import type { SavedSearch } from "@/api/saved-searches";

interface BrowseHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  /** True while the filter bottom-sheet is open — drives the toggle button's active state. */
  showFilters: boolean;
  /** Opens the filter bottom-sheet (rendered by the parent Browse screen). */
  onToggleFilters: () => void;
  categories: Category[] | undefined;
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  onSelectSavedSearch: (search: SavedSearch) => void;
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

export function BrowseHeader({
  search,
  onSearchChange,
  showFilters,
  onToggleFilters,
  categories,
  categoryId,
  onCategoryChange,
  onSelectSavedSearch,
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
          {/* Search input — shared SearchBar (R15); SearchBar itself has no
              built-in debounce (fully controlled), debounce stays owned by
              Browse.tsx's existing 400ms useEffect before it re-fetches. */}
          <SearchBar
            value={search}
            onChangeText={onSearchChange}
            placeholder={t("browse.searchPlaceholder")}
            containerStyle={{ flex: 1 }}
            testID="browse-search-bar"
            // SearchBar exposes a clear-button handle; this call site never used it.
            clearTestID="browse-search-clear"
            inputTestID="browse-search-input"
          />

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
              // Locale-independent handle: the only other way in was the
              // translated accessibilityLabel.
              testID="browse-view-grid"
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
              // Locale-independent handle: the only other way in was the
              // translated accessibilityLabel.
              testID="browse-view-list"
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
            // Flows were targeting `id: "browse.filters"` — which is an i18n KEY
            // prefix (browse.filters.title), never a testID, so it could not
            // match anything. This is the real handle.
            testID="browse-filters-toggle"
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

        {/* ── Recent searches — shown when input is empty and history exists.
             Stays visible even when the filter panel is open (TASK fix: opening
             filters used to hide the buyer's search history entirely) — only
             hidden while actively typing a query. ── */}
        {search === "" && history.length > 0 && (
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
                      // A horizontal scroller is ALREADY laid out right-to-left when
                      // I18nManager.isRTL, so reversing its content container on top of that
                      // flips it back: the first item lands at the far edge while the scroller
                      // opens scrolled the other way. Same defect as CategoryChipRow (the
                      // category chips the user reported as clipped at the border).
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
            // Its accessibilityLabel is browse.clearAllFilters = "Clear all", and
            // browse.clearHistory is the SAME string, so text alone cannot tell the
            // filter chip from the search-history clear.
            testID="browse-clear-filters"
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
