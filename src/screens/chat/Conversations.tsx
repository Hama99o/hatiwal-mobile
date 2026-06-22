import {
  View,
  Pressable,
} from "react-native";
import { useCallback, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, CheckCheck, Archive } from "lucide-react-native";
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
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  UniversalList,
  type UniversalListConfig,
  type ListQuery,
  type ListFetchResult,
} from "@/components/common/UniversalList";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";

import { ConversationRow } from "./conversations/ConversationRow";

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

  // ── Fetcher ────────────────────────────────────────────────────────────────
  // For inbox: fetches non-archived conversations, applies client-side filter,
  //            and syncs the badge.
  // For archived: fetches archived conversations as-is (no filter).
  const makeFetcher = useCallback(
    (tab: TabMode, filterMode: FilterMode) =>
      async (_query: ListQuery): Promise<ListFetchResult<Conversation>> => {
        const response = await conversationsAPI.getConversations({
          archived: tab === "archived",
        });
        const all = response.items;

        if (tab === "inbox") {
          // Persist raw items for badge calculation (inbox only)
          allConversationsRef.current = all;
          const total = getUnreadTotal(all);
          setUnreadMessageTotal(total);
          setUnreadBadgeCount(total);

          // Apply client-side read/unread filter
          const filtered = all.filter((c) => {
            const unread = c.unreadCount ?? 0;
            if (filterMode === "unread") return unread > 0;
            if (filterMode === "read")   return unread === 0;
            return true;
          });

          return {
            items:       filtered,
            totalCount:  filtered.length,
            totalPages:  1,
            currentPage: 1,
          };
        }

        // Archived tab — return all results unchanged
        return {
          items:       all,
          totalCount:  all.length,
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

  // config.id changes only when tab, filter, or resetKey changes.
  // refreshKey is passed separately so UniversalList silently re-fetches
  // without skeleton flash.
  const listConfig: UniversalListConfig<Conversation> = {
    id:          `conversations-${tabMode}-${filter}-${resetKey}`,
    refreshKey,
    fetcher:     makeFetcher(tabMode, filter),
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
      tabMode === "archived"
        ? Archive
        : filter === "unread"
          ? CheckCheck
          : MessageCircle,
    // Show the custom illustration only for the primary inbox empty state
    emptyIllustration:
      tabMode !== "archived" && filter === "all"
        ? <ChatIllustration size={96} />
        : undefined,
    emptyTitle:
      tabMode === "archived"
        ? t("chat.archive.empty")
        : filter === "unread"
          ? t("chat.filter.noUnread")
          : t("chat.noConversations"),
    emptyDescription:
      tabMode === "archived"
        ? t("chat.archive.emptyDescription")
        : filter === "unread"
          ? t("chat.filter.noUnreadDescription")
          : t("chat.noConversationsDescription"),
    emptyAction:
      tabMode !== "archived" && filter !== "unread"
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
