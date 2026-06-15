import React, { useState, useCallback, useMemo } from "react";
import { View, FlatList, Pressable, Modal } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, MoreVertical, Search, X, Flag, ShieldBan, Store, Clock } from "lucide-react-native";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { ListingCard } from "@/components/common/ListingCard";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ReportSheet } from "@/components/common/ReportSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { ProfileHeaderSkeleton } from "@/screens/shared/user-profile/ProfileHeaderSkeleton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { confirmAlert } from "@/utils/alert";
import { useListItemEntering } from "@/lib/animation";
import { usersAPI } from "@/api/users";
import { listingsAPI, type Listing } from "@/api/listings";
import { Category } from "@/api/categories";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryName } from "@/hooks/useCategoryName";
import { useAuthStore } from "@/stores/auth.store";

type Params = { userId: string };

export function SellerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRtl, formatDate } = useLocalization();
  const currentUser = useAuthStore((s) => s.user);

  const { userId: rawId } = useLocalSearchParams<Params>();
  const userId = Number(rawId);

  // Stagger entrance animation for the listings grid
  const getEntering = useListItemEntering();

  const [isBlocked, setIsBlocked] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  // Get category name in current language
  const getCategoryName = useCategoryName();

  // Fetch public seller profile
  const { data: profile, isLoading: profileLoading, error, refetch } = useQuery({
    queryKey: ["seller-profile", userId],
    queryFn: () => usersAPI.getPublicProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch seller's ACTIVE listings only
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["seller-listings", userId],
    queryFn: () =>
      listingsAPI.getListings({
        userId: Number(userId),
        status: "active",
        pageSize: 50,
      }),
    enabled: !!userId && !!profile,
  });

  // Fetch categories
  const { data: categoriesData } = useCategories();

  const allListings = listingsData?.items || [];
  const categories = categoriesData || [];

  // Filter listings by category and search
  const filteredListings = useMemo(() => {
    let filtered = allListings;

    if (selectedCategoryId) {
      filtered = filtered.filter((item: Listing) => item.categoryId === selectedCategoryId);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((item: Listing) =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allListings, selectedCategoryId, searchText]);

  const isLoading = profileLoading || listingsLoading;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const blockMutation = useMutation({
    mutationFn: () => usersAPI.blockUser(userId),
    onSuccess: () => {
      setIsBlocked(true);
      setMenuVisible(false);
      toast.success(t("chat.block.blockSuccess"));
    },
    onError: () => toast.error(t("chat.block.blockFailed")),
  });

  const unblockMutation = useMutation({
    mutationFn: () => usersAPI.unblockUser(userId),
    onSuccess: () => {
      setIsBlocked(false);
      setMenuVisible(false);
      toast.success(t("chat.block.unblockSuccess"));
    },
    onError: () => toast.error(t("chat.block.unblockFailed")),
  });

  const handleBlockPress = () => {
    confirmAlert(
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

  const handleReportPress = () => {
    setMenuVisible(false);
    setReportVisible(true);
  };

  const isMe = currentUser && currentUser.id === userId;

  if (isLoading && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Sticky header skeleton */}
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
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <ProfileHeaderSkeleton />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 8,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }}>
            {t("profile.sellerProfile.title")}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Text style={{ fontSize: 16, color: colors.mutedForeground, textAlign: "center", marginBottom: 16 }}>
            {t("profile.sellerProfile.loadFailed")}
          </Text>
          <Button onPress={() => refetch()}>
            <Text>{t("common.retry")}</Text>
          </Button>
        </View>
      </View>
    );
  }

  const categoryOptions = [
    { id: null, name: t("common.all"), nameEn: "", namePs: "", nameFa: "" },
    ...categories,
  ] as (Category & { id: null | number })[];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
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
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }}>
          {profile.name}
        </Text>

        {/* Options Menu - 3 dots button */}
        {!isMe && (
          <Pressable
            onPress={() => setMenuVisible(true)}
            hitSlop={16}
            style={{ padding: 4 }}
          >
            <MoreVertical size={24} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Listings Grid */}
      <FlatList
        data={filteredListings}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: 20 }}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        ListHeaderComponent={
          <View>
            {/* Seller Header Card */}
            <View style={{ alignItems: "center", gap: 8, marginBottom: 24, marginTop: 20 }}>
              <UserIdentity
                name={profile.name}
                avatarUrl={profile.avatarUrl}
                verified={profile.verified}
                subtitle={profile.city}
                size={80}
                nameSize={20}
                layout="stacked"
              />
              {/* Response time badge — only when threshold is met */}
              {profile.responseTimeLabel != null && (
                <View
                  style={{
                    flexDirection: isRtl ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <Clock size={12} color={colors.mutedForeground} />
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {t(`profile.sellerProfile.responseTime.${profile.responseTimeLabel}`)}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats Row */}
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: 4 }}>
                  {profile.soldCount}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  {t("profile.stats.sold")}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: 4 }}>
                  {profile.listingsCount}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  {t("profile.stats.active")}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: colors.primary, marginBottom: 4, fontWeight: "700" }}>
                  {profile.memberSince ? formatDate(new Date(profile.memberSince)) : "—"}
                </Text>
                <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                  {t("profile.userProfile.joined")}
                </Text>
              </View>
            </View>

            {/* Bio */}
            {profile.bio && (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 20, textAlign: isRtl ? "right" : "left" }}>
                  {profile.bio}
                </Text>
              </View>
            )}

            {/* Search Bar */}
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                backgroundColor: colors.muted,
                borderRadius: 12,
                paddingHorizontal: 12,
                marginBottom: 16,
                minHeight: 44,
                gap: 8,
              }}
            >
              <Search size={16} color={colors.mutedForeground} />
              <Input
                placeholder={t("profile.userProfile.searchListings")}
                placeholderTextColor={colors.mutedForeground}
                value={searchText}
                onChangeText={setSearchText}
                style={{
                  flex: 1,
                  fontSize: 14,
                  borderWidth: 0,
                  backgroundColor: "transparent",
                  paddingHorizontal: 0,
                  paddingVertical: 0,
                  minHeight: 0,
                  textAlign: isRtl ? "right" : "left",
                }}
              />
              {searchText ? (
                <Pressable onPress={() => setSearchText("")} hitSlop={8}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            {/* Category Filter Tabs */}
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 8,
                marginBottom: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {categoryOptions.map((category) => (
                <Pressable
                  key={category.id || "all"}
                  onPress={() => setSelectedCategoryId(category.id as number | null)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedCategoryId === category.id ? colors.primary : colors.card,
                    borderWidth: selectedCategoryId === category.id ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: selectedCategoryId === category.id ? colors.primaryForeground : colors.foreground,
                    }}
                    numberOfLines={1}
                  >
                    {category.id === null ? t("common.all") : getCategoryName(category as Category)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Listings Title */}
            {filteredListings.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.mutedForeground }}>
                  {t("profile.userProfile.listingsCount", { count: filteredListings.length })}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={getEntering(index)} style={{ flex: 1 }}>
            <ListingCard
              listing={item}
              index={index}
              onPress={() => router.push(`/(main)/listing/${item.id}`)}
            />
          </Animated.View>
        )}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <EmptyState
            icon={Store}
            title={
              searchText
                ? t("common.noResults")
                : t("profile.sellerProfile.noListings")
            }
            description={
              searchText
                ? undefined
                : t("profile.userProfile.noListingsDescription")
            }
          />
        }
      />

      {/* Report Sheet — G1: full report flow for users */}
      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        reportableType="User"
        reportableId={userId}
      />

      {/* Menu Modal - Slides up from bottom */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.darkScrim }} onTouchEnd={() => setMenuVisible(false)}>
          {/* Menu Sheet */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: 32,
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* Menu Items */}
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {/* Block/Unblock Option */}
              <Pressable
                onPress={() => {
                  setMenuVisible(false);
                  if (isBlocked) {
                    unblockMutation.mutate();
                  } else {
                    handleBlockPress();
                  }
                }}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  gap: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <ShieldBan size={20} color={isBlocked ? colors.mutedForeground : colors.destructive} />
                <Text style={{ fontSize: 15, color: isBlocked ? colors.mutedForeground : colors.destructive, fontWeight: "600", flex: 1 }}>
                  {isBlocked ? t("chat.block.unblockUser") : t("chat.block.blockUser")}
                </Text>
              </Pressable>

              {/* Report Option */}
              <Pressable
                onPress={handleReportPress}
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  gap: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Flag size={20} color={colors.destructive} />
                <Text style={{ fontSize: 15, color: colors.destructive, fontWeight: "600", flex: 1 }}>
                  {t("report.title") || "Report User"}
                </Text>
              </Pressable>

              {/* Cancel Option */}
              <Pressable
                onPress={() => setMenuVisible(false)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 15, color: colors.foreground, textAlign: "center", fontWeight: "600" }}>
                  {t("common.cancel") || "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
