/**
 * SavedScreen — buyer's favorited listings.
 *
 * Design contract:
 *   - GET /my/saved_listings (no pagination — all items returned at once)
 *   - Optimistic unsave: heart toggles instantly; card disappears immediately;
 *     sonner-native toast on error + card restored
 *   - UniversalList (FlashList) 2-column grid with ListingCardSkeleton
 *   - ListingCard with animated heart (handled inside ListingCard)
 *   - Skeleton grid while loading, EmptyState + Browse CTA when empty
 *   - useFocusEffect refetch (refetchKey bump → UniversalList re-mounts)
 *   - RTL-safe, dark-mode correct (all colors via useColors())
 *
 * Optimistic removal architecture:
 *   serverItemsRef caches the last successful server fetch so that local
 *   unsave operations can immediately re-filter and re-render via refetchKey
 *   without hitting the network again. A real network refetch only happens on:
 *     (a) first mount, (b) focus return, (c) pull-to-refresh.
 */

import React, { useState, useCallback, useRef } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react-native";
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

// ─── Types ────────────────────────────────────────────────────────────────────

// Set of listing ids the user has unsaved locally in this session (hide from list).
type UnsavedSet = Set<number>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SavedScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  // Server-fetched items cached locally so optimistic removal can re-filter
  // without a network round-trip.
  const serverItemsRef = useRef<Listing[]>([]);

  // Set of listing ids that the user has unsaved in this session.
  // Stored in a ref so the fetcher closure always reads the latest version
  // without needing to be re-created.
  const unsavedSetRef = useRef<UnsavedSet>(new Set());

  // React state version of unsavedSet — used for renderItem isSaved check.
  const [unsavedIds, setUnsavedIds] = useState<Set<number>>(new Set());

  // refetchKey — bumped to trigger UniversalList id change → full re-mount.
  //   • On focus: forces a real server fetch (clears cached data first).
  //   • On unsave: forces a local re-filter (cached data available instantly).
  const [refetchKey, setRefetchKey] = useState(0);

  // Track whether the current refetchKey bump is a "local" re-filter (no
  // network needed) or a "remote" re-fetch (clears cache first).
  const localRefetchRef = useRef(false);

  // Re-fetch from server on every focus.
  // Also resets the optimistic-unsave state so the Set doesn't grow unbounded
  // across multiple focus/blur cycles and stays in sync with what the server
  // actually returns.
  useFocusEffect(
    useCallback(() => {
      localRefetchRef.current = false;        // server fetch
      serverItemsRef.current = [];            // clear cache → fetcher will hit network
      unsavedSetRef.current = new Set();      // reset optimistic unsave tracking
      setUnsavedIds(new Set());              // reset visible-state unsave set
      setRefetchKey((k) => k + 1);
    }, [])
  );

  // ── Fetcher ─────────────────────────────────────────────────────────────────
  // Passed to UniversalList. On a local re-filter it returns the cached server
  // items (filtered) synchronously-ish. On a real refetch it hits the network.
  const fetcher = useCallback(
    async (_query: ListQuery): Promise<ListFetchResult<Listing>> => {
      let items: Listing[];

      if (localRefetchRef.current && serverItemsRef.current.length > 0) {
        // Local re-filter — use cached server data, no network call
        items = serverItemsRef.current;
      } else {
        // Network fetch
        const result = await listingsAPI.getSavedListings();
        items = result.items;
        serverItemsRef.current = items;
      }

      // Apply optimistic unsave filter
      const visible = items.filter((l) => !unsavedSetRef.current.has(l.id));

      return {
        items: visible,
        totalCount: visible.length,
        totalPages: 1,
        currentPage: 1,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refetchKey] // rebuild fetcher on each refetch so UniversalList detects the change
  );

  // ── Unsave mutation ──────────────────────────────────────────────────────────
  const unsaveMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unsaveListing(id),
    onError: (_err, id) => {
      // Roll back: remove from unsaved set → card reappears
      unsavedSetRef.current.delete(id);
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Trigger local re-filter to restore the card
      localRefetchRef.current = true;
      setRefetchKey((k) => k + 1);
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
      localRefetchRef.current = true;
      setRefetchKey((k) => k + 1);
      toast.error(t("saved.saveError"));
    },
  });

  // ── Heart toggle handler ─────────────────────────────────────────────────────
  // newValue: true = user re-saved, false = user unsaved
  const handleSaveToggle = useCallback(
    (listingId: number, newValue: boolean) => {
      if (!newValue) {
        // Optimistic removal: add to unsaved set → trigger local re-filter
        unsavedSetRef.current.add(listingId);
        setUnsavedIds((prev) => new Set([...prev, listingId]));
        localRefetchRef.current = true;
        setRefetchKey((k) => k + 1);
        unsaveMutation.mutate(listingId);
      } else {
        // Re-save: remove from unsaved set → card reappears
        unsavedSetRef.current.delete(listingId);
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
        localRefetchRef.current = true;
        setRefetchKey((k) => k + 1);
        saveMutation.mutate(listingId);
      }
    },
    [unsaveMutation, saveMutation]
  );

  // ── UniversalList config ─────────────────────────────────────────────────────
  const config: UniversalListConfig<Listing> = {
    id: `buyer-saved`,
    refreshKey: refetchKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    numColumns: 2,
    skeletonCount: 6,
    SkeletonComponent: ListingCardSkeleton,
    emptyIcon: Heart,
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
          // isSaved = true unless the user just unsaved it
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
