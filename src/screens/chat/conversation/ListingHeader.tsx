/**
 * ListingHeader — pinned card at the top of a conversation thread.
 * Shows listing thumbnail, title, PriceTag, and StatusBadge so both
 * participants always remember what they're negotiating about.
 */
import React from "react";
import { View, Pressable } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, MapPin } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ListingStatus } from "@/components/common/StatusBadge";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

interface ListingInfo {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  price?: number;
  currency?: string;
  status: string;
  location?: string;
}

interface ListingHeaderProps {
  listing: ListingInfo;
  onPress?: () => void;
}

export function ListingHeader({ listing, onPress }: ListingHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();

  const validStatuses: ListingStatus[] = ["draft", "active", "reserved", "sold"];
  const status = validStatuses.includes(listing.status as ListingStatus)
    ? (listing.status as ListingStatus)
    : "active";

  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.muted }}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        gap: 10,
      }}
      accessibilityRole="button"
      accessibilityLabel={t("chat.openListing")}
    >
      {/* Thumbnail — compact */}
      <RemoteImage
        uri={listing.thumbnailUrl}
        style={{ width: 40, height: 40, borderRadius: 8 }}
        transition={200}
      />

      {/* Info — single tight column */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {/* Row 1: title + status */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, flexShrink: 1, textAlign: isRtl ? "right" : "left" }}
            numberOfLines={1}
          >
            {listing.title}
          </Text>
          <StatusBadge status={status} />
        </View>

        {/* Row 2: price + location, tight inline */}
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PriceTag price={listing.price} currency={listing.currency} size="sm" />
          {listing.location ? (
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 2,
                flexShrink: 1,
              }}
            >
              <MapPin size={11} color={colors.mutedForeground} />
              <Text
                style={{ fontSize: 11, color: colors.mutedForeground, flexShrink: 1, textAlign: isRtl ? "right" : "left" }}
                numberOfLines={1}
              >
                {listing.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Affordance — tap to open listing */}
      <Chevron size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}
