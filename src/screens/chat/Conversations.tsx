import { View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { conversationsAPI, Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";

function ConversationRow({ item }: { item: Conversation }) {
  const router = useRouter();
  const { formatDateTime } = useLocalization();
  const { t } = useTranslation();

  const other = item.otherParticipant;
  const unread = item.unreadCount ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/conversation/${item.id}`)}
      style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#e5e7eb", marginRight: 12, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontWeight: "bold", color: "#374151", fontSize: 18 }}>
          {other?.fullName?.[0]?.toUpperCase() ?? "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontWeight: "600", fontSize: 15 }}>{other?.fullName ?? t("chat.unknownUser")}</Text>
          {item.lastMessageAt && (
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>{formatDateTime(item.lastMessageAt)}</Text>
          )}
        </View>
        <Text style={{ color: "#6b7280", fontSize: 13 }} numberOfLines={1}>{item.lastMessageBody ?? t("chat.noMessages")}</Text>
      </View>
      {unread > 0 && (
        <View style={{ backgroundColor: "#2563EB", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginLeft: 8 }}>
          <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>{unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ConversationsScreen() {
  const { t } = useTranslation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationsAPI.list,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ padding: 16, backgroundColor: "white" }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>{t("chat.title")}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationRow item={item} />}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#888", marginTop: 64 }}>{t("chat.noConversations")}</Text>
          }
        />
      )}
    </View>
  );
}
