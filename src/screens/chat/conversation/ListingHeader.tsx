/**
 * ListingHeader — pinned card at the top of a conversation thread.
 * Shows listing thumbnail, title, PriceTag, and StatusBadge so both
 * participants always remember what they're negotiating about.
 *
 * When `isOwner` is true and the listing status allows a lifecycle
 * transition (active → reserve, reserved → mark sold), a compact
 * secondary action button is shown inline. Touching it either fires
 * the mutation directly (Reserve) or shows a confirmAlert first (Mark
 * Sold), then calls `onLifecycleDone` on success so the parent can
 * invalidate queries and refresh the StatusBadge in place.
 *
 * TASK-N071: when `listing.negotiable === false` and the current user
 * is NOT the owner, a quiet "Firm price" pill is shown and the offer
 * affordance in the conversation is suppressed.
 */
import React, { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, MapPin } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/reusables/badge";
import type { ListingStatus } from "@/components/common/StatusBadge";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { confirmAlert } from "@/utils/alert";
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";

interface ListingInfo {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  price?: number;
  currency?: string;
  status: string;
  location?: string;
  /**
   * Whether the seller accepts price offers.
   * true (default) — open to offers. false — price is firm.
   * When false and the current user is not the owner a quiet badge is shown
   * below the price and the offer entry point in the conversation is hidden.
   */
  negotiable?: boolean;
}

interface ListingHeaderProps {
  listing: ListingInfo;
  onPress?: () => void;
  /**
   * When true the current user is the listing's seller — show the next
   * lifecycle action inline (Reserve for active, Mark Sold for reserved).
   * Has no effect for sold/draft listings.
   */
  isOwner?: boolean;
  /**
   * Called after a successful lifecycle mutation so the parent can
   * invalidate conversation/listing queries and update the StatusBadge.
   */
  onLifecycleDone?: () => void;
}

export function ListingHeader({ listing, onPress, isOwner = false, onLifecycleDone }: ListingHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);

  const validStatuses: ListingStatus[] = ["draft", "active", "reserved", "sold"];
  const status = validStatuses.includes(listing.status as ListingStatus)
    ? (listing.status as ListingStatus)
    : "active";

  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  // Determine which lifecycle action to show for the owner
  const showReserve  = isOwner && status === "active";
  const showMarkSold = isOwner && status === "reserved";
  const showAction   = showReserve || showMarkSold;

  // TASK-N071: firm price notice — shown to the buyer (non-owner) only
  const isFirmPrice = listing.negotiable === false && !isOwner;

  const handleReserve = async () => {
    setIsLifecycleLoading(true);
    try {
      await listingsAPI.reserveListing(listing.id);
      toast.success(t("chat.listingActions.reserveSuccess"));
      onLifecycleDone?.();
    } catch {
      toast.error(t("chat.listingActions.reserveFailed"));
    } finally {
      setIsLifecycleLoading(false);
    }
  };

  const handleMarkSold = () => {
    confirmAlert(
      t("chat.listingActions.markSoldConfirmTitle"),
      t("chat.listingActions.markSoldConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.listingActions.markSoldConfirmCta"),
          style: "destructive",
          onPress: async () => {
            setIsLifecycleLoading(true);
            try {
              await listingsAPI.markSold(listing.id);
              toast.success(t("chat.listingActions.markSoldSuccess"));
              onLifecycleDone?.();
            } catch {
              toast.error(t("chat.listingActions.markSoldFailed"));
            } finally {
              setIsLifecycleLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.muted }}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: isFirmPrice ? 0 : 1,
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

        {/* Lifecycle action button — seller-owner only, active or reserved */}
        {showAction ? (
          <Pressable
            onPress={(e) => {
              // Guard: e may be undefined in test environments (RNTL fireEvent)
              if (e && typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
              if (showReserve) {
                handleReserve();
              } else {
                handleMarkSold();
              }
            }}
            disabled={isLifecycleLoading}
            hitSlop={4}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: showMarkSold ? colors.destructiveAlpha : colors.primaryAlpha,
            }}
            accessibilityRole="button"
            accessibilityLabel={showReserve ? t("chat.listingActions.reserve") : t("chat.listingActions.markSold")}
          >
            {isLifecycleLoading ? (
              <ActivityIndicator size="small" color={showMarkSold ? colors.destructive : colors.primary} />
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: showMarkSold ? colors.destructive : colors.primary,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {showReserve ? t("chat.listingActions.reserve") : t("chat.listingActions.markSold")}
              </Text>
            )}
          </Pressable>
        ) : (
          /* Affordance — tap to open listing */
          <Chevron size={18} color={colors.mutedForeground} />
        )}
      </Pressable>

      {/* Firm-price notice — shown to buyer when listing.negotiable === false.
          Sits below the header row so it never crowds the title/price.
          Counter-offer / accept / decline of an already-sent offer are not affected. */}
      {isFirmPrice && (
        <View
          testID="firm-price-chat-notice"
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.muted,
          }}
        >
          <Badge label={t("listing.firmPrice")} variant="muted" />
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              flex: 1,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.offer.firmNotice")}
          </Text>
        </View>
      )}
    </View>
  );
}
