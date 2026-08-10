/**
 * AllReviews — the dedicated "View all reviews" screen (REV2).
 *
 * Bidirectional reputation (REVIEWS_SYSTEM.md §4): a user has TWO reputations
 * — as a seller and as a buyer. Two tabs let a viewer pick which side to see;
 * each tab is its own paginated UniversalList (role=of_seller / of_buyer).
 *
 * Route: app/(main)/user/[id]/reviews.tsx (also reachable at /(main)/seller/*
 * via the same [id] param through the shared profile routing scheme).
 * Reused for "my own reviews" from the Profile quick action (isMe → title
 * changes to "My reviews").
 */
import React, { useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { UniversalList, type ListQuery, type ListFetchResult } from "@/components/common/UniversalList";
import { ReviewCard } from "@/components/common/ReviewCard";
import { RatingDisplay } from "@/components/common/RatingDisplay";
import { BackButton } from "@/components/common/BackButton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useAuthStore } from "@/stores/auth.store";
import { usersAPI } from "@/api/users";
import { reviewsAPI, type Review, type ReviewRole } from "@/api/reviews";

type Tab = "of_seller" | "of_buyer";

export default function AllReviewsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { isRtl } = useLocalization();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const userId = Number(rawId);
  const isMe = !!currentUser && currentUser.id === userId;

  const [tab, setTab] = useState<Tab>("of_seller");
  const [refetchKey, setRefetchKey] = useState(0);

  // Shares the cache with UserProfile.tsx (same queryKey) — usually already warm.
  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => usersAPI.getPublicProfile(userId),
    enabled: !!userId && !Number.isNaN(userId),
  });

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["user-profile", userId] });
      setRefetchKey((k) => k + 1);
    }, [userId, qc])
  );

  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Review>> => {
      const result = await reviewsAPI.getUserReviews(userId, {
        role: tab as ReviewRole,
        pageNumber: query.page,
        pageSize: query.perPage,
      });
      return {
        items: result.items,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    [userId, tab]
  );

  const title = isMe ? t("reviews.myReviewsTitle") : t("reviews.sectionTitle");

  const ListHeaderComponent = (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <RatingDisplay avgRating={profile?.avgRating} reviewCount={profile?.reviewCount} size="lg" />
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          marginTop: 16,
          marginBottom: 8,
          backgroundColor: colors.muted,
          borderRadius: 10,
          padding: 3,
        }}
      >
        <TabPill
          label={t("reviews.asSeller")}
          active={tab === "of_seller"}
          onPress={() => setTab("of_seller")}
          colors={colors}
          testID="reviews-tab-seller"
        />
        <TabPill
          label={t("reviews.asBuyer")}
          active={tab === "of_buyer"}
          onPress={() => setTab("of_buyer")}
          colors={colors}
          testID="reviews-tab-buyer"
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            consistency): was a hand-rolled Pressable+ChevronLeft with no RTL
            flip and no accessibilityLabel — the shared BackButton provides
            both for free. */}
        <BackButton onPress={() => router.back()} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <UniversalList<Review>
        config={{
          id: `all-reviews-${userId}-${tab}-${refetchKey}`,
          fetcher,
          keyExtractor: (item) => String(item.id),
          renderItem: ({ item, index }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <ReviewCard review={item} index={index} />
            </View>
          ),
          emptyIcon: Star,
          emptyTitle: t("reviews.empty"),
          emptyDescription: t("reviews.emptyDescription"),
          ListHeaderComponent,
          contentPaddingBottom: 40,
        }}
      />
    </View>
  );
}

// ─── TabPill (private) ────────────────────────────────────────────────────────

interface TabPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  testID?: string;
}

function TabPill({ label, active, onPress, colors, testID }: TabPillProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={{
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 8,
        backgroundColor: active ? colors.card : "transparent",
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
