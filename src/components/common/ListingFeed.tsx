/**
 * ListingFeed — the ONE place where listing-card rendering lives.
 *
 * Used by Browse, MyListings, and UserProfile so that grid/list layout,
 * spacing, skeleton selection are identical everywhere. No screen should
 * render ListingCard directly inside its own renderItem — delegate here.
 *
 * Controlled view mode:
 *   Pass `viewMode` (required). The toggle UI lives in the screen's own
 *   ListHeaderComponent (e.g. BrowseHeader, ListingFiltersBar).
 *
 * Custom list-mode card:
 *   Pass `renderListItem` to override the default ListingCard list variant.
 *   Used by MyListings to show SellerListingCard (with action buttons) in
 *   list mode while grid mode still shows the standard compact ListingCard.
 */

import React, { useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";
import { useRouter } from "expo-router";

import { ListingCard } from "./ListingCard";
import { ListingCardSkeleton, ListingCardListSkeleton } from "./ListingCardSkeleton";
import {
  UniversalList,
  type ListQuery,
  type ListFetchResult,
  type UniversalListConfig,
} from "./UniversalList";
import type { Listing } from "@/api/listings";

export type ListingFeedViewMode = "grid" | "list";

// ── ListingFeed ────────────────────────────────────────────────────────────────

export interface ListingFeedProps {
  /**
   * Unique id — must change when filters change to trigger a full re-mount.
   * Include viewMode in this id if the fetcher result differs by view mode.
   * Usually: id={`screen-name-${filterKey}-${viewMode}`}
   */
  id: string;

  /** Bump on useFocusEffect for a silent background re-fetch. */
  refreshKey?: number;

  /** The data-fetching function — must return paginated Listing results. */
  fetcher: (query: ListQuery) => Promise<ListFetchResult<Listing>>;

  // ── View mode ──────────────────────────────────────────────────────────────

  /** Current view mode (controlled by parent). The toggle UI lives in the screen's ListHeaderComponent. */
  viewMode: ListingFeedViewMode;

  // ── Card customization ─────────────────────────────────────────────────────

  /** Show StatusBadge on cards (useful for seller views). */
  showStatus?: boolean;

  /**
   * Optimistic save state — keyed by listing id.
   * When provided, the heart icon is shown on cards.
   */
  savedMap?: Record<number, boolean>;

  /** Called when the user taps the heart on a card. */
  onSaveToggle?: (listingId: number, newValue: boolean) => void;

  /**
   * "Not interested" — when provided, cards expose a long-press action menu
   * that dismisses the listing from the current user's own feed.
   */
  onHide?: (listingId: number) => void;

  /** Called when the user taps a card. Defaults to routing to listing detail. */
  onPressListing?: (listing: Listing) => void;

  /**
   * Override the list-mode card rendering.
   * Use this to inject SellerListingCard (with action buttons) in list mode
   * while grid mode still shows the standard compact ListingCard.
   */
  renderListItem?: (info: ListRenderItemInfo<Listing>) => React.ReactElement | null;

  // ── UniversalList passthrough ──────────────────────────────────────────────

  /** Number of skeleton cells while loading. Default: 6. */
  skeletonCount?: number;

  /**
   * Header rendered above the list (e.g. search bar, profile header, tabs).
   * Stable across loading/error/empty transitions — TextInput stays focused.
   */
  ListHeaderComponent?: React.ReactElement | null;

  emptyIcon?: React.ComponentType<{ size?: number; color?: string }>;
  /**
   * Inline SVG illustration node for the EmptyState.
   * When provided, replaces the bare icon. Use components from
   * `src/components/common/empty-illustrations/`.
   */
  emptyIllustration?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onPress: () => void };

  contentPaddingBottom?: number;
  perPage?: number;
}

export function ListingFeed({
  id,
  refreshKey,
  fetcher,
  viewMode,
  showStatus = false,
  savedMap,
  onSaveToggle,
  onHide,
  onPressListing,
  renderListItem,
  skeletonCount = 6,
  ListHeaderComponent,
  emptyIcon,
  emptyIllustration,
  emptyTitle,
  emptyDescription,
  emptyAction,
  contentPaddingBottom = 80,
  perPage = 20,
}: ListingFeedProps) {
  const router = useRouter();

  // ── renderItem — single source of truth for spacing ───────────────────────

  const renderItem = useCallback(
    (info: ListRenderItemInfo<Listing>): React.ReactElement | null => {
      const { item, index } = info;
      const saved = savedMap?.[item.id];
      const handlePress = onPressListing
        ? () => onPressListing(item)
        : () => router.push({ pathname: "/(main)/listing/[id]", params: { id: String(item.id) } });

      if (viewMode === "list") {
        if (renderListItem) return renderListItem(info);
        return (
          <View style={{ paddingBottom: 8 }}>
            <ListingCard
              listing={item}
              index={index}
              variant="list"
              showStatus={showStatus}
              isSaved={saved}
              onSaveToggle={onSaveToggle}
              onHide={onHide}
              onPress={handlePress}
            />
          </View>
        );
      }

      // Grid mode — symmetric paddingHorizontal keeps gaps identical in LTR and RTL
      return (
        <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 10 }}>
          <ListingCard
            listing={item}
            index={index}
            variant="grid"
            showStatus={showStatus}
            isSaved={saved}
            onSaveToggle={onSaveToggle}
            onHide={onHide}
            onPress={handlePress}
          />
        </View>
      );
    },
    [viewMode, showStatus, savedMap, onSaveToggle, onHide, onPressListing, renderListItem, router]
  );

  // ── Combined header: pass through caller's header ────────────────────────
  // The toggle lives in the screen's own ListHeaderComponent now.

  const combinedHeader: React.ReactElement | null = ListHeaderComponent ?? null;

  // ── Columns scale with the screen ─────────────────────────────────────────
  // This was hardcoded to 2, and nothing else in the app reads the window width
  // either. On the 1280dp tablet that meant TWO ~600dp-wide cards per row —
  // roughly three times the intended card size, on a store-listed form factor
  // (iPad screenshots have already been submitted for review).
  //
  // Derived from a target card width rather than a device check, so it also
  // handles rotation and foldables without a device table to maintain.
  //
  // The phone case provably cannot regress: for any width below 2x the target,
  // `floor(w / 260)` is 0 or 1 and the `max(2, …)` floor pins it at 2 — exactly
  // what it was. 320-519dp -> 2 (unchanged), 780dp -> 3, 1040dp -> 4,
  // 1280dp tablet -> 4 (capped), which keeps cards near their phone proportions
  // instead of stretching them.
  const { width: windowWidth } = useWindowDimensions();
  const gridColumns = Math.min(4, Math.max(2, Math.floor(windowWidth / 260)));

  // ── UniversalList config ──────────────────────────────────────────────────

  const config: UniversalListConfig<Listing> = {
    // viewMode AND the column count are in the id so FlashList fully remounts
    // when either changes — numColumns changes require a clean re-layout, not
    // just a re-render (and that now includes a tablet rotation).
    id: `${id}-${viewMode}-${gridColumns}`,
    refreshKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    renderItem,
    numColumns: viewMode === "grid" ? gridColumns : 1,
    skeletonCount,
    SkeletonComponent:
      viewMode === "list" ? ListingCardListSkeleton : ListingCardSkeleton,
    emptyIcon,
    emptyIllustration,
    emptyTitle,
    emptyDescription,
    emptyAction,
    ListHeaderComponent: combinedHeader,
    contentPaddingBottom,
    perPage,
  };

  return <UniversalList<Listing> config={config} />;
}
