import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Plus, LayoutGrid, List, Search, X } from "lucide-react-native";
import { ListingsIllustration } from "@/components/common/empty-illustrations";

import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListingFeed, type ListingFeedViewMode } from "@/components/common/ListingFeed";
import { listingsAPI, type Listing } from "@/api/listings";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { SellerListingCard } from "./my-listings/SellerListingCard";
import { useModeStore } from "@/stores/mode.store";
import { useAuthStore } from "@/stores/auth.store";

// "expired" is a virtual filter (active listings past their 30-day clock),
// resolved server-side — not a real status enum value.
type StatusFilter = "all" | Listing["status"] | "expired";
// SF-M1 (Sell Flow Redesign, docs/SELL_FLOW_REDESIGN.md §4.5/§10.1): "Reserved"
// is dropped as its own tab — a held listing now simply appears under Active
// with a hold badge, matching the "three presented states" model (Draft ·
// Live · Sold). The backend still returns a `reserved` status value and a
// `reserved` status-count field (untouched, §5.1's widen folds it into the
// Active tab's query) — this list just stops drawing a tab for it.
const STATUS_TABS: StatusFilter[] = ["all", "draft", "active", "expired", "sold"];

// Visual height of the FloatingTabBar above the safe-area inset:
// wrap paddingTop (8) + bar height (60). The bar's own paddingBottom is the
// safe-area inset, which we add separately. Keep in sync with FloatingTabBar.tsx.
const TAB_BAR_HEIGHT = 68;

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
//   Row 1 also ends with a "+" New-listing button (primary action).
//
// The category-chip filter row (ListingFiltersBar) is intentionally omitted
// from My Shop: filtering one's own inventory by category is rarely useful
// and was consuming ~110px of precious above-the-fold space.
// ListingFiltersBar.tsx is NOT modified — UserProfile.tsx keeps using it.

// SF-M1: `reserved` deliberately dropped — not rendered as its own tab
// anymore (see STATUS_TABS above). The API's status-counts response still
// includes it; this type just isn't asked to index it.
type StatusCounts = {
  all: number;
  draft: number;
  active: number;
  expired: number;
  sold: number;
};

