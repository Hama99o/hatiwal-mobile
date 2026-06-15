/**
 * ProfileHeader — rendered as ListHeaderComponent inside UniversalList
 * on the UserProfile screen.
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { Separator } from "@/components/reusables/separator";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useTranslation } from "react-i18next";
import { type PublicProfile } from "@/api/users";

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

  // The backend serializer sends member_since as a pre-formatted string via
  // created_at.strftime('%B %Y') (e.g. "June 2026") — NOT an ISO date.
  // Re-parsing it through new Date() is fragile and produces English month names
  // regardless of locale. Display the string verbatim; the backend is the authority.
  const memberDate = profile.memberSince ?? "—";

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Avatar + name + verified */}
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 20 }}>
        <UserIdentity
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          verified={profile.verified}
          subtitle={profile.city ?? undefined}
          size={80}
          nameSize={22}
          layout="stacked"
        />
      </View>

      {/* Stats row */}
      <View
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          marginBottom: 16,
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
          value={String(profile.soldCount)}
          label={t("profile.userProfile.soldItems")}
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
