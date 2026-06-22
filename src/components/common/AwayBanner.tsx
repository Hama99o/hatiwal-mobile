/**
 * AwayBanner — quiet informational banner shown when a seller has set
 * a future "away_until" date. Renders nothing when awayUntil is null/undefined
 * or when the date is in the past (should not happen — backend gates it, but
 * we guard client-side too for robustness).
 *
 * Usage:
 *   <AwayBanner awayUntil={listing.seller.sellerAwayUntil} />
 *   <AwayBanner awayUntil={profile.awayUntil} />
 */
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { PlaneTakeoff } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface AwayBannerProps {
  /** ISO-8601 datetime string of the away period end, or null/undefined if not away. */
  awayUntil?: string | null;
  /** Extra style (margin, width) applied to the outer container. */
  style?: StyleProp<ViewStyle>;
  /**
   * i18n key for the banner message. Receives `{ date }` interpolation.
   * Defaults to "seller.awayBanner" (buyer-facing: "Seller is away until {{date}}").
   * Pass "profile.away.youAreAway" for the seller's own profile view.
   */
  messageKey?: string;
}

/**
 * The ONE place the "seller is away" treatment lives. A quiet info-toned card
 * using the primary-alpha palette (soft blue) so it feels informational, not
 * alarming. RTL-aware: icon and text flip with the layout direction.
 *
 * Renders nothing when:
 *   - awayUntil is null or undefined
 *   - awayUntil is a past date (auto-expired; the backend normally screens these
 *     out but we protect client-side too)
 */
export function AwayBanner({
  awayUntil,
  style,
  messageKey = "seller.awayBanner",
}: AwayBannerProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatDate } = useLocalization();

  // Guard: nothing to show when awayUntil is absent
  if (!awayUntil) return null;

  // Guard: do not show a stale past date
  const awayDate = new Date(awayUntil);
  if (isNaN(awayDate.getTime()) || awayDate <= new Date()) return null;

  const formattedDate = formatDate(awayUntil);
  const message = t(messageKey, { date: formattedDate });

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={message}
      style={[
        {
          backgroundColor: colors.primaryAlpha,
          borderColor: colors.primary,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 10,
        },
        style,
      ]}
    >
      <PlaneTakeoff size={16} color={colors.primary} />
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: colors.primary,
          fontWeight: "500",
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {message}
      </Text>
    </View>
  );
}
