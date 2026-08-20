/**
 * RecentlyViewedScreen — buyer's listing view history.
 *
 * Design contract:
 *   - GET /my/viewed_listings?page[number]=N (paginated via Pagy, meta.pagination)
 *   - Results ordered by last_viewed_at desc (most recently opened first)
 *   - Browsable-only: draft/sold/reserved/expired/removed filtered server-side
 *   - Infinite scroll via UniversalList (FlashList onEndReached → next page)
 *   - Shared ListingCard with working save-heart (reuse existing card behavior)
 *   - ListingCardSkeleton while loading
 *   - EmptyState with Browse CTA when nothing has been viewed
 *   - useFocusEffect resets to page 1 via refreshKey bump
 *   - RTL-safe, dark-mode correct (all colors via useColors())
 *   - No raw Alert, no hardcoded hex, no raw RN Text
 *
 * The Stack header (title + back button) is registered in
 * app/(main)/_layout.tsx under "recently-viewed" — same pattern as
 * profile/my-reports and blocked-users.
 */

import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { History } from "lucide-react-native";
import { toast } from "@/lib/toast";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListingCard } from "@/components/common/ListingCard";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import {
  UniversalList,
  type ListQuery,
  type ListFetchResult,
  type UniversalListConfig,
} from "@/components/common/UniversalList";

import { listingsAPI, type Listing } from "@/api/listings";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecentlyViewedScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // refreshKey — bumped on focus for a silent page-1 background re-fetch.
  // config.id stays static so UniversalList does NOT trigger a full
  // skeleton reset on each focus (avoids the flicker reported in review).
  const [refreshKey, setRefreshKey] = useState(0);

  // Track which items the user has saved/unsaved in this session so the
  // heart icon reflects optimistic state without waiting for a re-fetch.
  const savedOverridesRef = useRef<Map<number, boolean>>(new Map());
  const [savedOverrides, setSavedOverrides] = useState<Map<number, boolean>>(new Map());

  // Re-fetch from server every time the screen comes into focus.
  // Also clears saved-override state so it stays in sync with the server.
  useFocusEffect(
    useCallback(() => {
      savedOverridesRef.current = new Map();
      setSavedOverrides(new Map());
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // ── Fetcher ────────────────────────────────────────────────────────────────
  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getViewedListings(query.page);
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    []
  );

  // ── Save / unsave mutations ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.saveListing(id),
    onError: (_err, id) => {
      // Roll back: revert to unsaved
      savedOverridesRef.current.set(id, false);
      setSavedOverrides(new Map(savedOverridesRef.current));
      toast.error(t("saved.saveError"));
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_err, id) => {
      // Roll back: revert to saved
      savedOverridesRef.current.set(id, true);
      setSavedOverrides(new Map(savedOverridesRef.current));
      toast.error(t("saved.unsaveError"));
    },
  });

  // ── Heart toggle handler ───────────────────────────────────────────────────
  const handleSaveToggle = useCallback(
    (listingId: number, newValue: boolean) => {
      // Optimistic update
      savedOverridesRef.current.set(listingId, newValue);
      setSavedOverrides(new Map(savedOverridesRef.current));
      if (newValue) {
        saveMutation.mutate(listingId);
      } else {
        unsaveMutation.mutate(listingId);
      }
    },
    [saveMutation, unsaveMutation]
  );

  // ── UniversalList config ───────────────────────────────────────────────────
  // id is STATIC — changing id resets UniversalList fully (skeleton flash).
  // Focus re-fetch is done via the refreshKey prop instead.
  const config: UniversalListConfig<Listing> = {
    id: "buyer-recently-viewed",
    refreshKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    numColumns: 2,
    skeletonCount: 6,
    SkeletonComponent: ListingCardSkeleton,
    emptyIcon: History,
    emptyTitle: t("recentlyViewed.empty"),
    emptyDescription: t("recentlyViewed.emptyDescription"),
    emptyAction: {
      label: t("recentlyViewed.browseButton"),
      onPress: () => router.push("/(main)/(tabs)/browse" as never),
    },
    renderItem: ({ item, index }) => {
      // Resolve save state: override map first (optimistic), then server value
      const overrideValue = savedOverrides.get(item.id);
      const isSaved = overrideValue !== undefined ? overrideValue : (item.isSaved ?? false);

      return (
        <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 10 }}>
          <ListingCard
            listing={item}
            index={index}
            isSaved={isSaved}
            onSaveToggle={handleSaveToggle}
            onPress={() =>
              router.push({
                pathname: "/(main)/listing/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        </View>
      );
    },
    contentPaddingBottom: 32,
  };

  return (
    <ScreenContainer scrollable={false} padded={false}>
      <UniversalList config={config} />
    </ScreenContainer>
  );
}
