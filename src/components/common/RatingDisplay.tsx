/**
 * RatingDisplay — the "⭐ 4.8 (45 reviews)" trust-signal summary (REV2).
 *
 * Composable, NOT a fork of UserIdentity: place it beside/under UserIdentity
 * wherever a person is shown (same pattern as VerifiedBadge/ResponseRateBadge)
 * instead of re-assembling a star + count inline. Two sizes:
 *   - "sm"  — inline next to a name (listing detail seller card, conversation rows)
 *   - "lg"  — big profile-header stat (seller/public profile)
 *
 * When reviewCount is 0 (or avgRating is null), renders the "No reviews yet"
 * empty label rather than a misleading "0.0" score.
 */
import { View, Pressable } from "react-native";
import { Star } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface RatingDisplayProps {
  avgRating: number | null | undefined;
  reviewCount: number | null | undefined;
  size?: "sm" | "lg";
  onPress?: () => void;
  testID?: string;
}

export function RatingDisplay({
  avgRating,
  reviewCount,
  size = "sm",
  onPress,
  testID,
}: RatingDisplayProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatNumber } = useLocalization();

  const count = reviewCount ?? 0;
  const hasReviews = count > 0 && avgRating != null;
  const isLarge = size === "lg";
  // "lg" is the profile-header hero stat — one of the two most-scanned trust
  // signals on the page (alongside the name) — so it gets real visual weight,
  // closer to the adjacent stat numbers (StatCell) rather than reading as meta text.
  const starSize = isLarge ? 22 : 14;
  const textSize = isLarge ? 19 : 13;

  const content = (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: isLarge ? 6 : 4,
      }}
    >
      <Star
        size={starSize}
        color={hasReviews ? colors.warning : colors.mutedForeground}
        fill={hasReviews ? colors.warning : "transparent"}
      />
      <Text
        style={{
          fontSize: textSize,
          fontWeight: hasReviews ? (isLarge ? "700" : "600") : "400",
          color: hasReviews ? colors.foreground : colors.mutedForeground,
        }}
      >
        {hasReviews
          ? t("reviews.summary", { rating: formatNumber(avgRating), count: formatNumber(count) })
          : t("reviews.empty")}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        hitSlop={8}
      >
        {content}
      </Pressable>
    );
  }

  return <View testID={testID}>{content}</View>;
}
