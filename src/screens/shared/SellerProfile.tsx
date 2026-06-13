/**
 * SellerProfile — public view of a seller's reputation and active listings.
 * Shows sold count, member since date, listing count, and block/unblock action.
 */
import React, { useState } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldBan, ShieldCheck, CheckCircle, Package, CalendarDays, AlertTriangle } from "lucide-react-native";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { usersAPI } from "@/api/users";
import { useAuthStore } from "@/stores/auth.store";
import { useCallback } from "react";

type Params = { userId: string };

export function SellerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { isRtl, formatDate } = useLocalization();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { userId: rawId } = useLocalSearchParams<Params>();
  const userId = Number(rawId);

  const [isBlocked, setIsBlocked] = useState(false);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ["seller-profile", userId],
    queryFn: () => usersAPI.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const blockMutation = useMutation({
    mutationFn: () => usersAPI.blockUser(userId),
    onSuccess: () => {
      setIsBlocked(true);
      toast.success(t("chat.block.blockSuccess"));
    },
    onError: () => toast.error(t("chat.block.blockFailed")),
  });

  const unblockMutation = useMutation({
    mutationFn: () => usersAPI.unblockUser(userId),
    onSuccess: () => {
      setIsBlocked(false);
      toast.success(t("chat.block.unblockSuccess"));
    },
    onError: () => toast.error(t("chat.block.unblockFailed")),
  });

  const handleBlock = () => {
    Alert.alert(
      t("chat.block.blockConfirmTitle"),
      t("chat.block.blockConfirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.block.blockUser"),
          style: "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  };

  const isMe = currentUser && currentUser.id === userId;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: colors.background }}>
        <AlertTriangle size={40} color={colors.mutedForeground} />
        <Text style={{ marginTop: 16, fontSize: 16, color: colors.mutedForeground, textAlign: "center" }}>
          {t("profile.sellerProfile.loadFailed")}
        </Text>
        <Button onPress={() => refetch()} style={{ marginTop: 16 }}>
          <Text>{t("common.retry")}</Text>
        </Button>
      </View>
    );
  }

  const soldText = profile.soldCount > 0
    ? t("profile.sellerProfile.soldCount", { count: profile.soldCount })
    : t("profile.sellerProfile.soldCountZero");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <View
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingTop: 32,
          paddingBottom: 24,
          paddingHorizontal: 24,
          alignItems: "center",
          gap: 12,
        }}
      >
        <UserAvatar name={profile.name} avatarUrl={profile.avatarUrl} size={80} />

        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
          {profile.name}
        </Text>

        {profile.city ? (
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center" }}>
            {profile.city}
          </Text>
        ) : null}

        {/* Trust badge row */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          {/* Sold count */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: profile.soldCount > 0 ? `${colors.primary}18` : colors.muted,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <CheckCircle size={16} color={profile.soldCount > 0 ? colors.primary : colors.mutedForeground} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: profile.soldCount > 0 ? colors.primary : colors.mutedForeground,
              }}
            >
              {soldText}
            </Text>
          </View>

          {/* Active listings count */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.muted,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <Package size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground }}>
              {t("profile.sellerProfile.activeListings", { count: profile.listingsCount })}
            </Text>
          </View>

          {/* Member since */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.muted,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <CalendarDays size={16} color={colors.mutedForeground} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground }}>
              {t("profile.sellerProfile.memberSince", { date: formatDate(profile.memberSince) })}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio if present */}
      {profile.bio ? (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            padding: 16,
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.foreground,
              lineHeight: 22,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {profile.bio}
          </Text>
        </View>
      ) : null}

      {/* Trust explanation card */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 16,
          padding: 16,
          backgroundColor: `${colors.primary}0d`,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: `${colors.primary}30`,
        }}
      >
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <ShieldCheck size={18} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
            {t("profile.sellerProfile.trustScore")}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20, textAlign: isRtl ? "right" : "left" }}>
          {soldText}
          {profile.soldCount > 0 ? " ✓" : ""}
          {"  •  "}
          {t("profile.sellerProfile.memberSince", { date: formatDate(profile.memberSince) })}
        </Text>
      </View>

      {/* Block / unblock — only shown for other users */}
      {!isMe ? (
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          {isBlocked ? (
            <TouchableOpacity
              onPress={() => unblockMutation.mutate()}
              disabled={unblockMutation.isPending}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              {unblockMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <ShieldCheck size={18} color={colors.mutedForeground} />
              )}
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
                {t("chat.block.unblockUser")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBlock}
              disabled={blockMutation.isPending}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: `${colors.destructive}40`,
                backgroundColor: `${colors.destructive}0a`,
              }}
            >
              {blockMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <ShieldBan size={18} color={colors.destructive} />
              )}
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.destructive }}>
                {t("chat.block.blockUser")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
