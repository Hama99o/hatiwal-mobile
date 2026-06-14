import { View, FlatList, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { Image } from "expo-image";
import { LISTING_BLURHASH } from "@/constants/images";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { conversationsAPI, Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/common/EmptyState";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ConversationRowSkeleton } from "@/components/common/ListingCardSkeleton";
import { confirmAlert } from "@/utils/alert";
import { MessageCircle, Camera, CheckCheck, MapPin, Tag, FileText } from "lucide-react-native";

function ConversationRow({ item, onDelete }: { item: Conversation; onDelete: (id: number) => void }) {
  const router = useRouter();
  const { formatDateTime, isRtl } = useLocalization();
  const { t } = useTranslation();
  const colors = useColors();

  const other = item.otherParticipant;
  const otherName = other?.name ?? other?.fullName;
  const unread = item.unreadCount ?? 0;
  const PHOTO_SIZE = 68;
  // Listing no longer available → dim the row + show a "Sold/Reserved" tag.
  const isSold = item.listing?.status === "sold";
  const isReserved = item.listing?.status === "reserved";
  const isInactive = isSold || isReserved;

  // Friendly last-message preview — structured kinds (meetup/offer/file) get a
  // readable label + icon instead of their raw "a | b" / "amount|currency" body.
  const previewIconColor = colors.mutedForeground;
  let PreviewIcon: typeof MapPin | null = null;
  let previewText = item.lastMessageBody ?? t("chat.noMessages");
  if (item.lastMessageBody) {
    switch (item.lastMessageKind) {
      case "meetup_proposal":
        PreviewIcon = MapPin;
        previewText = t("chat.preview.meetup");
        break;
      case "meetup_accepted":
        PreviewIcon = MapPin;
        previewText = t("chat.preview.meetupAccepted");
        break;
      case "meetup_declined":
        PreviewIcon = MapPin;
        previewText = t("chat.preview.meetupDeclined");
        break;
      case "offer": {
        const [amount, currency] = item.lastMessageBody.split("|");
        PreviewIcon = Tag;
        previewText = t("chat.preview.offer", { amount: amount ?? "", currency: currency ?? "" });
        break;
      }
      case "offer_accepted":
        PreviewIcon = Tag;
        previewText = t("chat.preview.offerAccepted");
        break;
      case "offer_declined":
        PreviewIcon = Tag;
        previewText = t("chat.preview.offerDeclined");
        break;
      case "image_message":
        PreviewIcon = Camera;
        previewText = t("chat.preview.photo");
        break;
      case "document":
        PreviewIcon = FileText;
        previewText = t("chat.preview.file");
        break;
      default:
        break; // text → raw body
    }
  }

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
      <View
        style={{
          width: PHOTO_SIZE,
          height: PHOTO_SIZE,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: colors.muted,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.listing?.thumbnailUrl ? (
          <Image
            source={{ uri: item.listing.thumbnailUrl }}
            style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, opacity: isInactive ? 0.5 : 1 }}
            contentFit="cover"
            placeholder={{ blurhash: LISTING_BLURHASH }}
            transition={150}
          />
        ) : (
          <Camera size={24} color={colors.mutedForeground} />
        )}
        {/* Sold / reserved tag overlaid on the thumbnail */}
        {isInactive && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: isSold ? colors.overlay : "rgba(180,83,9,0.85)",
              paddingVertical: 2,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>
              {(isSold ? t("common.sold") : t("common.reserved")).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Title + time */}
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
          <Text
            style={{ fontWeight: "700", fontSize: 14, color: isInactive ? colors.mutedForeground : colors.foreground, flex: 1, lineHeight: 19 }}
            numberOfLines={2}
          >
            {item.listing?.title ?? t("chat.title")}
          </Text>
          {item.lastMessageAt && (
            <Text style={{ color: colors.mutedForeground, fontSize: 11, flexShrink: 0, marginTop: 1 }}>
              {formatDateTime(item.lastMessageAt)}
            </Text>
          )}
        </View>

        {/* User name row */}
        {otherName && (
          <View style={{ marginBottom: 4 }}>
            <UserIdentity
              name={otherName}
              avatarUrl={other?.avatarUrl}
              verified={other?.verified}
              size={18}
              nameSize={12}
            />
          </View>
        )}

        {/* Last message + unread badge */}
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
            {PreviewIcon && <PreviewIcon size={12} color={previewIconColor} />}
            <Text
              style={{ color: unread > 0 ? colors.foreground : colors.mutedForeground, fontSize: 12, fontWeight: unread > 0 ? "500" : "400", flex: 1 }}
              numberOfLines={1}
            >
              {previewText}
            </Text>
          </View>
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

function SkeletonList() {
  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => <ConversationRowSkeleton key={i} />)}
    </View>
  );
}

type FilterMode = "all" | "unread" | "read";

const FILTER_OPTIONS: { key: FilterMode; labelKey: string }[] = [
  { key: "all", labelKey: "chat.filter.all" },
  { key: "unread", labelKey: "chat.filter.unread" },
  { key: "read", labelKey: "chat.filter.read" },
];

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const qc = useQueryClient();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<FilterMode>("all");

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

  const allItems = (data?.items ?? []).filter((c) => !deletedIds.has(c.id));

  const items = allItems.filter((c) => {
    const unread = c.unreadCount ?? 0;
    if (filter === "unread") return unread > 0;
    if (filter === "read") return unread === 0;
    return true;
  });

  const unreadCount = allItems.filter((c) => (c.unreadCount ?? 0) > 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
            {t("chat.title")}
          </Text>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: "700" }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: isRtl ? "row-reverse" : "row",
            gap: 8,
            paddingTop: 12,
          }}
        >
          {FILTER_OPTIONS.map(({ key, labelKey }) => {
            const isActive = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  backgroundColor: isActive ? colors.primary : "transparent",
                  borderColor: isActive ? colors.primary : colors.border,
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {key === "unread" && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isActive ? colors.primaryForeground : colors.primary }} />
                )}
                {key === "read" && (
                  <CheckCheck size={12} color={isActive ? colors.primaryForeground : colors.mutedForeground} />
                )}
                <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? colors.primaryForeground : colors.foreground }}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
              icon={filter === "unread" ? CheckCheck : MessageCircle}
              title={filter === "unread" ? t("chat.filter.noUnread") : t("chat.noConversations")}
              description={filter === "unread" ? t("chat.filter.noUnreadDescription") : t("chat.noConversationsDescription")}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
