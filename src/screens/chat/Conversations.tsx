import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { conversationsAPI, Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/common/EmptyState";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { confirmAlert } from "@/utils/alert";
import { MessageCircle } from "lucide-react-native";

function ConversationRow({ item, onDelete }: { item: Conversation; onDelete: (id: number) => void }) {
  const router = useRouter();
  const { formatDateTime, isRtl } = useLocalization();
  const { t } = useTranslation();
  const colors = useColors();

  const other = item.otherParticipant;
  const unread = item.unreadCount ?? 0;

  const handleLongPress = useCallback(() => {
    confirmAlert(
      t("chat.deleteConversation"),
      t("chat.deleteConversationDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => onDelete(item.id) },
      ]
    );
  }, [t, onDelete, item.id]);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/conversation/${item.id}`)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: unread > 0 ? colors.primaryAlpha : colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* Thumbnail */}
      <View style={{ marginRight: isRtl ? 0 : 12, marginLeft: isRtl ? 12 : 0 }}>
        <UserAvatar
          name={other?.fullName ?? other?.name ?? "?"}
          avatarUrl={other?.avatarUrl}
          size={48}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Name + time */}
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <Text
            style={{
              fontWeight: unread > 0 ? "700" : "600",
              fontSize: 15,
              color: colors.foreground,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {other?.fullName ?? t("chat.unknownUser")}
          </Text>
          {item.lastMessageAt && (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginLeft: isRtl ? 0 : 8, marginRight: isRtl ? 8 : 0, flexShrink: 0 }}>
              {formatDateTime(item.lastMessageAt)}
            </Text>
          )}
        </View>

        {/* Listing title */}
        {item.listing?.title && (
          <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 2 }} numberOfLines={1}>
            {item.listing.title}
          </Text>
        )}

        {/* Last message + unread badge row */}
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              color: unread > 0 ? colors.foreground : colors.mutedForeground,
              fontSize: 13,
              fontWeight: unread > 0 ? "500" : "400",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.lastMessageBody ?? t("chat.noMessages")}
          </Text>
          {unread > 0 && (
            <View style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: isRtl ? 0 : 8,
              marginRight: isRtl ? 8 : 0,
              paddingHorizontal: 5,
            }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: "700" }}>
                {unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonList() {
  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => <ConversationRowSkeleton key={i} />)}
    </View>
  );
}

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const qc = useQueryClient();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => conversationsAPI.getConversations(),
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const deleteMutation = useMutation({
    mutationFn: conversationsAPI.deleteConversation,
    onMutate: (id) => setDeletedIds((prev) => new Set(prev).add(id)),
    onError: (_e, id) => setDeletedIds((prev) => { const s = new Set(prev); s.delete(id); return s; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const items = (data?.items ?? []).filter((c) => !deletedIds.has(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, paddingTop: 20, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          {t("chat.title")}
        </Text>
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationRow item={item} onDelete={handleDelete} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={MessageCircle}
              title={t("chat.noConversations")}
              description={t("chat.noConversationsDescription")}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
