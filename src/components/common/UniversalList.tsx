/**
 * UniversalList — the standard paginated-list wrapper for every list screen.
 *
 * Wraps @shopify/flash-list with:
 *   - Pull-to-refresh
 *   - Infinite scroll (Pagy pagination via page[number] / page[size])
 *   - Skeleton grid (loading state)
 *   - EmptyState (no data, or no search results)
 *   - Error + retry
 *   - RTL support
 *
 * Architecture note:
 *   ListHeaderComponent (which often contains a TextInput) is rendered ONCE in
 *   a stable outer container, ABOVE the body-swap zone. This prevents the header
 *   from being unmounted/remounted when the loading/error/empty/list branch
 *   changes — which would kill keyboard focus mid-typing.
 *
 *   For screens that need the header to scroll with the list (e.g. a small list
 *   with few items), the full-data path still passes ListHeaderComponent into
 *   FlashList so it scrolls naturally. The skeleton / error / empty paths render
 *   the header once outside the body, wrapped in a ScrollView — focus is
 *   preserved AND a header taller than the screen (e.g. an expanded filter
 *   panel with few/no results below it) stays fully reachable by scrolling.
 *
 * Usage:
 *   const config: UniversalListConfig<Listing> = {
 *     id: `buyer-browse-${refetchKey}`,
 *     fetcher: (query) => listingsAPI.getListings({ ...query }),
 *     keyExtractor: (item) => String(item.id),
 *     renderItem: ({ item, index }) => <ListingCard listing={item} index={index} />,
 *     numColumns: 2,
 *     emptyTitle: t('browse.empty.title'),
 *     emptyDescription: t('browse.empty.description'),
 *     emptyIcon: Search,
 *     skeletonCount: 6,
 *     SkeletonComponent: ListingCardSkeleton,
 *   };
 *   return <UniversalList config={config} />;
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { EmptyState } from "./EmptyState";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";
import { WifiOff, RotateCcw } from "lucide-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListQuery = {
  page: number;
  perPage: number;
  search?: string;
  /** Arbitrary extra filters that the screen passes through to the fetcher */
  [key: string]: unknown;
};

export type ListFetchResult<T> = {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}
type IconComponent = React.ComponentType<LucideIconProps>;

export interface UniversalListConfig<T> {
  /**
   * Unique id — changes only when filters or tabs change (needs a full reset
   * with skeleton). For silent background refreshes on focus use `refreshKey`.
   */
  id: string;

  /**
   * Bump this on useFocusEffect to silently refetch page 1 in the background
   * WITHOUT clearing items or showing a skeleton. Displayed data updates
   * smoothly when the new data arrives.
   */
  refreshKey?: number;

  /**
   * The data-fetching function. Must accept a ListQuery and return a
   * ListFetchResult. If it throws, the error state is shown.
   */
  fetcher: (query: ListQuery) => Promise<ListFetchResult<T>>;

  /**
   * Extract a stable key for each item (required by FlashList).
   */
  keyExtractor: (item: T, index: number) => string;

  /**
   * Render a single item. `index` is the item's position in the current
   * page — pass it to ListingCard for staggered entrance animation.
   */
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement | null;

  /** Number of columns in grid mode. Default: 1. */
  numColumns?: number;

  /** Items to show as skeleton cells while the first page is loading. */
  skeletonCount?: number;

  /**
   * A single skeleton cell component — rendered skeletonCount times in a grid
   * layout that mirrors renderItem.
   */
  SkeletonComponent?: React.ComponentType;

  /** Icon shown in EmptyState (fallback when emptyIllustration is not provided). */
  emptyIcon?: IconComponent;

  /**
   * Inline SVG illustration node for the EmptyState.
   * When provided, replaces the bare icon. Use components from
   * `src/components/common/empty-illustrations/`.
   */
  emptyIllustration?: React.ReactNode;

  /** Title in the EmptyState. */
  emptyTitle?: string;

  /** Description in the EmptyState. */
  emptyDescription?: string;

  /** Optional primary CTA in EmptyState (e.g. "Reset filters"). */
  emptyAction?: { label: string; onPress: () => void };

