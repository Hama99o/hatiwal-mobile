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
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 }}>
      <Text
        style={{
          fontSize: compact ? 12 : 20,
          fontWeight: "700",
          color: colors.primary,
          marginBottom: 4,
          textAlign: "center",
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.mutedForeground,
          textAlign: "center",
        }}
      >
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
      </View>

      {/* Stats row — Active Listings + Joined. The seller's confirmed
          Sold/Bought trust signal lives ONLY in the TransactionStatsBadge
          below (TASK-TX02 review fix): this grid used to ALSO show a
          "sold_count"-backed "Items Sold" cell here, printing the exact same
          number the badge already shows — a confusing duplicate readout. */}
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          marginBottom: activeLabelText ? 8 : 16,
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

      {/* TASK-TX02 — combined "Sold N · Bought N" trust signal, near the
          member-since stat cell above. TransactionStatsBadge itself renders
          null when both counts are 0, but this OUTER wrapper used to render
          unconditionally regardless — an empty View with marginBottom: 4
          still adds a stray 4px gap even with no visible content (review fix,
          LOW). Only render the wrapper when there's something to show. */}
      {(!!profile.soldCount || !!profile.boughtCount) && (
        <View style={{ paddingHorizontal: 4, marginBottom: 4 }}>
          <TransactionStatsBadge soldCount={profile.soldCount} boughtCount={profile.boughtCount} />
        </View>
      )}

      {/* Last-active recency label — quiet meta row; omitted when null */}
      {!!activeLabelText && (
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
            style={{
              fontSize: 12,
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
