/**
 * ProfileHeader — rendered as ListHeaderComponent inside UniversalList
 * on the UserProfile screen.
 */

import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Clock } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Separator } from "@/components/reusables/separator";
import { UserIdentity } from "@/components/common/UserIdentity";
import { AwayBanner } from "@/components/common/AwayBanner";
import { RatingDisplay } from "@/components/common/RatingDisplay";
import { TransactionStatsBadge } from "@/components/common/TransactionStatsBadge";
import { ResponseRateBadge } from "@/components/common/ResponseRateBadge";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useTranslation } from "react-i18next";
import { type PublicProfile } from "@/api/users";
import { getActiveLabelText } from "@/utils/activeLabelUtil";
import { ReviewsSection } from "./ReviewsSection";

interface ProfileHeaderProps {
  profile: PublicProfile;
}

function StatCell({
  value,
  label,
  colors,
  compact = false,
}: {
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
}) {
  // Review fix (TASK-TX02, LOW — typography): moved off hardcoded fontSize
  // onto the shared token scale so this grid reads as the SAME type family as
  // ProfileStatsGrid (the equivalent stats card on the own-profile screen,
  // which already uses text-xl/text-xs). The label also moves off 11px —
  // below the documented meta floor (DESIGN_SYSTEM.md §3: meta = text-xs =
  // 12) — up to text-xs.
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 }}>
      <Text
        className={compact ? "text-xs font-bold" : "text-xl font-bold"}
        style={{ color: colors.primary, marginBottom: 4, textAlign: "center" }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-xs" style={{ color: colors.mutedForeground, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  // The backend serializer sends member_since as a pre-formatted string via
  // created_at.strftime('%B %Y') (e.g. "June 2026") — NOT an ISO date.
  // Re-parsing it through new Date() is fragile and produces English month names
  // regardless of locale. Display the string verbatim; the backend is the authority.
  const memberDate = profile.memberSince ?? "—";
  const activeLabelText = getActiveLabelText(profile.lastActiveLabel, t);
  // Mirrors ResponseRateBadge's own suppression rule exactly (a 0%-rate
  // seller sends a false trust signal) so this file's spacing math always
  // matches what actually renders.
  const hasResponseRate = !!profile.responseRatePercent && !!profile.responseTimeLabel;
  const hasActiveLabel = !!activeLabelText;
  // Review fix (TASK-TX02, LOW — spacing/proximity): this used to hinge only
  // on `activeLabelText`, from before the (now-conditional) meta row below
  // the stats card existed — once that row could ALSO be populated by
  // ResponseRateBadge, the card's own marginBottom needs to account for it
  // too, or the badge ends up visually grouped with the wrong block.
  const hasMetaRow = hasResponseRate || hasActiveLabel;

  const goToAllReviews = () =>
    router.push(`/(main)/user/${profile.id}/reviews` as never);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Avatar + name + verified */}
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 12, gap: 6 }}>
        <UserIdentity
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          verified={profile.verified}
          subtitle={profile.city ?? undefined}
          size={80}
          nameSize={22}
          layout="stacked"
        />
        {/* REV2 — trust-signal rating, tappable straight to the full reviews list */}
        <RatingDisplay
          avgRating={profile.avgRating}
          reviewCount={profile.reviewCount}
          size="lg"
          onPress={goToAllReviews}
          testID="profile-header-rating"
        />
        {/* TASK-TX02 review fix (MED — visual hierarchy): elevated "pill"
            variant, centered right under the rating — this is where the
            other trust signals already cluster. Completed-sales-with-a-
            confirmed-counterparty is the strongest trust datum a stranger
            has in a no-payment marketplace, so it must not read quieter than
            the "Active Listings" cell below. Renders null when both counts
            are 0. */}
        <TransactionStatsBadge
          soldCount={profile.soldCount}
          boughtCount={profile.boughtCount}
          variant="pill"
        />
      </View>

      {/* Stats row — Active Listings + Joined. The seller's confirmed
          Sold/Bought trust signal lives in the pill above (TASK-TX02 review
          fix): this grid used to ALSO show a "sold_count"-backed "Items Sold"
          cell here, printing the exact same number — a confusing duplicate
          readout. */}
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          marginBottom: hasMetaRow ? 8 : 16,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        <StatCell
          value={String(profile.listingsCount)}
          label={t("profile.userProfile.activeListings")}
          colors={colors}
        />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <StatCell
          value={memberDate}
          label={t("profile.userProfile.joined")}
          colors={colors}
          compact
        />
      </View>

      {/* Response-rate trust signal (TASK-TX02 review fix, MED — was missing
          entirely on this screen, even though ListingDetail's seller card
          shows it: a buyer tapping through to the full profile lost a trust
          signal instead of gaining one). Quiet meta row, matching the
          recency row below it. Omitted when either field is absent/0. */}
      {hasResponseRate && (
        <View style={{ paddingHorizontal: 4, marginBottom: hasActiveLabel ? 4 : 16 }}>
          <ResponseRateBadge
            responseRatePercent={profile.responseRatePercent}
            responseTimeLabel={profile.responseTimeLabel}
          />
        </View>
      )}

      {/* Last-active recency label — quiet meta row; omitted when null.
          Always the LAST meta row when present, so it owns the trailing
          marginBottom: 16 that separates this cluster from the bio/reviews
          below. */}
      {hasActiveLabel && (
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            paddingHorizontal: 4,
          }}
        >
          <Clock size={13} color={colors.mutedForeground} />
          <Text
            className="text-xs"
            style={{
              color: colors.mutedForeground,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {activeLabelText}
          </Text>
        </View>
      )}

      {/* Away banner — rendered when the seller is currently away */}
      {!!profile.isAway && (
        <AwayBanner
          awayUntil={profile.awayUntil ?? null}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Bio */}
      {!!profile.bio && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.foreground,
              lineHeight: 22,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {profile.bio}
          </Text>
        </View>
      )}

      <View style={{ marginBottom: 16 }}>
        <Separator />
      </View>

      {/* REV2 — Ratings & Reviews section: summary + first few reviews + "View all" */}
      <ReviewsSection userId={profile.id} onViewAll={goToAllReviews} />

      <View style={{ marginBottom: 16 }}>
        <Separator />
      </View>

      {/* Section label */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: colors.foreground,
          marginBottom: 12,
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {t("profile.userProfile.activeListings")}
      </Text>
    </View>
  );
}
