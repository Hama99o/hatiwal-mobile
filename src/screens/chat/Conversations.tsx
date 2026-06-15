import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, CheckCheck } from "lucide-react-native";

import { conversationsAPI, getUnreadTotal, type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useChatStore } from "@/stores/chat.store";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { ScreenContainer } from "@/components/ui/ScreenContainer";

import { ConversationRow } from "./conversations/ConversationRow";
import { SkeletonList } from "./conversations/SkeletonList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterMode = "all" | "unread" | "read";

const FILTER_OPTIONS: { key: FilterMode; labelKey: string }[] = [
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
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");

  const setUnreadMessageTotal = useChatStore((s) => s.setUnreadMessageTotal);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn:  () => conversationsAPI.getConversations(),
  });

  // Focus-refetch — mandatory for every screen that shows server data (§12)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Sync the tab badge total into the global store every time conversation
  // data changes. getUnreadTotal sums each conversation's unreadCount and
  // caps at 99 — this is message-sum semantics, consistent with the store
  // field name (unreadMessageTotal).
  useEffect(() => {
    if (!data) return;
    setUnreadMessageTotal(getUnreadTotal(data.items));
  }, [data, setUnreadMessageTotal]);

  const deleteMutation = useMutation({
    mutationFn: conversationsAPI.deleteConversation,
    onMutate:   (id) => setDeletedIds((prev) => new Set(prev).add(id)),
    onError:    (_e, id) =>
      setDeletedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const handleDelete = useCallback(
    (id: number) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const allItems = (data?.items ?? []).filter((c: Conversation) => !deletedIds.has(c.id));

  const items = allItems.filter((c: Conversation) => {
    const unread = c.unreadCount ?? 0;
    if (filter === "unread") return unread > 0;
    if (filter === "read")   return unread === 0;
    return true;
  });

  // Use the same message-sum semantics as the tab badge and the store field
  // (unreadMessageTotal). Both surfaces show the aggregate unread message total
  // capped at 99, so the in-screen header badge is consistent with the tab badge.
  const unreadBadgeCount = getUnreadTotal(allItems);

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
              label={unreadBadgeCount}
              variant="default"
              style={{ paddingHorizontal: 8, height: 24, borderRadius: 12 }}
            />
          )}
        </View>

        {/* Segmented control — All / Unread / Read */}
        <View
          style={{
            flexDirection:   isRtl ? "row-reverse" : "row",
            marginTop:       12,
            borderRadius:    10,
            overflow:        "hidden",
            backgroundColor: colors.muted,
          }}
        >
          {FILTER_OPTIONS.map(({ key, labelKey }, i) => {
            const isActive = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={{
                  flex:           1,
                  flexDirection:  isRtl ? "row-reverse" : "row",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            5,
                  paddingVertical: 9,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderRadius:    isActive ? 10 : 0,
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
                      backgroundColor: isActive ? colors.primaryForeground : colors.primary,
                    }}
                  />
                )}
                {key === "read" && (
                  <CheckCheck
                    size={12}
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
      </View>

      {/* ── List ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: colors.background }}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ConversationRow item={item} onDelete={handleDelete} index={index} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={filter === "unread" ? CheckCheck : MessageCircle}
              title={
                filter === "unread"
                  ? t("chat.filter.noUnread")
                  : t("chat.noConversations")
              }
              description={
                filter === "unread"
                  ? t("chat.filter.noUnreadDescription")
                  : t("chat.noConversationsDescription")
              }
              action={
                filter !== "unread"
                  ? {
                      label:   t("chat.empty.browseAction"),
                      onPress: () =>
                        router.push("/(main)/(tabs)/browse" as never),
                    }
                  : undefined
              }
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
