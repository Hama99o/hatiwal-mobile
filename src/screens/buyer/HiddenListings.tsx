/**
 * HiddenListingsScreen — buyer's "Not interested" management screen.
 *
 * Design contract (TASK-H528):
 *   - GET /my/hidden_listings?page[number]=N (paginated via Pagy, meta.pagination)
 *   - Distinct from Saved (E1) and the seen/viewed dim badge (B6) — this lists
 *     listings the buyer explicitly dismissed from their own Browse feed.
 *   - Infinite scroll via UniversalList (FlashList onEndReached → next page)
 *   - Each card shows a "Restore" button (DELETE /listings/:id/unhide) with
 *     optimistic removal from this list + rollback + toast on error.
 *   - ListingCardSkeleton while loading, EmptyState + Browse CTA when empty.
 *   - useFocusEffect resets to page 1 via refreshKey bump.
 *   - RTL-safe, dark-mode correct (all colors via useColors()).
 *   - No raw Alert, no hardcoded hex, no raw RN Text.
 *
 * The Stack header (title + back button) is registered in
 * app/(main)/_layout.tsx — same pattern as recently-viewed and blocked-users.
 */

import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { EyeOff, RotateCcw } from "lucide-react-native";
import { toast } from "sonner-native";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import { ListingCard } from "@/components/common/ListingCard";
import { ListingCardSkeleton } from "@/components/common/ListingCardSkeleton";
import {
  UniversalList,
  type ListQuery,
  type ListFetchResult,
  type UniversalListConfig,
} from "@/components/common/UniversalList";

import { listingsAPI, type Listing } from "@/api/listings";
import { useColors } from "@/hooks/useColors";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HiddenListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();

  // Set of listing ids that the user has restored (unhidden) in this session.
  // Stored in a ref so the fetcher closure always reads the latest version
  // without needing to be re-created on every render.
  const restoredSetRef = useRef<Set<number>>(new Set());

  // refreshKey — bumped on focus AND on every restore to silently re-fetch
  // page 1 in the background. Re-fetching (rather than just filtering the
  // already-fetched items client-side) is required so the restored item is
  // actually removed from UniversalList's `items` array — not left behind as
  // a blank grid cell — so EmptyState renders once every item is restored.
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-fetch from server on every focus. Also resets the optimistic-restore
  // state so it stays in sync with what the server actually returns.
  useFocusEffect(
    useCallback(() => {
      restoredSetRef.current = new Set();
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // ── Fetcher ─────────────────────────────────────────────────────────────────
  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getHiddenListings(query.page);

      // Apply optimistic restore filter — hide items just restored this session.
      const visible = result.items.filter(
        (l) => !restoredSetRef.current.has(l.id)
      );

      return {
        items: visible,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Restore (unhide) mutation ────────────────────────────────────────────────
  const unhideMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.unhideListing(id),
    onSuccess: () => {
      toast.success(t("hiddenListings.restoreSuccess"));
    },
    onError: (_err, id) => {
      // Roll back: remove from restored set and re-fetch so the card reappears.
      restoredSetRef.current.delete(id);
      setRefreshKey((k) => k + 1);
      toast.error(t("hiddenListings.restoreError"));
    },
  });

  const handleRestore = useCallback(
    (listingId: number) => {
      // Optimistic removal — excluded from the very next (silent) refetch of
      // page 1, even before the unhide DELETE resolves server-side. Mirrors
      // Browse.tsx's handleHide pattern (add to ref, bump refreshKey, mutate).
      restoredSetRef.current.add(listingId);
      setRefreshKey((k) => k + 1);
      unhideMutation.mutate(listingId);
    },
    [unhideMutation]
  );

  // ── UniversalList config ─────────────────────────────────────────────────────
  const config: UniversalListConfig<Listing> = {
    id: "buyer-hidden-listings",
    refreshKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    numColumns: 2,
    skeletonCount: 6,
    SkeletonComponent: ListingCardSkeleton,
    emptyIcon: EyeOff,
    emptyTitle: t("hiddenListings.empty"),
    emptyDescription: t("hiddenListings.emptyDescription"),
    emptyAction: {
      label: t("hiddenListings.browseButton"),
      onPress: () => router.push("/(main)/(tabs)/browse" as never),
    },
    renderItem: ({ item, index }) => {
      return (
        <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 10, gap: 6 }}>
          <ListingCard
            listing={item}
            index={index}
            onPress={() =>
              router.push({
                pathname: "/(main)/listing/[id]",
                params: { id: String(item.id) },
              })
            }
          />
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleRestore(item.id)}
            testID={`restore-listing-${item.id}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 40,
            }}
          >
            <RotateCcw size={14} color={colors.primary} />
            <Text className="text-xs font-semibold" style={{ color: colors.primary }}>
              {t("hiddenListings.restore")}
            </Text>
          </Button>
        </View>
      );
    },
    contentPaddingBottom: 32,
  };

  // safeArea=[] because this screen is rendered under a native Stack header
  // (app/(main)/_layout.tsx registers "hidden-listings" with headerShown: true),
  // so the header already provides the top inset.
  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      <UniversalList config={config} />
    </ScreenContainer>
  );
}