interface CompactHeaderProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeTab: StatusFilter;
  onTabChange: (t: StatusFilter) => void;
  viewMode: ListingFeedViewMode;
  onViewModeChange: (m: ListingFeedViewMode) => void;
  onNewListing: () => void;
  totalCount?: number;
  statusCounts?: StatusCounts;
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
  onNewListing,
  totalCount,
  statusCounts,
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
            // QA (card #296/SF-QA1): the only handle on this field was its
            // TRANSLATED placeholder, so no Pashto/Dari flow could reach My
            // Shop's search at all — which is why the sell flow had no RTL
            // coverage on any screen behind it. The buyer feed's equivalent
            // has had `browse-search-input` all along; this one is named to
            // match. Additive, behaviour-neutral.
            testID="my-listings-search-input"
            accessibilityLabel={t("listing.searchPlaceholder")}
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
              testID="my-listings-search-clear"
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
            hitSlop={8}
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
            hitSlop={8}
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

        {/* New listing — primary action, in the toolbar row (always visible,
            normal layout flow). Icon + "New" label so it's obvious it creates a
            listing. Uses a PLAIN OBJECT style (not a function) — the grid/list
            toggle next to it does the same; the function form of `style` gets
            dropped by NativeWind here, leaving an invisible button. Explicit
            useColors() tokens → respects light/dark. */}
        <Pressable
          onPress={onNewListing}
          accessibilityRole="button"
          accessibilityLabel={t("listing.postListing")}
          android_ripple={{ color: colors.primaryForeground, borderless: false }}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            height: 38,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: colors.primary,
          }}
        >
          <Plus size={18} color={colors.primaryForeground} strokeWidth={2.5} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
            {t("listing.new")}
          </Text>
        </Pressable>
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
            // A horizontal scroller is ALREADY laid out right-to-left when
            // I18nManager.isRTL, so reversing its content container on top of that
            // flips it back: the first item lands at the far edge while the scroller
            // opens scrolled the other way. Same defect as CategoryChipRow (the
            // category chips the user reported as clipped at the border).
            height: 44,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab;
            const count = statusCounts?.[tab as keyof StatusCounts];
            const hasCount = count !== undefined;
            return (
              <Pressable
                key={tab}
                // Per-tab handle. The strip is a horizontal scroller and its later
                // tabs sit outside the viewport — "Sold" is not merely off-screen,
                // it is absent from the hierarchy — so a flow needs to scroll the
                // strip and then target one tab unambiguously. "All" as bare text
                // also collides with filter copy elsewhere on the screen.
                testID={`my-listings-status-${tab}`}
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
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 4,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={
                  hasCount
                    ? t("listing.filter.countA11y", {
                        label: t(`listing.filter.${tab}`),
                        count,
                      })
                    : t(`listing.filter.${tab}`)
                }
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
                {hasCount && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: isActive ? colors.primaryForeground : colors.mutedForeground,
                      opacity: isActive ? 0.85 : 0.7,
                    }}
                  >
                    {count}
                  </Text>
                )}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bottom padding so the list clears the floating tab bar: bar height + its
  // safe-area padding (insets.bottom, or 12 when there's no inset) + a 16px gap.
  const tabBarClearance = TAB_BAR_HEIGHT + (insets.bottom > 0 ? insets.bottom : 12) + 16;

  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ListingFeedViewMode>("list");
  const [refetchKey, setRefetchKey] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  // Per-status counts for the tab pills — fetched once and refreshed on focus
  // and after every lifecycle mutation that changes a listing's status.
  const { data: statusCounts } = useQuery({
    queryKey: ["myListingStatusCounts"],
    queryFn: listingsAPI.getMyListingStatusCounts,
    staleTime: 0,
  });

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Silent background refresh on focus so newly created / edited listings
  // appear immediately without a stale list, and the status-count pills stay
  // in sync. We guard against mode/auth so that this effect is a no-op when
  // MyListingsScreen is kept mounted but hidden in buyer mode (browse.tsx
  // renders it with display:"none" to prevent state-reset remounts).
  useFocusEffect(
    useCallback(() => {
      // Read store state directly (no subscription) — avoids stale closure and
      // prevents API calls when this screen is mounted-but-hidden in buyer mode.
      if (
        useModeStore.getState().mode !== "seller" ||
        !useAuthStore.getState().isAuthenticated
      ) return;
      setRefetchKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ["myListingStatusCounts"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const goToNewListing = useCallback(() => {
    router.push("/(main)/listing/new" as never);
  }, [router]);

  // Stable callbacks so ListingFeed's renderItem useCallback never changes its
  // reference between renders — an unstable renderListItem/onPressListing causes
  // FlashList to re-render all cells, unmounting Image components and producing
  // a visible blink every time the screen gains focus.
  const handleMutated = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const handlePressListing = useCallback(
    (item: Listing) => router.push(`/(main)/my-listings/${item.id}` as never),
    [router]
  );

  const renderSellerListItem = useCallback(
    ({ item }: { item: Listing }) => (
      <View style={{ paddingBottom: 16 }}>
        {/* viewMode was reaching the LIST (column count) but never the card, so
            the toggle appeared to do nothing but make the single column taller. */}
        <SellerListingCard listing={item} onMutated={handleMutated} viewMode={viewMode} />
      </View>
    ),
    // viewMode MUST be a dependency: without it this callback keeps the mode it
    // closed over and the rows never change when the seller taps the toggle —
    // the same "nothing happens" the prop was added to fix.
    [handleMutated, viewMode]
  );

  const ListHeader = (
    <CompactHeader
      search={search}
      onSearchChange={setSearch}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onNewListing={goToNewListing}
      totalCount={totalCount}
      statusCounts={statusCounts}
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
      {/* Header pinned ABOVE the feed — same pattern as Browse/Bazar. This keeps
          the search + filter row above the loading skeleton (not below it) and
          keeps the search Input mounted so the keyboard never drops mid-typing. */}
      {ListHeader}
      <ListingFeed
        id={`my-listings-${activeTab}-${debouncedSearch}-${viewMode}`}
        refreshKey={refetchKey}
        fetcher={fetcher}
        viewMode={viewMode}
        showStatus
        skeletonCount={3}
        onPressListing={handlePressListing}
        renderListItem={renderSellerListItem}
        emptyIcon={ShoppingBag}
        emptyIllustration={activeTab === "all" ? <ListingsIllustration size={96} /> : undefined}
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
            ? { label: t("listing.postListing"), onPress: goToNewListing }
            : undefined
        }
        // Clear the floating tab bar so the last card never hides behind it.
        contentPaddingBottom={tabBarClearance}
      />
    </ScreenContainer>
  );
}
