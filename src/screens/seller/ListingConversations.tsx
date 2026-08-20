/**
 * ListingConversations — "conversations about this listing" (seller lane).
 *
 * TASK-Q847: this screen used to be an entire hand-rolled hidden-in-the-
 * route-file screen (`app/(main)/listing-conversations/[id].tsx`) with its
 * own private `ConversationRow`, no pagination, and no error state. Moved
 * out to its own screen module and rebuilt on the SAME house patterns as the
 * main inbox (`src/screens/chat/Conversations.tsx`):
 *
 *   - `UniversalList` (FlashList-backed) — real paging via
 *     `conversationsAPI.getConversations({ listingId, pageNumber, pageSize })`
 *     instead of a single unpaginated fetch. Loading → the shared
 *     `ConversationRowSkeleton` (skeletonCount), empty → `EmptyState`, error
 *     → UniversalList's own built-in error+retry state — never the
 *     "No conversations yet" copy on a failed request.
 *   - The SHARED `ConversationRow` (`context="listing"`, TASK-Q847) — never a
 *     second, forked row component. Gets the same `conversationPreviewText`
 *     formatting (an offer previews as "Offer: 75,000 AFN", never the raw
 *     `"75000|AFN"` metadata), the same long-press menu (mark read/unread,
 *     archive, delete), and the same `UserIdentity` (avatar + name + verified
 *     tag) as the inbox.
 *   - Every mutation (mark read/unread, archive, delete) goes through
 *     `useMutation` — optimistic via `filterItems` (removed rows / read-state
 *     overrides applied to whatever UniversalList already has loaded, purely
 *     at render time — never a manual useState fetch), rolled back + a
 *     `toast.error` on failure, and on success invalidates BOTH
 *     `["conversations"]` and `["conversations", listingId]` so every other
 *     consumer of this endpoint (the main inbox, `BuyerPickerSheet`'s
 *     `["conversations", listingId, "buyer-picker"]` query) stays in sync.
 *     Delete is guarded by `confirmAlert` inside the shared `ConversationRow`
 *     itself — never a raw `Alert.alert`.
 *   - `useFocusEffect` silently refreshes on focus (no manual useState
 *     fetching).
 *
 * Reached from three places, all passing the same two route params:
 *   - `MyListingDetail.tsx` (owner's own listing detail "View conversations")
 *   - `SellerListingCard.tsx` (My Shop list row's conversations count)
 *   - `SaleBuyerCard.tsx` (sold/reserved buyer card's Message fallback when
 *     there's no single direct conversation to jump to)
 *
 * Only ever shows this seller's non-archived conversations about ONE listing
 * (`GET /conversations?listing_id=&page[number]=&page[size]=`, the existing
 * endpoint — no backend change). Archiving a row here removes it from view
 * (never surfaces "Unarchive" — this screen never requests the archived
 * scope), mirroring the inbox's own tab-scoped behavior.
 */

import { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";
import { MessageCircle } from "lucide-react-native";

import {
  conversationsAPI,
  type Conversation,
} from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { BackButton } from "@/components/common/BackButton";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  UniversalList,
  type UniversalListConfig,
  type ListQuery,
  type ListFetchResult,
} from "@/components/common/UniversalList";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { ConversationRow } from "@/screens/chat/conversations/ConversationRow";

// Same page size the main inbox uses (Conversations.tsx) — comfortably above
// the backend's default page size for the overwhelming majority of listings,
// while `UniversalList`'s infinite scroll still kicks in for the rare
// popular listing whose conversations span more than one page.
const CONVERSATIONS_PAGE_SIZE = 30;

