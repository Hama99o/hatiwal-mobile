/**
 * ReviewCard — renders one VISIBLE review: reviewer identity (via the shared
 * UserIdentity — never hand-rolled avatar/name), a 5-star row, the comment
 * (if any), and the date via useLocalization(). Used by ReviewsList and the
 * dedicated "all reviews" screen.
 */
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useListItemEntering } from "@/lib/animation";
import type { Review } from "@/api/reviews";

export interface ReviewCardProps {
  review: Review;
  /** Position within its list — drives a staggered fade-in entrance (same pattern as ListingCard). Omit for a standalone card. */
  index?: number;
}

export function ReviewCard({ review, index }: ReviewCardProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatDate } = useLocalization();
  const getEntering = useListItemEntering();

  return (
    <Animated.View
      entering={index !== undefined ? getEntering(index) : undefined}
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
      }}
      testID={`review-card-${review.id}`}
    >
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <UserIdentity
          name={review.reviewer.name}
          avatarUrl={review.reviewer.avatarUrl}
          size={36}
          nameSize={14}
        />
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          {formatDate(review.createdAt)}
        </Text>
      </View>

      <View
        style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 2 }}
        accessibilityRole="text"
        accessibilityLabel={t("reviews.starAccessibilityLabel", { count: review.rating })}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={14}
            color={n <= review.rating ? colors.warning : colors.border}
            fill={n <= review.rating ? colors.warning : "transparent"}
          />
        ))}
      </View>

      {review.comment ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.foreground,
            lineHeight: 19,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {review.comment}
        </Text>
      ) : null}
    </Animated.View>
  );
}
