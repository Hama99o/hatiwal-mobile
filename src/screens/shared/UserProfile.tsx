/**
 * UserProfile — public seller profile screen.
 *
 * Trust-dossier layout:
 *   - Large avatar + name + verified badge (UserIdentity, stacked)
 *   - City subtitle, member-since date (formatDate), stats (active / sold)
 *   - Bio (if present)
 *   - Active / Sold segmented control (RNR Button-based)
 *   - Active tab: grid of active listings with search + category filter
 *   - Sold tab: grid of sold listings (dimmed StatusBadge) — empty state when none
 *   - Three-dot menu → ReportSheet (G1) + Block/Unblock (confirmAlert)
 *
 * Route: app/(main)/user/[id].tsx
 * API:   GET /api/v1/users/:id/public_profile  (view :public)
 *        GET /api/v1/listings?user_id=:id          (active tab)
 *        GET /api/v1/users/:id/sold_listings        (sold tab)
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable, Platform, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react-native";
import * as Linking from "expo-linking";
import { toast } from "@/lib/toast";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ListingFeed, type ListingFeedViewMode } from "@/components/common/ListingFeed";
import type { ListQuery, ListFetchResult } from "@/components/common/UniversalList";
import { ReportSheet } from "@/components/common/ReportSheet";
import { BackButton } from "@/components/common/BackButton";
import { ListingsIllustration } from "@/components/common/empty-illustrations";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Skeleton } from "@/components/reusables/skeleton";
import { ProfileHeader } from "./user-profile/ProfileHeader";
import { ProfileHeaderSkeleton } from "./user-profile/ProfileHeaderSkeleton";
import { ActionMenu } from "./user-profile/ActionMenu";

import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useAuthStore } from "@/stores/auth.store";
import { confirmAlert } from "@/utils/alert";
import { resolveProfileShareUrl } from "@/utils/shareUtils";

import { usersAPI } from "@/api/users";
import { listingsAPI, type Listing } from "@/api/listings";
import { useCategories } from "@/hooks/useCategories";
import { ListingFiltersBar } from "@/components/common/ListingFiltersBar";
import { getSoldShowcaseEmptyState } from "@/utils/soldShowcaseEmptyState";

// ─── Tab type ────────────────────────────────────────────────────────────────

type ProfileTab = "active" | "sold";

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
  const [activeTab, setActiveTab] = useState<ProfileTab>("active");
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

  // ── active listings fetcher ────────────────────────────────────────────────
  const activeListingsFetcher = useCallback(
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

  // ── sold listings fetcher ─────────────────────────────────────────────────
  const soldListingsFetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Listing>> => {
      const result = await listingsAPI.getSoldListings(userId, query.page);
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    [userId]
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

  const handleShareProfile = useCallback(async () => {
    setMenuVisible(false);
    if (!profile) return;
    try {
      // Prefer the server-supplied https share URL; fall back to a hatiwal://seller/<id>
      // deep link so the share always carries a tappable link regardless of backend config.
      const url = resolveProfileShareUrl(
        profile.shareUrl,
        userId,
        (path) => Linking.createURL(path)
      );
      const name = profile.name;
      const message = t("profile.sellerProfile.share.body", { name, url });
      // On iOS, passing both `message` (which already embeds the URL) and a
      // separate `url` field causes some share targets to render the link twice
      // or drop the message body. Pass `url` only on Android.
      await Share.share(
        Platform.OS === "ios"
          ? { title: t("profile.sellerProfile.share.title"), message }
          : { title: t("profile.sellerProfile.share.title"), message, url }
      );
    } catch {
      // User dismissed the share sheet — no-op.
    }
  }, [profile, userId, t]);

  const isMe = !!currentUser && currentUser.id === userId;

  // ── tab switch helpers ─────────────────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: ProfileTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      // Reset filters when switching tabs so the new feed is clean
      setSearch("");
      setDebouncedSearch("");
      setCategoryId(null);
      // Sold tab is a photo-first showcase — always grid. Reset to grid on every switch.
      if (tab === "sold") {
        setViewMode("grid");
      }
    },
    [activeTab]
  );

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

  // ── derived feed key — changes whenever any filter or tab changes ─────────
  const activeFeedId = `user-profile-active-${userId}-${debouncedSearch}-${categoryId}-${viewMode}`;
  const soldFeedId   = `user-profile-sold-${userId}`;

  // TASK-TX02 review fix (MAJOR): don't let the Sold tab's empty state say
  // "No sold items yet" when the trust badge above already shows a non-zero
  // lifetime soldCount — see soldShowcaseEmptyState.ts for why they can differ.
  const soldEmptyState = getSoldShowcaseEmptyState(profile.soldCount, t);

  // ── shared ListHeaderComponent ─────────────────────────────────────────────
  // Rendered at the top of whichever tab is active.
  const ListHeaderComponent = (
    <View>
      <ProfileHeader profile={profile} />
      {/* Active / Sold segmented tab control */}
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isRtl={isRtl}
        colors={colors}
        labelActive={t("profile.userProfile.tabs.active")}
        labelSold={t("profile.userProfile.tabs.sold")}
      />
      {/* Filter bar — only shown on the Active tab */}
      {activeTab === "active" && (
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
      )}
    </View>
  );

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

      <ScreenContainer scrollable={false} padded={false} safeArea={[]} style={{ flex: 1 }}>
        {activeTab === "active" ? (
          <ListingFeed
            id={activeFeedId}
            refreshKey={refetchKey}
            fetcher={activeListingsFetcher}
            viewMode={viewMode}
            skeletonCount={6}
            ListHeaderComponent={ListHeaderComponent}
            emptyTitle={t("profile.userProfile.noListings")}
            emptyDescription={t("profile.userProfile.noListingsDescription")}
            contentPaddingBottom={40}
          />
        ) : (
          <ListingFeed
            id={soldFeedId}
            refreshKey={refetchKey}
            fetcher={soldListingsFetcher}
            viewMode={viewMode}
            showStatus={true}
            skeletonCount={6}
            ListHeaderComponent={ListHeaderComponent}
            // Review fix (TASK-TX02, DR MED — "the Sold tab needs emptyIcon
            // and emptyAction"): matches the icon+action treatment every
            // other ListingFeed empty state in the app already gets (e.g.
            // MyListings.tsx). The action only makes sense on the seller's
            // OWN empty Sold tab — a buyer viewing a stranger's profile has
            // nothing to do about it, so it's omitted when `!isMe`.
            //
            // Review fix (TASK-TX02, LOW — "empty-state polish"): the house
            // pattern for a full-tab empty state is the SVG illustration
            // (Browse.tsx, MyListings.tsx both use one), not a bare Lucide
            // icon — reusing ListingsIllustration here matches the very
            // screen the action navigates to. The action label is now the
            // shared "Post a listing" ACTION verb (not the "My Listings"
            // destination name) so it reads as a CTA in all 3 locales.
            emptyIllustration={<ListingsIllustration size={96} />}
            emptyTitle={soldEmptyState.title}
            emptyDescription={soldEmptyState.description}
            emptyAction={
              isMe
                ? {
                    label: t("listing.postListing"),
                    onPress: () => router.push("/(main)/listing/new" as never),
                  }
                : undefined
            }
            contentPaddingBottom={40}
          />
        )}
      </ScreenContainer>

      {/* Block / report / share action sheet */}
      <ActionMenu
        visible={menuVisible}
        isBlocked={isBlocked}
        onClose={() => setMenuVisible(false)}
        onBlock={handleBlockPress}
        onReport={handleReportPress}
        onShare={!isMe ? handleShareProfile : undefined}
      />

      {/* Report sheet (G1) */}
      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        reportableType="User"
        reportableId={userId}
        onBlocked={() => setIsBlocked(true)}
      />
    </View>
  );
}

