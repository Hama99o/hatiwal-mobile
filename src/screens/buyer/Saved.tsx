/**
 * SavedScreen — buyer's favorited listings.
 *
 * Design contract:
 *   - GET /my/saved_listings?page[number]=N (paginated via Pagy, meta.pagination)
 *   - Infinite scroll via UniversalList (FlashList onEndReached → next page)
 *   - Optimistic unsave: heart toggles instantly; card disappears immediately;
 *     sonner-native toast on error + card restored
 *   - UniversalList (FlashList) 2-column grid with ListingCardSkeleton
 *   - ListingCard with animated heart (handled inside ListingCard)
 *   - Skeleton grid while loading, EmptyState + Browse CTA when empty
 *   - useFocusEffect resets to page 1 via refreshKey bump
 *   - RTL-safe, dark-mode correct (all colors via useColors())
 *
 * Optimistic removal architecture:
 *   unsavedSetRef tracks listing ids the user has unsaved in this session.
 *   The fetcher filters them out before returning items to UniversalList.
 *   The set is cleared on focus-refetch so it stays in sync with the server.
 */

import React, { useState, useCallback, useRef } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react-native";
import { SavedIllustration } from "@/components/common/empty-illustrations";
import { toast } from "sonner-native";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ListingCard } from "@/components/common/ListingCard";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import {
  UniversalList,
  type ListQuery,
  type ListFetchResult,
  type UniversalListConfig,
} from "@/components/common/UniversalList";
import { Text } from "@/components/reusables/text";

import { listingsAPI, type Listing } from "@/api/listings";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SavedScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  // Set of listing ids that the user has unsaved in this session.
  // Stored in a ref so the fetcher closure always reads the latest version
  // without needing to be re-created on every render.
  const unsavedSetRef = useRef<Set<number>>(new Set());

  // React state version of unsavedSet — used for renderItem isSaved check.
  const [unsavedIds, setUnsavedIds] = useState<Set<number>>(new Set());

  // refreshKey — bumped on focus to silently re-fetch page 1 in the background
  // (UniversalList keeps items visible until fresh data arrives).
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-fetch from server on every focus.
  // Also resets the optimistic-unsave state so the Set doesn't grow unbounded
  // across multiple focus/blur cycles and stays in sync with what the server
  // actually returns.
  useFocusEffect(
    useCallback(() => {
      unsavedSetRef.current = new Set();
      setUnsavedIds(new Set());
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // ── Fetcher ─────────────────────────────────────────────────────────────────
  // Passed to UniversalList. Uses the page param from ListQuery to fetch the
  // correct page from the paginated API. Filters out optimistically-unsaved
  // items before returning so the list updates without a network round-trip.
  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getSavedListings(query.page);

      // Apply optimistic unsave filter
      const visible = result.items.filter(
        (l) => !unsavedSetRef.current.has(l.id)
      );

      return {
        items: visible,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    // fetcher identity is stable — unsavedSetRef is a ref, not state.
    // refreshKey is not in deps because UniversalList uses `refreshKey` prop
    // (not config.id) for silent background re-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Unsave mutation ──────────────────────────────────────────────────────────
  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_err, id) => {
      // Roll back: remove from unsaved set → card reappears on next render
      unsavedSetRef.current.delete(id);
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error(t("saved.unsaveError"));
    },
  });

  // ── Save mutation (user re-saves something they just unsaved) ────────────────
  const saveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.saveListing(id),
    onError: (_err, id) => {
      // Roll back: mark as unsaved again
      unsavedSetRef.current.add(id);
      setUnsavedIds((prev) => new Set([...prev, id]));
      toast.error(t("saved.saveError"));
    },
  });

  // ── Heart toggle handler ─────────────────────────────────────────────────────
  // newValue: true = user re-saved, false = user unsaved
  const handleSaveToggle = useCallback(
    (listingId: number, newValue: boolean) => {
      if (!newValue) {
        // Optimistic removal: add to unsaved set → triggers re-render via state
        unsavedSetRef.current.add(listingId);
        setUnsavedIds((prev) => new Set([...prev, listingId]));
        unsaveMutation.mutate(listingId);
      } else {
        // Re-save: remove from unsaved set → card reappears
        unsavedSetRef.current.delete(listingId);
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        saveMutation.mutate(listingId);
      }
    },
    [unsaveMutation, saveMutation]
  );

  // ── UniversalList config ─────────────────────────────────────────────────────
  const config: UniversalListConfig<Listing> = {
    id: "buyer-saved",
    refreshKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    numColumns: 2,
    skeletonCount: 6,
    SkeletonComponent: ListingCardSkeleton,
    emptyIcon: Heart,
    emptyIllustration: <SavedIllustration size={96} />,
    emptyTitle: t("saved.empty"),
    emptyDescription: t("saved.emptyDescription"),
    emptyAction: {
      label: t("saved.browseButton"),
      onPress: () => router.push("/(main)/(tabs)/browse" as never),
    },
    renderItem: ({ item, index }) => (
      <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 10 }}>
        <ListingCard
          listing={item}
          index={index}
          // isSaved = true unless the user just unsaved it in this session
          isSaved={!unsavedIds.has(item.id)}
          onSaveToggle={handleSaveToggle}
          onPress={() =>
            router.push({
              pathname: "/(main)/listing/[id]",
              params: { id: String(item.id) },
            })
          }
        />
      </View>
    ),
    contentPaddingBottom: 32,
  };

  return (
    <ScreenContainer scrollable={false} padded={false}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 14,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Heart size={22} color={colors.destructive} fill={colors.destructive} />
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: colors.foreground,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("saved.title")}
        </Text>
      </View>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <UniversalList config={config} />
    </ScreenContainer>
  );
}
