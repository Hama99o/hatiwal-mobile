import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { conversationsAPI, type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/common/EmptyState";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { confirmAlert } from "@/utils/alert";
import { MessageCircle, ArrowLeft, Camera } from "lucide-react-native";

const PHOTO_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const PHOTO_SIZE = 68;

function ConversationRow({ item, onDelete }: { item: Conversation; onDelete: (id: number) => void }) {
  const router = useRouter();
  const { formatDateTime, isRtl } = useLocalization();
  const { t } = useTranslation();
  const colors = useColors();

  const other = item.otherParticipant;
  const otherName = other?.name;
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
      onPress={() => router.push(`/(main)/conversation/${item.id}` as never)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: unread > 0 ? colors.primaryAlpha : colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      {/* Listing photo */}
      <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, overflow: "hidden", backgroundColor: colors.muted, flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
        {item.listing?.thumbnailUrl ? (
          <Image source={{ uri: item.listing.thumbnailUrl }} style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }} contentFit="cover" placeholder={{ blurhash: PHOTO_BLURHASH }} transition={150} />
        ) : (
          <Camera size={24} color={colors.mutedForeground} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
          <Text style={{ fontWeight: "700", fontSize: 14, color: colors.foreground, flex: 1, lineHeight: 19 }} numberOfLines={2}>
            {item.listing?.title ?? t("chat.title")}
          </Text>
          {item.lastMessageAt && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11, flexShrink: 0, marginTop: 1 }}>
              {formatDateTime(item.lastMessageAt)}
            </Text>
          )}
        </View>

        {otherName && (
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <UserAvatar name={otherName} avatarUrl={other?.avatarUrl} size={16} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={1}>{otherName}</Text>
          </View>
        )}

        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: unread > 0 ? colors.foreground : colors.mutedForeground, fontSize: 12, fontWeight: unread > 0 ? "500" : "400", flex: 1 }} numberOfLines={1}>
            {item.lastMessageBody ?? t("chat.noMessages")}
          </Text>
          {unread > 0 && (
            <View style={{ backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginLeft: isRtl ? 0 : 6, marginRight: isRtl ? 6 : 0, paddingHorizontal: 5 }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: "700" }}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ListingConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const { id, listingTitle } = useLocalSearchParams<{ id: string; listingTitle?: string }>();
  const listingId = Number(id);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["conversations", listingId],
    queryFn: () => conversationsAPI.getConversations({ listingId }),
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const deleteMutation = useMutation({
    mutationFn: conversationsAPI.deleteConversation,
    onMutate: (cid) => setDeletedIds((prev) => new Set(prev).add(cid)),
    onError: (_e, cid) => setDeletedIds((prev) => { const s = new Set(prev); s.delete(cid); return s; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const handleDelete = useCallback((cid: number) => {
    deleteMutation.mutate(cid);
  }, [deleteMutation]);

  const items = (data?.items ?? []).filter((c: Conversation) => !deletedIds.has(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 14, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ArrowLeft size={22} color={colors.foreground} style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }} numberOfLines={1}>
              {listingTitle ?? t("chat.title")}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {t("chat.title")}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View>{[1, 2, 3].map((i) => <ConversationRowSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationRow item={item} onDelete={handleDelete} />}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={MessageCircle}
              title={t("chat.noConversations")}
              description={t("chat.noConversationsDescription")}
            />
          }
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
