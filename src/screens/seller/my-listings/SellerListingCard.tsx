import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import Animated from "react-native-reanimated";
import { Eye, MessageCircle, Camera, MoreHorizontal } from "lucide-react-native";
import { usePulse } from "@/lib/animation";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { BuyerPickerSheet } from "@/components/common/BuyerPickerSheet";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { ListingActionsSheet } from "@/components/common/ListingActionsSheet";
import { type Listing } from "@/api/listings";
import { useListingLifecycle } from "@/hooks/useListingLifecycle";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

/** Animated shimmer shown behind each photo until it finishes loading.
 *  Uses usePulse() so the shimmer is skipped when Reduce Motion is enabled. */
function PhotoSkeleton({ width }: { width: number }) {
  const animStyle = usePulse();
  return (
    <Animated.View
      style={[animStyle, { position: "absolute", top: 0, left: 0, width, aspectRatio: 4 / 3 }]}
    />
  );
}

interface PhotoSlideProps {
  uri: string;
  width: number;
  bgColor: string;
}

function PhotoSlide({ uri, width, bgColor }: PhotoSlideProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={{ width, aspectRatio: 4 / 3, backgroundColor: bgColor }}>
      {!loaded && <PhotoSkeleton width={width} />}
      <RemoteImage
        uri={uri}
        style={[styles.galleryImage, { width }]}
        transition={200}
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

interface SellerListingCardProps {
  listing: Listing;
  /** Called after any successful mutation so the parent list can refresh immediately. */
  onMutated?: () => void;
}

export function SellerListingCard({ listing, onMutated }: SellerListingCardProps) {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [moreVisible, setMoreVisible] = useState(false);

  const rowDirection = isRtl ? "row-reverse" : "row";
  const photos: string[] = listing.imageUrls?.length
    ? listing.imageUrls
    : listing.thumbnailUrl
    ? [listing.thumbnailUrl]
    : [];

  const cardWidth = Dimensions.get("window").width - 32; // screen - horizontal padding

  // TASK-L863: all seven lifecycle mutations, confirmAlert copy, invalidation
  // and BuyerPickerSheet/ReviewPromptSheet wiring live in this ONE hook —
  // shared with MyListingDetail so the two surfaces can never disagree again.
  const { primaryAction, moreActions, isBusy, buyerPicker, reviewPrompt } = useListingLifecycle({
    listingId: listing.id,
    listing,
    onDone: onMutated,
  });

  const handleOpenDetail = () => {
    router.push(`/(main)/my-listings/${listing.id}` as never);
  };

  const isExpired = !!listing.expired;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Photo gallery — tap card body to open owner detail screen */}
      <Pressable onPress={handleOpenDetail} accessibilityRole="button" accessibilityLabel={listing.title}>
        {photos.length > 0 ? (
          <View style={[styles.galleryWrapper, { backgroundColor: colors.muted }]}>
            <FlatList
              ref={flatListRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              getItemLayout={(_, index) => ({
                length: cardWidth,
                offset: cardWidth * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                setActiveSlide(slide);
              }}
              renderItem={({ item }) => (
                <PhotoSlide uri={item} width={cardWidth} bgColor={colors.muted} />
              )}
            />

            {/* Status badge — show "Expired" instead of "Active" when expired */}
            <View
              style={[
                styles.statusBadge,
                isRtl ? styles.statusBadgeRtl : styles.statusBadgeLtr,
              ]}
            >
              {isExpired ? (
                <View style={{ backgroundColor: colors.warning, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.warningForeground }}>
                    {t("listing.expiredBadge")}
                  </Text>
                </View>
              ) : (
                <StatusBadge status={listing.status} />
              )}
            </View>

            {/* Dot indicators — only shown when > 1 photo */}
            {photos.length > 1 && (
              <View style={styles.dotsRow}>
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === activeSlide
                            ? colors.overlayForeground
                            : colors.overlayDotInactive,
                        width: i === activeSlide ? 8 : 6,
                        height: i === activeSlide ? 8 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.noPhotoBox,
              { backgroundColor: colors.muted },
            ]}
          >
            <Camera size={28} color={colors.mutedForeground} />
            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
              {t("listing.noPhoto")}
            </Text>
          </View>
        )}

        {/* Text info */}
        <View style={styles.info}>
          <PriceTag price={listing.price} currency={listing.currency} size="md" />

          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.foreground,
              textAlign: isRtl ? "right" : "left",
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>

          {/* Proactive 30-day expiry countdown — sellers see it coming, not just after. */}
          <View style={{ marginTop: 6, alignItems: isRtl ? "flex-end" : "flex-start" }}>
            <ExpiryBadge
              expiresAt={listing.expiresAt}
              expired={listing.expired}
              status={listing.status}
            />
          </View>

          {/* TASK-R418: compact "Reserved for {name}" / "Sold to {name}" line —
              reserved/sold rows only, text-only (no second avatar stack on the
              card; the full buyer card with avatar lives on the owner detail
              screen). Renders nothing when there is no recorded buyer. */}
          {listing.sale && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: listing.sale.status === "sold" ? colors.mutedForeground : colors.warning,
                marginTop: 6,
                textAlign: isRtl ? "right" : "left",
              }}
              numberOfLines={1}
              testID="seller-card-sale-line"
            >
              {listing.sale.status === "sold"
                ? t("listing.sale.soldTo", { name: listing.sale.buyer.name })
                : t("listing.sale.reservedFor", { name: listing.sale.buyer.name })}
            </Text>
          )}

          <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
              <Eye size={12} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {t("listing.viewsCount", { count: formatNumber(listing.viewsCount ?? 0) })}
              </Text>
            </View>
            {listing.conversationsCount != null && (
              <Pressable
                onPress={() => router.push({
                  pathname: "/(main)/listing-conversations/[id]" as never,
                  params: { id: String(listing.id), listingTitle: listing.title },
                } as never)}
                hitSlop={8}
                style={[styles.metaItem, { flexDirection: rowDirection }]}
              >
                <MessageCircle size={12} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                  {t("listing.conversationsCount", { count: formatNumber(listing.conversationsCount) })}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>

      {/* TASK-L863: exactly two controls — the primary lifecycle button (or,
          on a terminal `sold` listing with no primary, More alone takes the
          full width) plus a compact "More" trigger for everything else. */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <View style={{ flexDirection: rowDirection, gap: 8 }}>
          {primaryAction && (
            <Button
              variant="default"
              size="sm"
              style={{ flex: 1 }}
              onPress={primaryAction.onPress}
              disabled={isBusy}
              testID="seller-card-primary-action"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
                {primaryAction.label}
              </Text>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            style={primaryAction ? styles.moreBtnCompact : { flex: 1 }}
            onPress={() => setMoreVisible(true)}
            disabled={isBusy}
            testID="seller-card-more-action"
          >
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}>
              <MoreHorizontal size={16} color={colors.foreground} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                {t("listing.actions.more")}
              </Text>
            </View>
          </Button>
        </View>
      </View>

      {/* TASK-L863: overflow sheet for every action besides the primary */}
      <ListingActionsSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        actions={moreActions}
        disabled={isBusy}
      />

      {/* TASK-TX01: buyer picker for Reserve / Mark-sold */}
      <BuyerPickerSheet
        visible={buyerPicker.visible}
        onClose={buyerPicker.onClose}
        listingId={listing.id}
        price={listing.price}
        currency={listing.currency}
        action={buyerPicker.action}
        onConfirm={buyerPicker.onConfirm}
        isSubmitting={buyerPicker.isSubmitting}
      />

      {/* REV2: rate the buyer right after a sold sale records them */}
      <ReviewPromptSheet
        visible={reviewPrompt.visible}
        onClose={reviewPrompt.onClose}
        transactionId={reviewPrompt.transactionId}
        callerRole="seller"
        counterpartyName={reviewPrompt.buyerName}
        counterpartyAvatarUrl={reviewPrompt.buyerAvatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  galleryWrapper: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  galleryImage: {
    aspectRatio: 4 / 3,
  },
  noPhotoBox: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 10,
  },
  statusBadgeLtr: {
    left: 10,
  },
  statusBadgeRtl: {
    right: 10,
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    borderRadius: 99,
  },
  info: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  metaRow: {
    marginTop: 8,
    gap: 14,
    alignItems: "center",
  },
  metaItem: {
    alignItems: "center",
    gap: 4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 10,
  },
  moreBtnCompact: {
    minWidth: 92,
  },
});
