/**
 * BlockedUsers — manage the people the current user has blocked.
 *
 * Lists every blocked user (GET /blocks) with a one-tap Unblock action
 * (confirmAlert → DELETE /users/:id/block). Reachable from Profile › Privacy.
 *
 * All UI from react-native-reusables. Colors via useColors(). RTL via isRtl.
 * useFocusEffect refetch, sonner-native toasts, confirmAlert for the action.
 */
import React, { useCallback } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";
import { ShieldOff } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/common/EmptyState";
import { UserIdentity } from "@/components/common/UserIdentity";
import { confirmAlert } from "@/utils/alert";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { usersAPI, type PublicProfile } from "@/api/users";

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: usersAPI.getBlockedUsers,
  });

  // Fresh list on every visit (a user may have blocked/unblocked elsewhere).
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["blocked-users"] });
    }, [qc])
  );

  const unblockMutation = useMutation({
    mutationFn: (userId: number) => usersAPI.unblockUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-users"] });
      toast.success(t("profile.blocked.unblocked"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const confirmUnblock = useCallback(
    (user: PublicProfile) => {
      confirmAlert(
        t("profile.blocked.unblockTitle"),
        t("profile.blocked.unblockMessage", { name: user.name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("profile.blocked.unblockAction"),
            onPress: () => unblockMutation.mutate(user.id),
          },
        ]
      );
    },
    [t, unblockMutation]
  );

  if (isLoading) {
    return (
      <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const blocked = data ?? [];

  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      <FlatList
        style={{ flex: 1 }}
        data={blocked}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <UserIdentity
                name={item.name}
                avatarUrl={item.avatarUrl}
                verified={item.verified}
                subtitle={item.city ?? undefined}
                size={40}
              />
            </View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => confirmUnblock(item)}
              disabled={unblockMutation.isPending}
              style={{ minHeight: 40, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                {t("profile.blocked.unblockAction")}
              </Text>
            </Button>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={ShieldOff}
            title={t("profile.blocked.emptyTitle")}
            description={t("profile.blocked.emptyDescription")}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}