export default function ListingConversations() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { id, listingTitle } = useLocalSearchParams<{ id: string; listingTitle?: string }>();
  const listingId = Number(id);

  // Bumped on every focus (silent background refresh, no skeleton) and after
  // a mutation settles, so UniversalList reconciles with server truth.
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Optimistic overrides, applied via `filterItems` (purely at render time,
  //    never triggers a fetch — see UniversalList's own JSDoc) ─────────────
  // Rows the user just deleted or archived — hidden immediately, rolled back
  // (removed from this set) on mutation failure.
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  // Per-row unread-count override — 0 for an optimistic "mark read", 1 for an
  // optimistic "mark unread". Rolled back by deleting the row's entry.
  const [unreadOverrides, setUnreadOverrides] = useState<Map<number, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      // Reset on every focus (mirrors HiddenListings.tsx's restoredSetRef
      // reset) so a stale local override never outlives its usefulness —
      // e.g. a conversation marked read here, then marked unread again from
      // the main inbox while this screen sat in the background, must show
      // the server's truth again on return, not the old override.
      setRemovedIds(new Set());
      setUnreadOverrides(new Map());
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const applyOptimisticOverrides = useCallback(
    (items: Conversation[]) =>
      items
        .filter((c) => !removedIds.has(c.id))
        .map((c) =>
          unreadOverrides.has(c.id) ? { ...c, unreadCount: unreadOverrides.get(c.id) } : c
        ),
    [removedIds, unreadOverrides]
  );

  // Invalidates every consumer of this listing's conversations — the main
  // inbox re-fetches on its own next focus, and `BuyerPickerSheet`'s
  // `["conversations", listingId, "buyer-picker"]` query is a prefix match of
  // `["conversations", listingId]` so it goes stale too.
  const invalidateConversations = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: ["conversations", listingId] });
  }, [qc, listingId]);

  // ── Fetcher — real paging via listingId ──────────────────────────────────
  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Conversation>> => {
      const response = await conversationsAPI.getConversations({
        listingId,
        pageNumber: query.page,
        pageSize: query.perPage,
      });
      return {
        items: response.items,
        totalCount: response.pagination.totalCount,
        totalPages: response.pagination.totalPages,
        currentPage: response.pagination.currentPage,
      };
    },
    [listingId]
  );

  // ── Delete (optimistic removal + rollback + toast) ───────────────────────
  const deleteMutation = useMutation({
    mutationFn: (conversationId: number) => conversationsAPI.deleteConversation(conversationId),
    onMutate: (conversationId) => {
      setRemovedIds((prev) => new Set(prev).add(conversationId));
    },
    onError: (_err, conversationId) => {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      toast.error(t("common.error"));
    },
    onSuccess: () => {
      invalidateConversations();
      setRefreshKey((k) => k + 1);
    },
  });

  // ── Archive (optimistic removal — this screen never requests the archived
  //    scope, so an archived row simply disappears) ────────────────────────
  const archiveMutation = useMutation({
    mutationFn: (conversationId: number) => conversationsAPI.archiveConversation(conversationId),
    onMutate: (conversationId) => {
      setRemovedIds((prev) => new Set(prev).add(conversationId));
    },
    onError: (_err, conversationId) => {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
      toast.error(t("chat.archive.error"));
    },
    onSuccess: () => {
      invalidateConversations();
      setRefreshKey((k) => k + 1);
    },
  });

  // ── Mark read / unread (optimistic override + rollback + toast) ─────────
  const markReadMutation = useMutation({
    mutationFn: (conversationId: number) => conversationsAPI.markRead(conversationId),
    onMutate: (conversationId) => {
      setUnreadOverrides((prev) => new Map(prev).set(conversationId, 0));
    },
    onError: (_err, conversationId) => {
      setUnreadOverrides((prev) => {
        const next = new Map(prev);
        next.delete(conversationId);
        return next;
      });
      toast.error(t("chat.actions.markReadError"));
    },
    onSuccess: () => {
      invalidateConversations();
      setRefreshKey((k) => k + 1);
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: (conversationId: number) => conversationsAPI.markUnread(conversationId),
    onMutate: (conversationId) => {
      setUnreadOverrides((prev) => new Map(prev).set(conversationId, 1));
    },
    onError: (_err, conversationId) => {
      setUnreadOverrides((prev) => {
        const next = new Map(prev);
        next.delete(conversationId);
        return next;
      });
      toast.error(t("chat.actions.markReadError"));
    },
    onSuccess: () => {
      invalidateConversations();
      setRefreshKey((k) => k + 1);
    },
  });

  const listConfig: UniversalListConfig<Conversation> = {
    id: `listing-conversations-${listingId}`,
    refreshKey,
    fetcher,
    perPage: CONVERSATIONS_PAGE_SIZE,
    filterItems: applyOptimisticOverrides,
    keyExtractor: (item) => String(item.id),
    renderItem: ({ item }) => (
      <ConversationRow
        item={item}
        context="listing"
        onDelete={(cid) => deleteMutation.mutate(cid)}
        onMarkRead={(cid) => markReadMutation.mutate(cid)}
        onMarkUnread={(cid) => markUnreadMutation.mutate(cid)}
        onArchive={(cid) => archiveMutation.mutate(cid)}
      />
    ),
    skeletonCount: 5,
    SkeletonComponent: ConversationRowSkeleton,
    emptyIcon: MessageCircle,
    emptyTitle: t("chat.noConversations"),
    emptyDescription: t("chat.noConversationsDescription"),
    contentPaddingBottom: Math.max(insets.bottom, 16) + 12,
  };

  // safeArea=[] — this screen renders its own header (with insets.top below)
  // instead of a native Stack header, same as the old route-file screen and
  // the main inbox (Conversations.tsx).
  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      {/* ── Header — shared BackButton, listing title, useColors() only ───── */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 14,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <BackButton />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}
              numberOfLines={1}
            >
              {listingTitle || t("chat.title")}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {t("chat.title")}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <UniversalList config={listConfig} />
      </View>
    </ScreenContainer>
  );
}
