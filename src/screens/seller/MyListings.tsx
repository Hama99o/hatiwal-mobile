import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { ShoppingBag, Plus, LayoutGrid, List, Search, X } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListingFeed, type ListingFeedViewMode } from "@/components/common/ListingFeed";
import { listingsAPI, type Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { SellerListingCard } from "./my-listings/SellerListingCard";

// "expired" is a virtual filter (active listings past their 30-day clock),
// resolved server-side — not a real status enum value.
type StatusFilter = "all" | Listing["status"] | "expired";
const STATUS_TABS: StatusFilter[] = ["all", "draft", "active", "expired", "reserved", "sold"];

// ─── Compact Header ───────────────────────────────────────────────────────────
//
// Layout (two rows, ~92px total):
//
//   Row 1 — Tool bar (~48px):
//     [count label]  [search input flex-1]  [grid|list toggle]
//
//   Row 2 — Status tabs (~44px):
//     [All] [Draft] [Active] [Expired] [Reserved] [Sold]
//
// The "Post a listing" action moves to a FAB (bottom-right).
// The category-chip filter row (ListingFiltersBar) is intentionally omitted
// from My Shop: filtering one's own inventory by category is rarely useful
// and was consuming ~110px of precious above-the-fold space.
// ListingFiltersBar.tsx is NOT modified — UserProfile.tsx keeps using it.

interface CompactHeaderProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: StatusFilter;
  onTabChange: (t: StatusFilter) => void;
  viewMode: ListingFeedViewMode;
  onViewModeChange: (m: ListingFeedViewMode) => void;
  totalCount?: number;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function CompactHeader({
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  totalCount,
  isRtl,
  colors,
  t,
}: CompactHeaderProps) {
  return (
    <View>
      {/* ── Row 1: count + search + view toggle ────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 6,
          gap: 8,
          minHeight: 52,
        }}
      >
        {/* Listing count — secondary identity label, keeps the tab feeling
            informative without needing a big title */}
        {totalCount !== undefined && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.mutedForeground,
              minWidth: 64,
              textAlign: isRtl ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {t("listing.shopCount", { count: totalCount })}
          </Text>
        )}

        {/* Search input */}
        <View
          style={{
            flex: 1,
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            backgroundColor: colors.muted,
            borderRadius: 10,
            paddingHorizontal: 10,
            gap: 6,
            height: 38,
          }}
        >
          <Search size={15} color={colors.mutedForeground} />
          <Input
            value={search}
            onChangeText={onSearchChange}
            placeholder={t("listing.searchPlaceholder")}
            returnKeyType="search"
            style={{
              flex: 1,
              fontSize: 13,
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
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Grid / list toggle — segmented control, compact */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => onViewModeChange("grid")}
            style={{
              width: 34,
              height: 38,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: viewMode === "grid" ? colors.primary : colors.muted,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.viewGrid")}
            accessibilityState={{ selected: viewMode === "grid" }}
          >
            <LayoutGrid
              size={16}
              color={viewMode === "grid" ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
          <Pressable
            onPress={() => onViewModeChange("list")}
            style={{
              width: 34,
              height: 38,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: viewMode === "list" ? colors.primary : colors.muted,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("browse.viewList")}
            accessibilityState={{ selected: viewMode === "list" }}
          >
            <List
              size={16}
              color={viewMode === "list" ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Row 2: status filter tabs ───────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          height: 44,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            gap: 6,
            alignItems: "center",
            flexDirection: isRtl ? "row-reverse" : "row",
            height: 44,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => onTabChange(tab)}
                android_ripple={{ color: colors.muted, borderless: true }}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 13,
                  paddingVertical: 6,
                  borderWidth: 1.5,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderColor: isActive ? colors.primary : colors.border,
                  minHeight: 30,
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isActive ? colors.primaryForeground : colors.mutedForeground,
                  }}
                >
                  {t(`listing.filter.${tab}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Spacer between header and listing feed */}
      <View style={{ height: 10, backgroundColor: colors.background }} />
    </View>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

interface FABProps {
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  label: string;
}

function PostListingFAB({ onPress, colors, label }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: 24,
        // We use a fixed offset from right; RTL mirrors are handled via
        // absolute position — FAB is always on the trailing corner.
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        // Elevation / shadow
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Plus size={24} color={colors.primaryForeground} strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ListingFeedViewMode>("list");
  const [refetchKey, setRefetchKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Bump refetchKey on focus — causes UniversalList to re-mount and re-fetch
  // so newly created / edited listings appear immediately without a stale list.
  useFocusEffect(
    useCallback(() => {
      setRefetchKey((k) => k + 1);
    }, [])
  );

  const ListHeader = (
    <CompactHeader
      search={search}
      onSearchChange={setSearch}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      totalCount={totalCount}
      isRtl={isRtl}
      colors={colors}
      t={t}
    />
  );

  const fetcher = useCallback(
    async (query: { page: number; perPage: number }) => {
      const result = await listingsAPI.getMyListings({
        pageNumber: query.page,
        pageSize: query.perPage,
        ...(activeTab !== "all" ? { status: activeTab } : {}),
        search: debouncedSearch || undefined,
      });
      // Capture total count for the count label on first page
      if (query.page === 1) {
        setTotalCount(result.pagination.totalCount);
      }
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, debouncedSearch]
  );

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <ListingFeed
        id={`my-listings-${activeTab}-${debouncedSearch}-${viewMode}`}
        refreshKey={refetchKey}
        fetcher={fetcher}
        viewMode={viewMode}
        showStatus
        skeletonCount={3}
        renderListItem={({ item }) => (
          <View style={{ paddingBottom: 16 }}>
            <SellerListingCard listing={item} />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        emptyIcon={ShoppingBag}
        emptyTitle={
          activeTab === "all"
            ? t("listing.emptyAll.title")
            : t("listing.emptyFiltered.title", { status: t(`listing.filter.${activeTab}`) })
        }
        emptyDescription={
          activeTab === "all"
            ? t("listing.emptyAll.description")
            : t("listing.emptyFiltered.description")
        }
        emptyAction={
          activeTab === "all"
            ? { label: t("listing.postListing"), onPress: () => router.push("/(main)/listing/new" as never) }
            : undefined
        }
        contentPaddingBottom={88}
      />

      {/* Floating action button — "Post a listing" */}
      <PostListingFAB
        onPress={() => router.push("/(main)/listing/new" as never)}
        colors={colors}
        label={t("listing.postListing")}
      />
    </ScreenContainer>
  );
}
