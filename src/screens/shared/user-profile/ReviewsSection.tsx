/**
 * ReviewsSection — the "Ratings & Reviews" block embedded in ProfileHeader
 * (REV2). Fetches the first few VISIBLE reviews for this user (combined,
 * both roles) and renders a "View all reviews" link to the dedicated
 * /(main)/user/[id]/reviews screen when there are more than the preview count.
 */
import React, { useCallback } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ReviewsList } from "@/components/common/ReviewsList";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { reviewsAPI } from "@/api/reviews";

const PREVIEW_COUNT = 3;

export interface ReviewsSectionProps {
  userId: number;
  onViewAll: () => void;
}

export function ReviewsSection({ userId, onViewAll }: ReviewsSectionProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const qc = useQueryClient();

  const queryKey = ["user-reviews-preview", userId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => reviewsAPI.getUserReviews(userId, { pageSize: PREVIEW_COUNT }),
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, qc])
  );

  const reviews = data?.items ?? [];
  const totalCount = data?.pagination.totalCount ?? 0;

  return (
    <View style={{ marginBottom: 4 }} testID="reviews-section">
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.foreground,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {t("reviews.sectionTitle")}
        </Text>
      </View>

      <ReviewsList reviews={reviews} isLoading={isLoading} skeletonCount={PREVIEW_COUNT} />

      {!isLoading && totalCount > reviews.length && (
        <Button
          variant="ghost"
          onPress={onViewAll}
          style={{ marginTop: 4 }}
          testID="reviews-section-view-all"
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            {t("reviews.viewAll")}
          </Text>
        </Button>
      )}
    </View>
  );
}
