import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageCircle,
  CheckCheck,
  Archive,
  SearchX,
  ShoppingBag,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { ChatIllustration } from "@/components/common/empty-illustrations";
import { toast } from "@/lib/toast";

import {
  conversationsAPI,
  getUnreadTotal,
  type Conversation,
} from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useChatStore } from "@/stores/chat.store";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterChip } from "@/components/common/FilterChip";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  UniversalList,
  type UniversalListConfig,
  type ListQuery,
  type ListFetchResult,
} from "@/components/common/UniversalList";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";

import { ConversationRow } from "./conversations/ConversationRow";
import { filterConversations } from "./conversations/filterConversations";
import { apiErrorMessage } from "@/utils/apiError";

// Backend clamps `page[size]` to this (see hatiwal-api ApplicationController::
// MAX_PAGE_SIZE). Requesting the max in one page means, for the overwhelming
// majority of users, the ENTIRE inbox/archive is already in memory — so the
// list-level search (TASK-Z684) below can filter client-side across the
// whole list, not just whatever the backend's default page size would return.
const CONVERSATIONS_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Top-level partition — determines which server-side archive scope is used */
type TabMode = "inbox" | "archived";

/** Secondary filter within the inbox (client-side) */
type FilterMode = "all" | "unread" | "read";

/**
 * Server-side role scope (TASK-R517) — "conversations where I am buying" vs
 * "conversations where I am selling". `null` means both (today's default,
 * mixed inbox). Mutually exclusive with itself — selecting the active chip
 * again deselects back to `null`.
 */
type RoleMode = "buying" | "selling" | null;

const INBOX_FILTER_OPTIONS: { key: FilterMode; labelKey: string }[] = [
  { key: "all",    labelKey: "chat.filter.all" },
  { key: "unread", labelKey: "chat.filter.unread" },
  { key: "read",   labelKey: "chat.filter.read" },
];