  /** Items per page. Default: 20. */
  perPage?: number;

  /**
   * Header rendered above the list (e.g. search bar, chips).
   *
   * IMPORTANT: This element is rendered in a STABLE outer View that is never
   * unmounted during loading/error/empty/list transitions. This means any
   * TextInput inside the header keeps keyboard focus as the body state changes.
   *
   * When the list has data, the header is also passed to FlashList as its
   * ListHeaderComponent so it scrolls with the items naturally.
   */
  ListHeaderComponent?: React.ReactElement | null;

  /** Content padding bottom. Default: 80. */
  contentPaddingBottom?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UniversalListProps<T> {
  config: UniversalListConfig<T>;
}

export function UniversalList<T>({ config }: UniversalListProps<T>) {
  const {
    id,
    refreshKey,
    fetcher,
    keyExtractor,
    renderItem,
    numColumns = 1,
    skeletonCount = 6,
    SkeletonComponent,
    emptyIcon,
    emptyIllustration,
    emptyTitle,
    emptyDescription,
    emptyAction,
    perPage = 20,
    ListHeaderComponent,
    contentPaddingBottom = 80,
  } = config;

  const colors = useColors();
  const { t } = useTranslation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track the config `id` — when it changes (refetchKey bump)
  // we reset to page 1.
  const idRef = useRef(id);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (page: number, reset = false) => {
      try {
        const query: ListQuery = { page, perPage };
        const result = await fetcher(query);

        if (reset) {
          setItems(result.items);
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }
        setTotalPages(result.totalPages);
        setCurrentPage(result.currentPage);
        setError(null);
      } catch (err) {
        // A 401 means the session ended (e.g. the user logged out) — the auth
        // layer handles the redirect, so don't log it or flash a list error.
        const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
        if (status === 401) return;
        console.error("[UniversalList] fetch error", err);
        setError(t("common.error"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, perPage]
  );

  // ── Initial load / config id change ────────────────────────────────────────
  // idLoadingRef is a ref (not state) that tracks whether loadFirst is running.
  // The refreshKey effect reads it to avoid a double-fetch race: on fast
  // networks the initial load can complete and set isLoading=false before the
  // refreshKey effect's closure sees the update, causing both effects to fire.
  // A ref is always the current value — no stale closure problem.
  const idLoadingRef = useRef(false);
  // Set when a refresh arrives while the initial load is still in flight —
  // otherwise that refresh is silently dropped (refreshKeyRef already marks it
  // "seen") and the list is stuck showing whatever the initial load returned
  // until the next focus bump. Consumed by loadFirst once it completes.
  const pendingRefreshRef = useRef(false);
  useEffect(() => {
    const loadFirst = async () => {
      idLoadingRef.current = true;  // synchronous — refreshKey effect reads this instantly
      setIsLoading(true);
      setItems([]);
      setCurrentPage(1);
      setTotalPages(1);
      setError(null);
      await fetchPage(1, true);
      idLoadingRef.current = false;
      setIsLoading(false);
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchPage(1, true).catch(() => {});
      }
    };

    idRef.current = id;
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Silent background refresh (useFocusEffect) ─────────────────────────────
  // refreshKey is bumped on screen focus. Unlike an id change, this keeps
  // the current items visible and simply re-fetches page 1 in the background,
  // then swaps in the fresh data once it arrives — no skeleton, no flicker.
  const refreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    // Skip the very first render (initial load already handled by id effect).
    if (refreshKey === refreshKeyRef.current) return;
    refreshKeyRef.current = refreshKey;
    if (refreshKey == null || refreshKey === 0) return;
    // Guard with idLoadingRef (a ref, always current) instead of the isLoading
    // state value (captured by closure, can be stale on fast networks).
    if (idLoadingRef.current) {
      // Initial load is still running — queue this refresh instead of
      // dropping it, so the list still picks up fresh data once it finishes.
      pendingRefreshRef.current = true;
      return;
    }
    fetchPage(1, true).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPage(1, true);
    setIsRefreshing(false);
  }, [fetchPage]);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  const handleEndReached = useCallback(async () => {
    if (isFetchingMore || isLoading || currentPage >= totalPages) return;
    setIsFetchingMore(true);
    await fetchPage(currentPage + 1, false);
    setIsFetchingMore(false);
  }, [isFetchingMore, isLoading, currentPage, totalPages, fetchPage]);

  // ── Skeleton grid ──────────────────────────────────────────────────────────
  // NOTE: The header is rendered OUTSIDE the body branches (skeleton/error/empty/list)
  // so it is never unmounted when loading state changes. A TextInput inside the
  // header keeps focus and the keyboard stays open while debounced search fires.
  //
  // For the full-data path the header is additionally passed to FlashList so it
  // scrolls naturally with the list items.

  const renderBody = () => {
    if (isLoading) {
      if (SkeletonComponent) {
        const skeletonItems = Array.from({ length: skeletonCount }, (_, i) => i);
        const cols = numColumns;

        const pairs: number[][] = [];
        for (let i = 0; i < skeletonItems.length; i += cols) {
          pairs.push(skeletonItems.slice(i, i + cols));
        }

        return (
          <View style={{ padding: 12, gap: 10 }}>
            {pairs.map((pair, pi) => (
              <View
                key={pi}
                style={{
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                {pair.map((i) => (
                  <View key={i} style={{ flex: 1 }}>
                    <SkeletonComponent />
                  </View>
                ))}
                {/* Fill empty cells in last row when odd count */}
                {pair.length < cols &&
                  Array.from({ length: cols - pair.length }, (_, j) => (
                    <View key={`empty-${j}`} style={{ flex: 1 }} />
                  ))}
              </View>
            ))}
          </View>
        );
      }

      // Fallback: spinner
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
            paddingVertical: 64,
            gap: 0,
          }}
        >
          {/* Icon bubble */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.destructiveAlpha,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <WifiOff size={36} color={colors.destructive} strokeWidth={1.5} />
          </View>

          {/* Heading */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.foreground,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {t("common.errorTitle")}
          </Text>

          {/* Subtext */}
          <Text
            style={{
              fontSize: 14,
              color: colors.mutedForeground,
              textAlign: "center",
              lineHeight: 21,
              marginBottom: 32,
            }}
          >
            {t("common.errorDescription")}
          </Text>

          {/* Retry button */}
          <Button variant="default" size="default" onPress={handleRefresh} style={{ paddingHorizontal: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <RotateCcw size={15} color={colors.primaryForeground} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {t("common.retry")}
              </Text>
            </View>
          </Button>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          illustration={emptyIllustration}
          icon={emptyIllustration ? undefined : (emptyIcon ?? RotateCcw)}
          title={emptyTitle ?? t("common.noResults")}
          description={emptyDescription}
          action={emptyAction}
        />
      );
    }

    // Full list — header passed to FlashList so it scrolls with items.
    // Wrap the header in a negative-margin View to counteract the 12px
    // paddingHorizontal of contentContainerStyle — headers should span the
    // full device width while list items still get the 12px outer padding.
    return (
      <FlashList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={numColumns}
        ListHeaderComponent={
          ListHeaderComponent
            ? <View style={{ marginHorizontal: -12 }}>{ListHeaderComponent}</View>
            : undefined
        }
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: contentPaddingBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // When loading/error/empty we render the header once in the stable outer
  // container, so the TextInput (search bar) is never unmounted.
  const showHeaderAboveBody = isLoading || !!error || items.length === 0;

  if (showHeaderAboveBody) {
    // The header (e.g. an expandable filter panel) can be taller than the
    // screen, especially when there are few/no results below it. A plain
    // View here has no way to reveal content that overflows the screen —
    // wrap in a ScrollView so the header + body are always fully reachable.
    // `contentContainerStyle={{ flexGrow: 1 }}` keeps the loading/error/empty
    // body's own `flex: 1` centering intact when everything fits on screen,
    // while still allowing the container to grow taller (and scroll) when it
    // doesn't. The FlashList data path below is untouched — it keeps scrolling
    // as its own virtualized list.
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {ListHeaderComponent}
        {renderBody()}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {renderBody()}
    </View>
  );
}
