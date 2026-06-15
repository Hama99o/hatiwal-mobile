/**
 * UserProfile — public seller profile screen.
 *
 * Trust-dossier layout:
 *   - Large avatar + name + verified badge (UserIdentity, stacked)
 *   - City subtitle, member-since date (formatDate), stats (active / sold)
 *   - Bio (if present)
 *   - Grid of active listings (UniversalList, 2-column, ListingCard tap → detail)
 *   - Three-dot menu → ReportSheet (G1) + Block/Unblock (confirmAlert)
 *
 * Route: app/(main)/user/[id].tsx
 * API:   GET /api/v1/users/:id/public_profile  (view :public)
 *        GET /api/v1/listings?user_id=:id&status=active
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MoreVertical } from "lucide-react-native";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ListingFeed, type ListingFeedViewMode } from "@/components/common/ListingFeed";
import type { ListQuery, ListFetchResult } from "@/components/common/UniversalList";
import { ReportSheet } from "@/components/common/ReportSheet";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Skeleton } from "@/components/reusables/skeleton";
import { ProfileHeader } from "./user-profile/ProfileHeader";
import { ProfileHeaderSkeleton } from "./user-profile/ProfileHeaderSkeleton";
import { ActionMenu } from "./user-profile/ActionMenu";

import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useAuthStore } from "@/stores/auth.store";
import { confirmAlert } from "@/utils/alert";

import { usersAPI } from "@/api/users";
import { listingsAPI, type Listing } from "@/api/listings";
import { useCategories } from "@/hooks/useCategories";
import { ListingFiltersBar } from "@/components/common/ListingFiltersBar";

// ─── component ───────────────────────────────────────────────────────────────

export function UserProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Support both /(main)/user/[id] and /(main)/seller/[userId] routes.
  const params = useLocalSearchParams<{ id?: string; userId?: string }>();
  const rawId = params.id ?? params.userId ?? "";
  const userId = Number(rawId);

  const [reportVisible, setReportVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  const [viewMode, setViewMode] = useState<ListingFeedViewMode>("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // ── profile query ──────────────────────────────────────────────────────────
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => usersAPI.getPublicProfile(userId),
    enabled: !!userId && !Number.isNaN(userId),
    staleTime: 1000 * 60 * 2,
  });

  // ── Categories for filter bar ──────────────────────────────────────────────
  const { data: categories } = useCategories();

  // ── Debounce search input (400ms) ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Seed isBlocked from profile response ─────────────────────────────────
  // The backend :public view does not yet include a `blocked` field (tracked as
  // a backend gap in PublicProfile interface). Once the serializer exposes it,
  // this effect will correctly initialize the toggle without any further change.
  useEffect(() => {
    if (profile?.blocked !== undefined) {
      setIsBlocked(!!profile.blocked);
    }
  }, [profile?.blocked]);

  // ── focus refetch ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["user-profile", userId] });
      setRefetchKey((k) => k + 1);
    }, [userId, qc])
  );

  // ── listings fetcher ───────────────────────────────────────────────────────
  const listingsFetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getListings({
        userId,
        status: "active",
        pageNumber: query.page,
        pageSize: query.perPage,
        search: debouncedSearch || undefined,
        categoryId: categoryId ?? undefined,
      });
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    [userId, debouncedSearch, categoryId]
  );

  // ── block / unblock ────────────────────────────────────────────────────────
  const blockMutation = useMutation({
    mutationFn: () => usersAPI.blockUser(userId),
    onSuccess: () => {
      setIsBlocked(true);
      setMenuVisible(false);
      toast.success(t("profile.userProfile.blockSuccess"));
    },
    onError: () => toast.error(t("profile.userProfile.blockFailed")),
  });

  const unblockMutation = useMutation({
    mutationFn: () => usersAPI.unblockUser(userId),
    onSuccess: () => {
      setIsBlocked(false);
      setMenuVisible(false);
      toast.success(t("profile.userProfile.unblockSuccess"));
    },
    onError: () => toast.error(t("profile.userProfile.unblockFailed")),
  });

  const handleBlockPress = useCallback(() => {
    setMenuVisible(false);
    if (isBlocked) {
      unblockMutation.mutate();
      return;
    }
    confirmAlert(
      t("profile.userProfile.blockConfirmTitle"),
      t("profile.userProfile.blockConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.userProfile.blockUser"),
          style: "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  }, [isBlocked, t, blockMutation, unblockMutation]);

  const handleReportPress = useCallback(() => {
    setMenuVisible(false);
    setReportVisible(true);
  }, []);

  const isMe = !!currentUser && currentUser.id === userId;


  // ── loading state — skeleton header + card skeletons (no bare spinner) ──────
  if (profileLoading) {
    return (
      <ScreenContainer scrollable padded={false} safeArea={[]} style={{ backgroundColor: colors.background }}>
        <HeaderBar
          title={t("profile.userProfile.title")}
          isRtl={isRtl}
          colors={colors}
          onBack={() => router.back()}
        />
        <ProfileHeaderSkeleton />
        {/* Two-column skeleton card grid */}
        <View style={{ paddingHorizontal: 12, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Skeleton style={{ flex: 1, height: 180, borderRadius: 12, backgroundColor: colors.muted }} />
            <Skeleton style={{ flex: 1, height: 180, borderRadius: 12, backgroundColor: colors.muted }} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Skeleton style={{ flex: 1, height: 180, borderRadius: 12, backgroundColor: colors.muted }} />
            <Skeleton style={{ flex: 1, height: 180, borderRadius: 12, backgroundColor: colors.muted }} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ── error state ────────────────────────────────────────────────────────────
  if (profileError || !profile) {
    return (
      <ScreenContainer scrollable={false} padded={false} safeArea={[]} style={{ backgroundColor: colors.background }}>
        <HeaderBar
          title={t("profile.userProfile.title")}
          isRtl={isRtl}
          colors={colors}
          onBack={() => router.back()}
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: colors.mutedForeground,
              textAlign: "center",
            }}
          >
            {t("profile.userProfile.loadFailed")}
          </Text>
          <Button variant="outline" onPress={() => refetchProfile()}>
            <Text>{t("common.retry")}</Text>
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky nav header */}
      <HeaderBar
        title={profile.name}
        isRtl={isRtl}
        colors={colors}
        onBack={() => router.back()}
        rightAction={
          !isMe ? (
            <Pressable
              onPress={() => setMenuVisible(true)}
              hitSlop={16}
              style={{ padding: 4 }}
              accessibilityLabel={t("common.actions")}
            >
              <MoreVertical size={22} color={colors.mutedForeground} />
            </Pressable>
          ) : undefined
        }
      />

      {/* Listings grid — ListingFeed manages scroll, view mode, and spacing */}
      <ScreenContainer scrollable={false} padded={false} safeArea={[]} style={{ flex: 1 }}>
        <ListingFeed
          id={`user-profile-listings-${userId}-${debouncedSearch}-${categoryId}-${viewMode}`}
          refreshKey={refetchKey}
          fetcher={listingsFetcher}
          viewMode={viewMode}
          skeletonCount={6}
          ListHeaderComponent={
            profile ? (
              <View>
                <ProfileHeader profile={profile} />
                <ListingFiltersBar
                  search={search}
                  onSearchChange={setSearch}
                  categories={categories}
                  categoryId={categoryId}
                  onCategoryChange={setCategoryId}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  placeholder={t("profile.userProfile.searchListings")}
                />
              </View>
            ) : null
          }
          emptyTitle={t("profile.userProfile.noListings")}
          emptyDescription={t("profile.userProfile.noListingsDescription")}
          contentPaddingBottom={40}
        />
      </ScreenContainer>

      {/* Block / report action sheet */}
      <ActionMenu
        visible={menuVisible}
        isBlocked={isBlocked}
        onClose={() => setMenuVisible(false)}
        onBlock={handleBlockPress}
        onReport={handleReportPress}
      />

      {/* Report sheet (G1) */}
      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        reportableType="User"
        reportableId={userId}
      />
    </View>
  );
}

// ─── Header bar (private to this file) ───────────────────────────────────────

interface HeaderBarProps {
  title: string;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  onBack: () => void;
  rightAction?: React.ReactNode;
}

function HeaderBar({ title, isRtl, colors, onBack, rightAction }: HeaderBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
      }}
    >
      <Pressable onPress={onBack} hitSlop={16} accessibilityRole="button">
        <ChevronLeft size={24} color={colors.foreground} />
      </Pressable>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.foreground,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {rightAction ?? null}
    </View>
  );
}
