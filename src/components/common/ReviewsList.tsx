/**
 * ReviewsList — renders a set of VISIBLE reviews (loading skeleton / empty /
 * filled). Used to embed a short preview on a profile header AND inside the
 * dedicated "all reviews" screen's UniversalList renderItem is ReviewCard
 * directly — this component is for the small embedded preview use case.
 */
import { View } from "react-native";
import { Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/reusables/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ReviewCard } from "@/components/common/ReviewCard";
import { useColors } from "@/hooks/useColors";
import type { Review } from "@/api/reviews";

export interface ReviewsListProps {
  reviews: Review[];
  isLoading?: boolean;
  /** Number of skeleton rows shown while isLoading. Default 2. */
  skeletonCount?: number;
  testID?: string;
}

function ReviewRowSkeleton() {
  const colors = useColors();
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
        <Skeleton style={{ width: 100, height: 14, borderRadius: 6 }} />
      </View>
      <Skeleton style={{ width: 90, height: 12, borderRadius: 6 }} />
      <Skeleton style={{ width: "100%", height: 14, borderRadius: 6 }} />
    </View>
  );
}

export function ReviewsList({
  reviews,
  isLoading = false,
  skeletonCount = 2,
  testID,
}: ReviewsListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View testID={testID ? `${testID}-loading` : "reviews-list-loading"}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ReviewRowSkeleton key={i} />
        ))}
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View testID={testID ? `${testID}-empty` : "reviews-list-empty"}>
        {/* compact — this is an embedded preview (ProfileHeader section), not a
            full screen, so it should read as one calm section, not a big void
            that could look like something broke. A neutral, inviting note
            matters here: a new seller with zero reviews shouldn't look "behind". */}
        <EmptyState
          icon={Star}
          title={t("reviews.empty")}
          description={t("reviews.emptyDescription")}
          compact
        />
      </View>
    );
  }

  return (
    <View testID={testID}>
      {reviews.map((review, index) => (
        <ReviewCard key={review.id} review={review} index={index} />
      ))}
    </View>
  );
}
