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
 *
 * Instant client-side search (no re-fetch, works offline):
 *   Add `filterItems: (items) => items.filter((i) => i.title.includes(term))`
 *   to the config. It runs on whatever `items` are already loaded, purely at
 *   render time — never bump `id`/`refreshKey` per keystroke for this, that
 *   re-hits the network and (while offline) would replace a perfectly good
 *   already-loaded list with the error state. See Conversations.tsx for a
 *   real example (TASK-Z684).
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";
import { useScrollToTop } from "@/hooks/useScrollToTop";
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
   * Bump this on useFocusEffect to silently refetch every page ALREADY
   * loaded (1..currentPage) in the background WITHOUT clearing items or
   * showing a skeleton. Displayed data updates smoothly when the new data
   * arrives, and no previously-loaded page is ever truncated away.
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
  /**
   * Distance from the bottom for the back-to-top button. Defaults to
   * clearing the floating tab bar; pass a smaller value on a pushed route
   * that has no tab bar. Set `showScrollToTop: false` to opt out entirely.
   */
  scrollToTopBottomOffset?: number;
  showScrollToTop?: boolean;

  /**
   * Optional pure client-side filter applied to whatever `items` are
   * currently loaded in memory, evaluated at render time. Use this for
   * instant list-level search (e.g. Conversations, TASK-Z684) instead of
   * bumping `refreshKey`/`id` on every keystroke — that would re-hit the
   * network on every debounce tick and, while offline, swap a perfectly
   * good already-loaded list for the error state. `filterItems` never
   * triggers a fetch; it only narrows what's rendered from the already
   * fetched `items`, so typing is instant and works offline.
   */
  filterItems?: (items: T[]) => T[];

  /**
   * Called whenever the loaded pagination state changes (after every
   * successful fetch). Lets the caller know whether MORE pages exist beyond
   * what's currently loaded (`currentPage < totalPages`) — e.g. so a
   * client-side `filterItems` search (TASK-Z684) can warn "no matches" is
   * scoped to what's loaded so far, not the caller's entire server-side
   * dataset, instead of showing a flatly false "no matches at all".
   */
  onPageInfoChange?: (info: { currentPage: number; totalPages: number }) => void;
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
    scrollToTopBottomOffset,
    showScrollToTop = true,
    filterItems,
    onPageInfoChange,
  } = config;

  const colors = useColors();
  const { t } = useTranslation();
  // Back-to-top lives here, once, rather than in each list screen.
  const {
    ref: listRef,
    visible: showTopButton,
    onScroll: handleScrollForTopButton,
    scrollToTop,
  } = useScrollToTop<FlashListRef<T>>();

  // ── Data (React Query) ─────────────────────────────────────────────────────
  //
  // WHY THIS IS A QUERY AND NOT `useState` ANY MORE.
  //
  // Every list in the app is this component, and its pages used to live in
  // component state. State dies with the component, so leaving a screen and
  // coming back threw away everything that had been fetched — the list
  // remounted, `isLoading` went true, the skeleton came back and every page
  // the user had scrolled for was requested again. The owner's report:
  // "each time when I come to my shop, it recall it... this is very bad user
  // experience". CLAUDE.md has required React Query for server data all along
  // ("cached data must never be lost on navigation"); this component was the
  // one that never got it.
  //
  // `useInfiniteQuery` is a near-exact fit for what was hand-rolled here, and
  // replacing it deletes four pieces of machinery rather than adding any:
  //
  //   * the stale-response guard (`requestIdRef`) — React Query already drops
  //     results from superseded fetches;
  //   * `refreshLoadedPages`, which re-fetched every loaded page in bounded
  //     batches so a focus refresh could not truncate the list back to page 1 —
  //     `refetch()` refetches exactly the loaded pages, by design;
  //   * the `pendingRefreshRef` / `idLoadingRef` dance that queued a refresh
  //     arriving mid-initial-load — the query layer dedupes and sequences;
  //   * `loadedPageRef`'s synchronous page RESERVATION, which existed because
  //     `currentPage` state commits a render late and a stale closure could
  //     re-request the same page — the next page param now comes from the last
  //     resolved page instead. NOTE the burst guard below is a different
  //     problem and is still needed: `fetchNextPage` is NOT de-bursted by the
  //     query layer.
  //
  // The keyed cache is what fixes the bug: `id` already changes only when
  // filters or tabs change, so it is exactly the right cache key. Returning to
  // a list you have seen renders from cache on the first frame and revalidates
  // behind it.
  const queryKey = useMemo(() => ["universalList", id] as const, [id]);

  const {
    data,
    error: queryError,
    isPending,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetcher({ page: pageParam, perPage }),
    initialPageParam: 1,
    getNextPageParam: (last: ListFetchResult<T>) =>
      last.currentPage < last.totalPages ? last.currentPage + 1 : undefined,
    // Focus already drives an explicit refresh through `refreshKey`; this keeps
    // a remount inside that window from firing a second identical request.
    // Cached pages still render INSTANTLY once stale — staleTime only decides
    // whether to revalidate behind them, never whether to show them.
    staleTime: 30_000,
    // How long the pages survive with nobody looking at them. The default is 5
    // minutes, which is the difference between "I came back to My Shop and it
    // was there" and "I came back after a chat and it reloaded from scratch" —
    // the exact complaint this change exists to fix. 30 minutes covers a
    // realistic session of moving between tabs without pinning memory
    // indefinitely: entries are dropped on a normal LRU once unobserved.
    gcTime: 30 * 60_000,
  });

  const pages = data?.pages ?? [];
  const items = useMemo(
    () => pages.flatMap((pg) => pg.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const lastPage = pages[pages.length - 1];
  const currentPage = lastPage?.currentPage ?? 1;
  const totalPages = lastPage?.totalPages ?? 1;

  // `isPending` is true ONLY with no cached data, which is precisely when a
  // skeleton is the right answer. A revalidation behind cached pages must not
  // show one — that flicker is the thing being fixed.
  const isLoading = isPending;
  const isFetchingMore = isFetchingNextPage;
  const isRefreshing = isRefetching && !isFetchingNextPage;

  // A 401 means the session ended; the auth layer redirects, so it is not a
  // list error. And a failure behind an already-usable list must never blank
  // it — both rules are carried over from the code this replaced.
  const errorStatus = (queryError as { response?: { status?: number } } | null)
    ?.response?.status;
  const error =
    queryError && errorStatus !== 401 && items.length === 0 ? t("common.error") : null;

  useEffect(() => {
    if (!queryError || errorStatus === 401) return;
    // warn, not error: `console.error` raises a full-screen LogBox in dev,
    // which covers the very error state rendered below (and, on a background
    // failure, replaces a perfectly usable list). Seen on device.
    console.warn("[UniversalList] fetch error", queryError);
  }, [queryError, errorStatus]);

  // ── Silent background refresh (useFocusEffect) ─────────────────────────────
  // `refreshKey` is bumped on screen focus. `refetch()` re-runs every page
  // already loaded and swaps the result in without clearing — no skeleton, no
  // flicker, and no truncation of pages the user scrolled to load.
  const refreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === refreshKeyRef.current) return;
    refreshKeyRef.current = refreshKey;
    if (refreshKey == null || refreshKey === 0) return;
    refetch().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    refetch().catch(() => {});
  }, [refetch]);

  // ── Client-side filter (e.g. instant search) ───────────────────────────────
  // Applied to whatever `items` are already loaded, purely at render time —
  // never triggers a fetch. See `filterItems` JSDoc on UniversalListConfig.
  const visibleItems = filterItems ? filterItems(items) : items;

  // ── Report loaded pagination state to the caller ───────────────────────────
  // Lets a screen with `filterItems` (e.g. Conversations, TASK-Z684) tell the
  // difference between "truly no matches anywhere" and "no matches in what's
  // loaded so far, but more pages exist" — see `onPageInfoChange` JSDoc.
  useEffect(() => {
    onPageInfoChange?.({ currentPage, totalPages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  // The SYNCHRONOUS ref stays, and it is load-bearing. Moving to
  // `useInfiniteQuery` removed the need to compute the next page number by hand
  // (that comes from the last RESOLVED page now, so a stale closure can no
  // longer re-request a page and append duplicate rows), but it does NOT
  // de-burst `onEndReached`.
  //
  // Measured, not assumed: guarding on `isFetchingNextPage` alone turned the
  // existing burst test from 2 fetcher calls into 4. That flag is React state
  // and commits a render late, so every call in a synchronous burst reads it as
  // false and fires its own `fetchNextPage`. The ref is written before the
  // request starts, so every call after the first is rejected immediately.
  //
  // FlashList/FlatList firing `onEndReached` in a burst is the well-known quirk
  // this defends against; the original comment here was right and the removal
  // was mine to undo.
  const fetchingMoreRef = useRef(false);
  const handleEndReached = useCallback(() => {
    if (fetchingMoreRef.current || !hasNextPage || isFetchingNextPage || isLoading) return;
    fetchingMoreRef.current = true;
    fetchNextPage()
      .catch(() => {})
      .finally(() => {
        fetchingMoreRef.current = false;
      });
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // ── Auto-continue when a filtered/narrowed view is empty but more pages
  //    exist (HIGH review fix) ────────────────────────────────────────────
  // Previously, `visibleItems.length === 0` always rendered `EmptyState`
  // (see `renderBody` below), which UNMOUNTS the FlashList entirely — so
  // `onEndReached` could never fire again. That made two real scenarios a
  // permanent dead end: (a) a fetcher-side filter (e.g. Conversations'
  // read/unread split) whose only match sits on an unloaded page — page 1
  // comes back with zero rows even though the server has more pages, and
  // the screen shows a flatly wrong "All caught up!"; (b) a `filterItems`
  // search term with no matches among what's loaded so far, where the only
  // recovery offered was "Clear search", never "keep looking". This walks
  // forward through the ALREADY-KNOWN remaining pages automatically —
  // bounded by `totalPages`, so it can never loop forever — until either a
  // visible item appears or the server-reported pages are exhausted.
  useEffect(() => {
    if (isLoading || error) return;
    if (visibleItems.length > 0) return;
    if (currentPage >= totalPages) return;
    handleEndReached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, visibleItems.length, currentPage, totalPages]);

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

        // Fallback: a generic ROW skeleton, not a spinner.
        //
        // A bare spinner on a blank screen tells the user nothing about what is
        // coming, and it reads as "stuck" rather than "loading" — the user called
        // this out on the feed. Every list that passes a Skeleton renders shaped
        // placeholders (Browse, Saved, Conversations, Categories, Recently viewed,
        // Hidden, Reviews); the ones that do not (My reports, All reviews, Blocked
        // users, listing conversations, a user's profile) landed here and got the
        // spinner. Give them a neutral row skeleton so the shape of the page is
        // visible while it loads.
        return (
          <View
            testID="universal-list-fallback-skeleton"
            style={{ flex: 1, paddingHorizontal: 4, paddingTop: 8 }}
          >
            {Array.from({ length: Math.max(4, skeletonCount) }, (_, i) => (
              <View
                key={i}
                style={{
                  height: 64,
                  borderRadius: 12,
                  marginBottom: 10,
                  backgroundColor: colors.muted,
                }}
              />
            ))}
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

    if (visibleItems.length === 0) {
      // More pages exist beyond what's loaded so far (see the auto-continue
      // effect above, which is already fetching the next one) — a terminal
      // "no results" EmptyState here would be misleadingly final (and, for a
      // fetcher-side filter like Conversations' unread split, flatly WRONG:
      // the match could be sitting on the very next page). Show a spinner
      // instead of giving up.
      if (currentPage < totalPages) {
        return (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      }
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
        ref={listRef}
        onScroll={handleScrollForTopButton}
        // 16ms would fire every frame; 100ms is still well inside the time it
        // takes to scroll past the threshold, and keeps long lists smooth.
        scrollEventThrottle={100}
        data={visibleItems}
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
        // A TextInput can live in `ListHeaderComponent` (e.g. a search bar,
        // TASK-Z684) — without these, tapping a row while the keyboard is up
        // eats the FIRST tap just to dismiss the keyboard, and dragging the
        // list doesn't dismiss it at all.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    );
  };

  // When loading/error/empty we render the header once in the stable outer
  // container, so the TextInput (search bar) is never unmounted.
  // Uses `visibleItems` (post-filter) so a search term with no matches still
  // shows the stable-header empty-state path, not the FlashList data path.
  const showHeaderAboveBody = isLoading || !!error || visibleItems.length === 0;

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
      {showScrollToTop && (
        <ScrollToTopButton
          visible={showTopButton}
          onPress={scrollToTop}
          bottomOffset={scrollToTopBottomOffset}
        />
      )}
    </View>
  );
}