// ─── TabBar (private) ─────────────────────────────────────────────────────────

interface TabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  labelActive: string;
  labelSold: string;
}

function TabBar({ activeTab, onTabChange, isRtl, colors, labelActive, labelSold }: TabBarProps) {
  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: colors.muted,
        borderRadius: 10,
        padding: 3,
      }}
    >
      <TabPill
        label={labelActive}
        active={activeTab === "active"}
        onPress={() => onTabChange("active")}
        colors={colors}
      />
      <TabPill
        label={labelSold}
        active={activeTab === "sold"}
        onPress={() => onTabChange("sold")}
        colors={colors}
      />
    </View>
  );
}

interface TabPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function TabPill({ label, active, onPress, colors }: TabPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        backgroundColor: active ? colors.card : "transparent",
        // Subtle shadow when active so the pill appears raised
        ...(active
          ? {
              shadowColor: colors.foreground,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            }
          : {}),
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? "600" : "400",
          color: active ? colors.foreground : colors.mutedForeground,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
      {/* Review fix (TASK-TX02, LOW — shared-component rule + RTL
          consistency + a11y): was a hand-rolled Pressable+ChevronLeft with
          no accessibilityLabel — replaced with the shared BackButton, which
          now owns the RTL chevron flip AND the accessibilityLabel/testID
          every other back affordance in the app already gets. */}
      <BackButton onPress={onBack} />
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
