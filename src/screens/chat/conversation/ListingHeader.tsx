/**
 * ListingHeader — pinned card at the top of a conversation thread.
 * Shows listing thumbnail, title, PriceTag, and StatusBadge so both
 * participants always remember what they're negotiating about.
 */
import React from "react";
import { View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
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

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.muted }}
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        gap: 12,
      }}
      accessibilityRole="button"
      accessibilityLabel={t("chat.openListing")}
    >
      {/* Thumbnail */}
      <Image
        source={listing.thumbnailUrl ? { uri: listing.thumbnailUrl } : undefined}
        style={{ width: 56, height: 56, borderRadius: 8 }}
        contentFit="cover"
        placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        transition={200}
      />

      {/* Info */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
          style={{ textAlign: isRtl ? "right" : "left" }}
        >
          {listing.title}
        </Text>
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PriceTag
            price={listing.price}
            currency={listing.currency}
            size="sm"
          />
          <StatusBadge status={status} />
        </View>
        {listing.location ? (
          <Text
            className="text-xs text-muted-foreground"
            numberOfLines={1}
            style={{ textAlign: isRtl ? "right" : "left" }}
          >
            {listing.location}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
