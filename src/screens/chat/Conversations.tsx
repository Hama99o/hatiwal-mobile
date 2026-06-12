import { View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { conversationsAPI, Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/common/EmptyState";
import { MessageCircle } from "lucide-react-native";

function ConversationRow({ item }: { item: Conversation }) {
  const router = useRouter();
  const { formatDateTime, isRtl } = useLocalization();
  const { t } = useTranslation();
  const colors = useColors();

  const other = item.otherParticipant;
  const unread = item.unreadCount ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/conversation/${item.id}`)}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.muted,
        marginRight: isRtl ? 0 : 12,
        marginLeft: isRtl ? 12 : 0,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 18 }}>
          {other?.fullName?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, color: colors.foreground }}>
            {other?.fullName ?? t("chat.unknownUser")}
          </Text>
          {item.lastMessageAt && (
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              {formatDateTime(item.lastMessageAt)}
            </Text>
          )}
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
          {item.lastMessageBody ?? t("chat.noMessages")}
        </Text>
      </View>
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
        }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: "700" }}>
            {unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ConversationsScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationsAPI.list,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          {t("chat.title")}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationRow item={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={MessageCircle}
              title={t("chat.noConversations")}
              description={t("chat.noConversationsDescription")}
            />
          }
        />
      )}
    </View>
  );
}
