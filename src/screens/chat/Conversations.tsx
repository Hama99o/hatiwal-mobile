import {
  View,
  Pressable,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, CheckCheck, Archive, SearchX } from "lucide-react-native";
import { ChatIllustration } from "@/components/common/empty-illustrations";
import { toast } from "sonner-native";

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

// Debounce window for the list-level search (TASK-Z684). Kept short since
// filtering itself is instant/client-side — this only smooths out the
// silent-refresh trigger while the user is actively typing.
const SEARCH_DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Top-level partition — determines which server-side archive scope is used */
type TabMode = "inbox" | "archived";

/** Secondary filter within the inbox (client-side) */
type FilterMode = "all" | "unread" | "read";

const INBOX_FILTER_OPTIONS: { key: FilterMode; labelKey: string }[] = [
  { key: "all",    labelKey: "chat.filter.all" },
  { key: "unread", labelKey: "chat.filter.unread" },
  { key: "read",   labelKey: "chat.filter.read" },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tabMode, setTabMode]   = useState<TabMode>("inbox");
  const [filter, setFilter]     = useState<FilterMode>("all");

  // ── List-level search (TASK-Z684) ───────────────────────────────────────────
  // Raw text updates instantly (so the input never lags); the debounced value
  // is what actually drives the fetcher + the silent refresh below. This
  // deliberately uses `refreshKey` (silent background re-fetch, no skeleton)
  // rather than folding the term into `listConfig.id` — an `id` change forces
  // UniversalList's full reset-with-skeleton path, which would flash a
  // skeleton grid on every debounce tick. Composes with (does not replace)
  // the tab/filter controls, and never touches the unread badge, which is
  // always derived from the unfiltered `allConversationsRef`.
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Bump to trigger UniversalList silent background refresh (no skeleton, no setItems([])).
  const [refreshKey, setRefreshKey] = useState(0);
  // Bump to trigger a FULL reset (skeleton + reload). Only used for deletions.
  const [resetKey, setResetKey] = useState(0);

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

  // Debounce the search term, then trigger a silent refresh so the fetcher
  // (which closes over `debouncedSearchTerm`) re-applies the filter without
  // a skeleton flash. Skips the very first render — the initial load is
  // already handled by UniversalList's `id` effect.
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    setRefreshKey((k) => k + 1);
  }, [debouncedSearchTerm]);

  // ── Fetcher ────────────────────────────────────────────────────────────────
  // For inbox: fetches non-archived conversations, applies client-side
  //            read/unread filter + search term, and syncs the badge (from
  //            the UNFILTERED list — search/filter never touch the badge).
  // For archived: fetches archived conversations, applies the search term only.
  const makeFetcher = useCallback(
    (tab: TabMode, filterMode: FilterMode, term: string) =>
      async (_query: ListQuery): Promise<ListFetchResult<Conversation>> => {
        const response = await conversationsAPI.getConversations({
          archived: tab === "archived",
        });
        const all = response.items;

        if (tab === "inbox") {
          // Persist raw items for badge calculation (inbox only) — always the
          // unfiltered list, so search/filter can never skew the badge total.
          allConversationsRef.current = all;
          const total = getUnreadTotal(all);
          setUnreadMessageTotal(total);
          setUnreadBadgeCount(total);

          // Apply client-side read/unread filter, then the search term.
          const readFiltered = all.filter((c) => {
            const unread = c.unreadCount ?? 0;
            if (filterMode === "unread") return unread > 0;
            if (filterMode === "read")   return unread === 0;
            return true;
          });
          const filtered = filterConversations(readFiltered, term);

          return {
            items:       filtered,
            totalCount:  filtered.length,
            totalPages:  1,
            currentPage: 1,
          };
        }

        // Archived tab — search term only, otherwise unchanged.
        const filtered = filterConversations(all, term);
        return {
          items:       filtered,
          totalCount:  filtered.length,
          totalPages:  1,
          currentPage: 1,
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
      } catch {
        toast.error(t("common.error"));
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

  // Whether the (debounced, trimmed) search term is active — drives the
  // no-match empty state below. Uses the debounced value so the empty state
  // text always matches what the fetcher actually filtered on (not a
  // half-typed in-flight keystroke).
  const trimmedSearchTerm = debouncedSearchTerm.trim();
  const hasSearchTerm = trimmedSearchTerm.length > 0;

  // config.id changes only when tab, filter, or resetKey changes — search
  // deliberately stays OUT of id (see the debounce effect above) so typing
  // never triggers UniversalList's full skeleton-reset path.
  // refreshKey is passed separately so UniversalList silently re-fetches
  // without skeleton flash.
  const listConfig: UniversalListConfig<Conversation> = {
    id:          `conversations-${tabMode}-${filter}-${resetKey}`,
    refreshKey,
    fetcher:     makeFetcher(tabMode, filter, debouncedSearchTerm),
    keyExtractor: (item) => String(item.id),
    renderItem:  ({ item, index }) => (
      <ConversationRow
        item={item}
        tabMode={tabMode}
        onDelete={handleDelete}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        index={index}
      />
    ),
    skeletonCount:     5,
    SkeletonComponent: ConversationRowSkeleton,
    emptyIcon:
      hasSearchTerm
        ? SearchX
        : tabMode === "archived"
          ? Archive
          : filter === "unread"
            ? CheckCheck
            : MessageCircle,
    // Show the custom illustration only for the primary inbox empty state —
    // never for a no-match search result.
    emptyIllustration:
      !hasSearchTerm && tabMode !== "archived" && filter === "all"
        ? <ChatIllustration size={96} />
        : undefined,
    emptyTitle:
      hasSearchTerm
        ? t("chat.search.noMatchTitle", { term: trimmedSearchTerm })
        : tabMode === "archived"
          ? t("chat.archive.empty")
          : filter === "unread"
            ? t("chat.filter.noUnread")
            : t("chat.noConversations"),
    emptyDescription:
      hasSearchTerm
        ? t("chat.search.noMatchDescription")
        : tabMode === "archived"
          ? t("chat.archive.emptyDescription")
          : filter === "unread"
            ? t("chat.filter.noUnreadDescription")
            : t("chat.noConversationsDescription"),
    emptyAction:
      hasSearchTerm
        ? { label: t("chat.search.clearSearch"), onPress: () => setSearchTerm("") }
        : tabMode !== "archived" && filter !== "unread"
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
              fontSize:   22,
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
                style={{
                  flex:            1,
                  flexDirection:   isRtl ? "row-reverse" : "row",
                  alignItems:      "center",
                  justifyContent:  "center",
                  gap:             6,
                  paddingVertical: 9,
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

        {/* Secondary filter (All / Unread / Read) — only shown in Inbox tab */}
        {tabMode === "inbox" && (
          <View
            style={{
              flexDirection:   isRtl ? "row-reverse" : "row",
              marginTop:       8,
              borderRadius:    8,
              overflow:        "hidden",
              backgroundColor: colors.muted,
            }}
          >
            {INBOX_FILTER_OPTIONS.map(({ key, labelKey }, i) => {
              const isActive = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={{
                    flex:            1,
                    flexDirection:   isRtl ? "row-reverse" : "row",
                    alignItems:      "center",
                    justifyContent:  "center",
                    gap:             5,
                    paddingVertical: 7,
                    backgroundColor: isActive ? colors.secondary : "transparent",
                    borderRadius:    isActive ? 8 : 0,
                    borderLeftWidth: i > 0 && !isActive ? 1 : 0,
                    borderLeftColor: colors.border,
                  }}
                >
                  {key === "unread" && (
                    <View
                      style={{
                        width:           6,
                        height:          6,
                        borderRadius:    3,
                        backgroundColor: isActive ? colors.secondaryForeground : colors.primary,
                      }}
                    />
                  )}
                  {key === "read" && (
                    <CheckCheck
                      size={11}
                      color={isActive ? colors.secondaryForeground : colors.mutedForeground}
                    />
                  )}
                  <Text
                    style={{
                      fontSize:   12,
                      fontWeight: "600",
                      color:      isActive ? colors.secondaryForeground : colors.foreground,
                    }}
                  >
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── List (UniversalList — FlashList-backed) ─────────────────────── */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <UniversalList config={listConfig} />
      </View>
    </ScreenContainer>
  );
}
