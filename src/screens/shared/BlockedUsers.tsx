/**
 * BlockedUsersScreen — manage the people the current user has blocked.
 *
 * Lists every blocked user (GET /blocks) via UniversalList, with a one-tap
 * Unblock action (confirmAlert -> DELETE /users/:id/block). The removed user
 * is optimistically stripped from the list; a rollback happens on API error.
 *
 * Reachable from Profile > Privacy > Blocked Users.
 *
 * Rules:
 *  - All UI from react-native-reusables.
 *  - Colors via useColors(). RTL via isRtl.
 *  - useFocusEffect refetch.
 *  - sonner-native toasts.
 *  - confirmAlert for destructive action.
 */
import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";
import { toast } from "@/lib/toast";
import { ShieldOff } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Skeleton } from "@/components/reusables/skeleton";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { UniversalList, type UniversalListConfig, type ListFetchResult } from "@/components/common/UniversalList";
import { UserIdentity } from "@/components/common/UserIdentity";
import { confirmAlert } from "@/utils/alert";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { usersAPI, type PublicProfile } from "@/api/users";

// ─── Skeleton row ──────────────────────────────────────────────────────────────

function BlockedUserRowSkeleton() {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton style={{ width: "55%", height: 14, borderRadius: 6 }} />
        <Skeleton style={{ width: "35%", height: 12, borderRadius: 6 }} />
      </View>
      <Skeleton style={{ width: 70, height: 34, borderRadius: 8 }} />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  /**
   * Optimistic removal state.
   *
   * removedIds: IDs of users removed optimistically (excluded from rendered list).
   * pendingId: the ID currently being unblocked (disables all Unblock buttons).
   * prevList: snapshot before the optimistic removal — used for rollback on error.
   */
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [pendingId, setPendingId] = useState<number | null>(null);
  const prevListRef = useRef<Set<number>>(new Set());

  /**
   * refreshKey bumps on focus and after a successful unblock to silently
   * re-fetch page 1 in the background via UniversalList's refreshKey prop.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  /**
   * Fetcher adapter: wraps the non-paginated getBlockedUsers API into the
   * ListFetchResult shape that UniversalList expects. Items that have been
   * optimistically removed are stripped from the result.
   *
   * The fetcher is recreated when removedIds changes so UniversalList sees
   * fresh data (we keep id="blocked-users-list" stable to avoid full resets).
   */
  const fetcher = useCallback(
    // _query is required by the UniversalList fetcher signature but
    // getBlockedUsers is non-paginated, so we ignore it.
    async (_query: import("@/components/common/UniversalList").ListQuery): Promise<ListFetchResult<PublicProfile>> => {
      const all = await usersAPI.getBlockedUsers();
      const visible = all.filter((u) => !removedIds.has(u.id));
      return {
        items: visible,
        totalCount: visible.length,
        totalPages: 1,
        currentPage: 1,
      };
    },
    [removedIds]
  );

  const handleUnblock = useCallback(
    (user: PublicProfile) => {
      confirmAlert(
        t("profile.blocked.unblockTitle"),
        t("profile.blocked.unblockMessage", { name: user.name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("profile.blocked.unblockConfirm"),
            onPress: async () => {
              // Snapshot current removed set for rollback
              prevListRef.current = new Set(removedIds);
              // Optimistically remove from list
              setPendingId(user.id);
              setRemovedIds((prev) => new Set([...prev, user.id]));

              try {
                await usersAPI.unblockUser(user.id);
                toast.success(t("profile.blocked.unblocked"));
                // Trigger a silent background refetch to sync server state
                setRefreshKey((k) => k + 1);
              } catch {
                // Rollback: restore the user to the list
                setRemovedIds(prevListRef.current);
                toast.error(t("common.error"));
              } finally {
                setPendingId(null);
              }
            },
          },
        ]
      );
    },
    [t, removedIds]
  );

  const config: UniversalListConfig<PublicProfile> = {
    id: "blocked-users-list",
    refreshKey,
    fetcher,
    keyExtractor: (item) => String(item.id),
    renderItem: ({ item }) => (
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
          onPress={() => handleUnblock(item)}
          disabled={pendingId !== null}
          style={{ minHeight: 40, paddingHorizontal: 16, opacity: pendingId !== null ? 0.5 : 1 }}
          testID={`unblock_button_${item.id}`}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: pendingId !== null ? colors.mutedForeground : colors.primary }}
          >
            {t("profile.blocked.unblockAction")}
          </Text>
        </Button>
      </View>
    ),
    skeletonCount: 6,
    SkeletonComponent: BlockedUserRowSkeleton,
    emptyIcon: ShieldOff,
    emptyTitle: t("profile.blocked.emptyTitle"),
    emptyDescription: t("profile.blocked.emptyDescription"),
    contentPaddingBottom: 40,
  };

  // safeArea=[] because this screen is rendered under a native Stack header
  // (app/(main)/_layout.tsx registers "blocked-users" with headerShown: true),
  // so the header already provides the top inset.
  return (
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      <UniversalList config={config} />
    </ScreenContainer>
  );
}