const ROLE_FILTER_OPTIONS: { key: Exclude<RoleMode, null>; labelKey: string }[] = [
  { key: "buying",  labelKey: "chat.filter.buying" },
  { key: "selling", labelKey: "chat.filter.selling" },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatCurrency } = useLocalization();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tabMode, setTabMode]   = useState<TabMode>("inbox");
  const [filter, setFilter]     = useState<FilterMode>("all");
  // Not reset on tab switch (unlike `filter`) — a role scope selected while
  // in the Inbox tab must keep composing when the user switches to Archived.
  const [role, setRole]         = useState<RoleMode>(null);

  // ── List-level search (TASK-Z684) ───────────────────────────────────────────
  // `filterItems` (UniversalList) applies `filterConversations` to whatever
  // is ALREADY loaded in memory, purely at render time — typing never
  // triggers a re-fetch, so the list stays visible (and searchable) even
  // offline. Composes with (does not replace) the tab/filter controls below,
  // and never touches the unread badge, which is always derived from the
  // unfiltered `allConversationsRef`.
  const [searchTerm, setSearchTerm] = useState("");

  // Bump to trigger UniversalList silent background refresh (no skeleton, no setItems([])).
  const [refreshKey, setRefreshKey] = useState(0);
  // Bump to trigger a FULL reset (skeleton + reload). Only used for deletions.
  const [resetKey, setResetKey] = useState(0);

  // Pagination state reported back by UniversalList (TASK-Z684 CR fix) — lets
  // the no-match empty state tell the difference between "no matches
  // anywhere" and "no matches in what's loaded so far, but more pages
  // exist" (search only ever filters what's already in memory).
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, totalPages: 1 });
  const hasUnloadedConversations = pageInfo.currentPage < pageInfo.totalPages;

  // ── Chip-row scroll affordance (review fix) ─────────────────────────────────
  // The read-state + role chip row can hold up to 5 chips plus a divider,
  // which overflows a 375px screen — `chipRowOverflow` tracks whether there
  // is unscrolled content on either edge (independent of reading direction,
  // so it stays correct in RTL without guessing which edge is "first") and
  // renders a small chevron hint so Buying/Selling are never silently
  // off-screen and undiscovered.
  const [chipRowOverflow, setChipRowOverflow] = useState({ start: false, end: false });
  const chipRowWidthRef = useRef(0);

  const updateChipRowOverflow = useCallback(
    (contentOffsetX: number, contentWidth: number) => {
      const containerWidth = chipRowWidthRef.current;
      if (containerWidth <= 0 || contentWidth <= containerWidth + 1) {
        setChipRowOverflow({ start: false, end: false });
        return;
      }
      setChipRowOverflow({
        start: contentOffsetX > 2,
        end: contentOffsetX + containerWidth < contentWidth - 2,
      });
    },
    []
  );

  const handleChipRowScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateChipRowOverflow(
        e.nativeEvent.contentOffset.x,
        e.nativeEvent.contentSize.width
      );
    },
    [updateChipRowOverflow]
  );

  const setUnreadMessageTotal = useChatStore((s) => s.setUnreadMessageTotal);

  // Raw inbox conversations ref — written by the fetcher, read for badge sync
  const allConversationsRef = useRef<Conversation[]>([]);

  // Unread badge count: derived from the inbox ref only (archived never count)
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0);

  // Focus-refetch — mandatory for every screen that shows server data (§12)
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  // ── Fetcher ────────────────────────────────────────────────────────────────
  // For inbox: fetches non-archived conversations, applies the client-side
  //            read/unread filter, and syncs the badge (from the UNFILTERED
  //            page-1 result only — search never touches the badge, and a
  //            deeper page can never skew it either).
  // For archived: fetches archived conversations, unchanged otherwise.
  // The search term is intentionally NOT applied here — it's applied by
  // UniversalList's `filterItems` at render time (see listConfig below), so
  // typing never re-hits the network.
  // `roleParam` (TASK-R517) is forwarded to the server so it stays correct
  // across infinite-scroll pages, and composes with both tabs (inbox/archived).
  const makeFetcher = useCallback(
    (tab: TabMode, filterMode: FilterMode, roleParam: RoleMode) =>
      async (query: ListQuery): Promise<ListFetchResult<Conversation>> => {
        const response = await conversationsAPI.getConversations({
          archived:   tab === "archived",
          pageNumber: query.page,
          pageSize:   query.perPage,
          role:       roleParam ?? undefined,
        });
        const page = response.items;

        if (tab === "inbox") {
          // Badge total is only meaningful from the first page of the FULL
          // (role-unfiltered) inbox — a deeper page fetched via infinite
          // scroll must never overwrite it with a partial count, and NEITHER
          // must a role-scoped page: while `roleParam` is set this response
          // only holds one side of the inbox, so syncing the badge from it
          // would incorrectly drop the badge to that subset. Skip the sync
          // entirely while a role filter is active — the badge keeps
          // whatever the last unfiltered fetch reported.
          if (query.page === 1 && !roleParam) {
            allConversationsRef.current = page;
            const total = getUnreadTotal(page);
            setUnreadMessageTotal(total);
            setUnreadBadgeCount(total);
          }

          // Client-side read/unread filter (search is applied later, at render).
          const readFiltered = page.filter((c) => {
            const unread = c.unreadCount ?? 0;
            if (filterMode === "unread") return unread > 0;
            if (filterMode === "read")   return unread === 0;
            return true;
          });

          return {
            items:       readFiltered,
            totalCount:  response.pagination.totalCount,
            totalPages:  response.pagination.totalPages,
            currentPage: response.pagination.currentPage,
          };
        }

        // Archived tab — unchanged, search applied later at render.
        return {
          items:       page,
          totalCount:  response.pagination.totalCount,
          totalPages:  response.pagination.totalPages,
          currentPage: response.pagination.currentPage,
        };
      },
    [setUnreadMessageTotal]
  );

  // ── Handle delete ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await conversationsAPI.deleteConversation(id);
        // Remove from ref and sync badge
        const updated = allConversationsRef.current.filter((c) => c.id !== id);
        allConversationsRef.current = updated;
        const total = getUnreadTotal(updated);
        setUnreadMessageTotal(total);
        setUnreadBadgeCount(total);
        // Full reset so UniversalList re-renders without the deleted row
        setResetKey((k) => k + 1);
      } catch (err) {
        toast.error(apiErrorMessage(err, t));
      }
    },
    [setUnreadMessageTotal, t]
  );

  // ── Handle archive (optimistic row-removal + badge update) ────────────────
  // Same pattern as markRead: optimistic update to ref + state, await PUT,
  // silent refreshKey bump. DO NOT bump resetKey (causes skeleton flash).
  const handleArchive = useCallback(
    async (id: number) => {
      const prev = allConversationsRef.current;
      // Optimistically remove from inbox ref
      const optimistic = prev.filter((c) => c.id !== id);
      allConversationsRef.current = optimistic;
      const total = getUnreadTotal(optimistic);
      setUnreadMessageTotal(total);
      setUnreadBadgeCount(total);

      try {
        await conversationsAPI.archiveConversation(id);
        setRefreshKey((k) => k + 1);
      } catch {
        // Rollback
        allConversationsRef.current = prev;
        const rollbackTotal = getUnreadTotal(prev);
        setUnreadMessageTotal(rollbackTotal);
        setUnreadBadgeCount(rollbackTotal);
        setRefreshKey((k) => k + 1);
        toast.error(t("chat.archive.error"));
      }
    },
    [setUnreadMessageTotal, t]
  );

  // ── Handle unarchive (optimistic row-removal from archived tab) ───────────
  const handleUnarchive = useCallback(
    async (id: number) => {
      try {
        await conversationsAPI.unarchiveConversation(id);
        // Silently refresh the archived list to remove the row
        setRefreshKey((k) => k + 1);
      } catch {
        toast.error(t("chat.archive.error"));
      }
    },
    [t]
  );

  // ── Handle mark read ──────────────────────────────────────────────────────
  const handleMarkRead = useCallback(
    async (id: number) => {
      const prev = allConversationsRef.current;
      const optimistic = prev.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      );
      allConversationsRef.current = optimistic;
      const total = getUnreadTotal(optimistic);
      setUnreadMessageTotal(total);
      setUnreadBadgeCount(total);

      try {
        await conversationsAPI.markRead(id);
        setRefreshKey((k) => k + 1);
      } catch {
        allConversationsRef.current = prev;
        const rollbackTotal = getUnreadTotal(prev);
        setUnreadMessageTotal(rollbackTotal);
        setUnreadBadgeCount(rollbackTotal);
        setRefreshKey((k) => k + 1);
        toast.error(t("chat.actions.markReadError"));
      }
    },
    [setUnreadMessageTotal, t]
  );

  // ── Handle mark unread ────────────────────────────────────────────────────
  const handleMarkUnread = useCallback(
    async (id: number) => {
      const prev = allConversationsRef.current;
      const optimistic = prev.map((c) =>
        c.id === id ? { ...c, unreadCount: 1 } : c
      );
      allConversationsRef.current = optimistic;
      const total = getUnreadTotal(optimistic);
      setUnreadMessageTotal(total);
      setUnreadBadgeCount(total);

      try {
        await conversationsAPI.markUnread(id);
        setRefreshKey((k) => k + 1);
      } catch {
        allConversationsRef.current = prev;
        const rollbackTotal = getUnreadTotal(prev);
        setUnreadMessageTotal(rollbackTotal);
        setUnreadBadgeCount(rollbackTotal);
        setRefreshKey((k) => k + 1);
        toast.error(t("chat.actions.markReadError"));
      }
    },
    [setUnreadMessageTotal, t]
  );

  // Whether the (trimmed) search term is active — drives the no-match empty
  // state below. `filterConversations` trims internally too, so this always
  // matches exactly what `filterItems` filtered on.
  const trimmedSearchTerm = searchTerm.trim();
  const hasSearchTerm = trimmedSearchTerm.length > 0;

  // config.id changes only when tab, filter, role, or resetKey changes —
  // search deliberately stays OUT of id (and out of the fetcher entirely) so
  // typing never triggers a re-fetch or UniversalList's skeleton-reset path;
  // it only narrows the already-loaded items via `filterItems` below.
  // `role` is included here too (TASK-R517) so tapping Buying/Selling always
  // triggers a fresh server-side re-fetch, not a client-side re-filter.
  // refreshKey is passed separately so UniversalList silently re-fetches
  // without skeleton flash.
  const listConfig: UniversalListConfig<Conversation> = {
    id:          `conversations-${tabMode}-${filter}-${role ?? "both"}-${resetKey}`,
    refreshKey,
    fetcher:     makeFetcher(tabMode, filter, role),
    perPage:     CONVERSATIONS_PAGE_SIZE,
    filterItems: (items) => filterConversations(items, searchTerm, t, formatCurrency),
    onPageInfoChange: setPageInfo,
    keyExtractor: (item) => String(item.id),
    renderItem:  ({ item }) => (
      <ConversationRow
        item={item}
        tabMode={tabMode}
        role={role}
        searchTerm={searchTerm}
        onDelete={handleDelete}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
      />
    ),
    skeletonCount:     5,
    SkeletonComponent: ConversationRowSkeleton,
    // Review fix: the icon/title/description/action below are now ordered
    // TAB-FIRST (archived checked before role) — `role` is deliberately not
    // reset when switching tabs (it composes with Archived, same as the
    // fetcher), so without this ordering an empty Archived+Selling view used
    // to show the inbox-flavored "No one has messaged you about your items
    // yet" copy AND its "Post a listing" CTA, neither of which make sense on
    // an archive (you don't fix an empty archive by posting a listing).
    // Archived always gets the plain archive-empty copy and no CTA,
    // regardless of which role scope narrowed it to empty.
    emptyIcon:
      hasSearchTerm
        ? SearchX
        : tabMode === "archived"
          ? Archive
          : role === "selling"
            ? Store
            : role === "buying"
              ? ShoppingBag
              : filter === "unread"
                ? CheckCheck
                : MessageCircle,
    // Show the custom illustration only for the primary, completely
    // unfiltered inbox empty state — never for a no-match search result or a
    // role-scoped empty state (those get their own icon + copy above).
    emptyIllustration:
      !hasSearchTerm && !role && tabMode !== "archived" && filter === "all"
        ? <ChatIllustration size={96} />
        : undefined,
    emptyTitle:
      hasSearchTerm
        ? t("chat.search.noMatchTitle", { term: trimmedSearchTerm })
        : tabMode === "archived"
          ? t("chat.archive.empty")
          : role === "selling"
            ? t("chat.empty.sellingTitle")
            : role === "buying"
              ? t("chat.empty.buyingTitle")
              : filter === "unread"
                ? t("chat.filter.noUnread")
                : t("chat.noConversations"),
    emptyDescription:
      hasSearchTerm
        ? hasUnloadedConversations
          // More pages exist beyond what's loaded — a "no matches" here would
          // be misleadingly absolute (CR fix: the match could be sitting on
          // an unloaded page), so make that explicit. `noMatchDescriptionPartial`
          // is ONE translated sentence (review fix) rather than two
          // separately-translated strings glued together in code with a
          // hardcoded ASCII space — translators can order/punctuate it
          // however their language needs, which `${a} ${b}` composition
          // never allowed.
          ? t("chat.search.noMatchDescriptionPartial")
          : t("chat.search.noMatchDescription")
        : tabMode === "archived"
          ? t("chat.archive.emptyDescription")
          : role === "selling"
            ? t("chat.empty.sellingDescription")
            : role === "buying"
              ? t("chat.empty.buyingDescription")
              : filter === "unread"
                ? t("chat.filter.noUnreadDescription")
                : t("chat.noConversationsDescription"),
    emptyAction:
      hasSearchTerm
        ? { label: t("chat.search.clearSearch"), onPress: () => setSearchTerm("") }
        : tabMode === "archived"
          ? undefined
          : role === "selling"
            ? {
                label:   t("listing.postListing"),
                onPress: () => router.push("/(main)/listing/new" as never),
              }
            : role === "buying"
              ? {
                  label:   t("chat.empty.browseAction"),
                  onPress: () => router.push("/(main)/(tabs)/browse" as never),
                }
              : filter !== "unread"
                ? {
                    label:   t("chat.empty.browseAction"),
                    onPress: () => router.push("/(main)/(tabs)/browse" as never),
                  }
                : undefined,
    contentPaddingBottom: 100,
  };

  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop:        insets.top + 12,
          paddingBottom:     12,
          backgroundColor:   colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Title row + total unread count badge */}
        <View
          style={{
            flexDirection:  isRtl ? "row-reverse" : "row",
            alignItems:     "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              // Typography scale fix (review): screen titles are `text-2xl`
              // (24) per DESIGN_SYSTEM.md §3 — this was off-scale at 22.
              fontSize:   24,
              fontWeight: "700",
              color:      colors.foreground,
            }}
          >
            {t("chat.title")}
          </Text>
          {unreadBadgeCount > 0 && (
            <Badge
              label={unreadBadgeCount >= 99 ? "99+" : unreadBadgeCount}
              variant="default"
              style={{ paddingHorizontal: 8, height: 24, borderRadius: 12 }}
            />
          )}
        </View>

        {/* ── Search — instant client-side filter by name / listing / last
            message (TASK-Z684). Composes with the tab + filter rows below;
            never touches the unread badge (derived from the unfiltered ref). */}
        <View style={{ marginTop: 12 }}>
          <SearchBar
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder={t("chat.searchPlaceholder")}
            testID="conversations-search-bar"
            // SearchBar exposes three handles — container, input, clear — and this
            // call site passed the container and the clear but not the input, so
            // flows typing into "conversations-search-input" found nothing.
            inputTestID="conversations-search-input"
            clearTestID="conversations-search-clear"
          />
        </View>

        {/* Inbox / Archived tab toggle */}
        <View
          style={{
            flexDirection:   isRtl ? "row-reverse" : "row",
            marginTop:       12,
            borderRadius:    10,
            overflow:        "hidden",
            backgroundColor: colors.muted,
          }}
        >
          {(["inbox", "archived"] as TabMode[]).map((tab, i) => {
            const isActive = tabMode === tab;
            const labelKey = tab === "inbox" ? "chat.tabs.inbox" : "chat.tabs.archived";
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  setTabMode(tab);
                  // Reset secondary filter when switching tabs
                  setFilter("all");
                }}
                testID={`tab-${tab}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t(labelKey)}
                style={{
                  flex:            1,
                  flexDirection:   isRtl ? "row-reverse" : "row",
                  alignItems:      "center",
                  justifyContent:  "center",
                  gap:             6,
                  paddingVertical: 12,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderRadius:    isActive ? 10 : 0,
                  borderLeftWidth: i > 0 && !isActive ? 1 : 0,
                  borderLeftColor: colors.border,
                }}
              >
                {tab === "archived" && (
                  <Archive
                    size={13}
                    color={isActive ? colors.primaryForeground : colors.mutedForeground}
                  />
                )}
                <Text
                  style={{
                    fontSize:   13,
                    fontWeight: "600",
                    color:      isActive ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Combined filter chip row. Holds TWO independent groups in one
            horizontally-scrollable row so we never add a 4th always-visible
            header row: read-state (All/Unread/Read, client-side, Inbox-only
            — read/unread has no meaning once a thread is archived) and role
            (Buying/Selling, server-side, TASK-R517). The role group renders
            in BOTH tabs (review fix): `role` composes with Archived too (see
            the fetcher above), so the chip that controls it — and lets the
            user clear it — must stay visible and reachable there, not just
            in the Inbox. Scrolls rather than shrinking so neither group ever
            clips at narrow widths (e.g. 375px); the chevron hints below make
            the overflow discoverable instead of silently off-screen. */}
        <View
          style={{ marginTop: 8 }}
          onLayout={(e) => {
            chipRowWidthRef.current = e.nativeEvent.layout.width;
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            testID="conversations-filter-chip-row"
            onContentSizeChange={(w) => updateChipRowOverflow(0, w)}
            onScroll={handleChipRowScroll}
            scrollEventThrottle={32}
            contentContainerStyle={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems:    "center",
              gap:           6,
              paddingVertical: 2,
            }}
          >
            {tabMode === "inbox" &&
              INBOX_FILTER_OPTIONS.map(({ key, labelKey }) => (
                <FilterChip
                  key={key}
                  label={t(labelKey)}
                  isActive={filter === key}
                  onPress={() => setFilter(key)}
                  isRtl={isRtl}
                  testID={`filter-chip-${key}`}
                  dot={key === "unread"}
                  icon={key === "read" ? CheckCheck : undefined}
                />
              ))}

            {/* Divider between the read-state group and the role group —
                only meaningful when both groups render together (Inbox). */}
            {tabMode === "inbox" && (
              <View
                style={{
                  width:           1,
                  height:          18,
                  backgroundColor: colors.border,
                  marginHorizontal: 2,
                }}
              />
            )}

            {ROLE_FILTER_OPTIONS.map(({ key, labelKey }) => (
              <FilterChip
                key={key}
                label={t(labelKey)}
                icon={key === "selling" ? Store : ShoppingBag}
                isActive={role === key}
                onPress={() => setRole((prev) => (prev === key ? null : key))}
                isRtl={isRtl}
                testID={`role-chip-${key}`}
              />
            ))}
          </ScrollView>

          {/* Scroll-discoverability hints (review fix) — a small chevron on
              whichever edge still has unscrolled chips, computed purely from
              scroll geometry so it stays correct in RTL without guessing
              which edge is "first". `pointerEvents="none"` — decorative only. */}
          {chipRowOverflow.start && (
            <View pointerEvents="none" style={styles.chipEdgeHintLeft}>
              <View style={[styles.chipEdgeHintBubble, { backgroundColor: colors.card }]}>
                <ChevronLeft size={12} color={colors.mutedForeground} />
              </View>
            </View>
          )}
          {chipRowOverflow.end && (
            <View pointerEvents="none" style={styles.chipEdgeHintRight}>
              <View style={[styles.chipEdgeHintBubble, { backgroundColor: colors.card }]}>
                <ChevronRight size={12} color={colors.mutedForeground} />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── List (UniversalList — FlashList-backed) ─────────────────────── */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <UniversalList config={listConfig} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chipEdgeHintLeft:  { position: "absolute", left: 0, top: 0, bottom: 0, justifyContent: "center" },
  chipEdgeHintRight: { position: "absolute", right: 0, top: 0, bottom: 0, justifyContent: "center" },
  chipEdgeHintBubble: {
    width:          18,
    height:         18,
    borderRadius:   9,
    alignItems:     "center",
    justifyContent: "center",
  },
});
