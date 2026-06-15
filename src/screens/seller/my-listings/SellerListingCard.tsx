import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import Animated from "react-native-reanimated";
import { Eye, MessageCircle, Camera } from "lucide-react-native";
import { usePulse } from "@/lib/animation";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ExpiryBadge } from "@/components/common/ExpiryBadge";
import { listingsAPI, type Listing } from "@/api/listings";
import { confirmAlert } from "@/utils/alert";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

const MY_LISTINGS_QK = "my-listings";

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
}

export function SellerListingCard({ listing }: SellerListingCardProps) {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const rowDirection = isRtl ? "row-reverse" : "row";
  const photos: string[] = listing.imageUrls?.length
    ? listing.imageUrls
    : listing.thumbnailUrl
    ? [listing.thumbnailUrl]
    : [];

  const cardWidth = Dimensions.get("window").width - 32; // screen - horizontal padding

  // ── Mutations ───────────────────────────────────────────────────────────────

  const publish = useMutation({
    mutationFn: () => listingsAPI.publishListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.publishSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const reserve = useMutation({
    mutationFn: () => listingsAPI.reserveListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.reserveSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const markSold = useMutation({
    mutationFn: () => listingsAPI.markSold(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.markSoldSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const unpublish = useMutation({
    mutationFn: () => listingsAPI.unpublishListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.unpublishSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const activate = useMutation({
    mutationFn: () => listingsAPI.activateListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.activateSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const renew = useMutation({
    mutationFn: () => listingsAPI.renewListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.renewSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteListing = useMutation({
    mutationFn: () => listingsAPI.deleteListing(listing.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      toast.success(t("listing.deleteSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmPublish"),
      t("listing.confirmPublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.publish"), onPress: () => publish.mutate() },
      ]
    );
  }, [t, publish]);

  const handleReserve = useCallback(() => {
    confirmAlert(
      t("listing.confirmReserve"),
      t("listing.confirmReserveDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.markReserved"), onPress: () => reserve.mutate() },
      ]
    );
  }, [t, reserve]);

  const handleMarkSold = useCallback(() => {
    confirmAlert(
      t("listing.confirmMarkSold"),
      t("listing.markSoldConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.markSold"), onPress: () => markSold.mutate() },
      ]
    );
  }, [t, markSold]);

  const handleDelete = useCallback(() => {
    confirmAlert(
      t("listing.confirmDelete"),
      t("listing.confirmDeleteDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteListing.mutate(),
        },
      ]
    );
  }, [t, deleteListing]);

  const handleUnpublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmUnpublish"),
      t("listing.confirmUnpublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.unpublish"), onPress: () => unpublish.mutate() },
      ]
    );
  }, [t, unpublish]);

  const handleActivate = useCallback(() => {
    confirmAlert(
      t("listing.confirmActivate"),
      t("listing.confirmActivateDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.activate"), onPress: () => activate.mutate() },
      ]
    );
  }, [t, activate]);

  const handleRenew = useCallback(() => {
    confirmAlert(
      t("listing.confirmRenew"),
      t("listing.confirmRenewDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.renew"), onPress: () => renew.mutate() },
      ]
    );
  }, [t, renew]);

  const handleEdit = useCallback(() => {
    router.push(`/(main)/listing/edit/${listing.id}` as never);
  }, [router, listing.id]);

  const handleOpenDetail = useCallback(() => {
    router.push(`/(main)/my-listings/${listing.id}` as never);
  }, [router, listing.id]);

  const isLoading =
    publish.isPending ||
    reserve.isPending ||
    markSold.isPending ||
    unpublish.isPending ||
    activate.isPending ||
    renew.isPending ||
    deleteListing.isPending;

  // ── Primary action button per status ────────────────────────────────────────

  const isExpired = !!listing.expired;

  // The single most likely next step — a prominent, clearly-labeled button.
  // An expired listing's most useful action is Renew.
  const primaryButton = (() => {
    if (isExpired) return { label: t("listing.renew"), onPress: handleRenew };
    switch (listing.status) {
      case "draft":
        return { label: t("listing.publish"), onPress: handlePublish };
      case "active":
      case "reserved":
        return { label: t("listing.markSold"), onPress: handleMarkSold };
      default:
        return null; // sold — terminal
    }
  })();

  // Other transitions for this status — always clear TEXT labels, never icons.
  const secondaryActions: { key: string; label: string; onPress: () => void; danger?: boolean }[] = [];
  if (listing.status === "active") {
    if (isExpired) {
      secondaryActions.push({ key: "sold", label: t("listing.markSold"), onPress: handleMarkSold });
    }
    secondaryActions.push({ key: "reserve", label: t("listing.markReserved"), onPress: handleReserve });
    secondaryActions.push({ key: "unpublish", label: t("listing.unpublish"), onPress: handleUnpublish });
  }
  if (listing.status === "reserved") {
    secondaryActions.push({ key: "activate", label: t("listing.activate"), onPress: handleActivate });
  }
  secondaryActions.push({ key: "edit", label: t("common.edit"), onPress: handleEdit });
  secondaryActions.push({ key: "delete", label: t("common.delete"), onPress: handleDelete, danger: true });

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

      {/* Action buttons — clear text labels (no cryptic icons) */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {primaryButton && (
          <Button
            variant="default"
            size="sm"
            style={{ width: "100%" }}
            onPress={primaryButton.onPress}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
              {primaryButton.label}
            </Text>
          </Button>
        )}
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>
          {secondaryActions.map((a) => (
            <Button
              key={a.key}
              variant="outline"
              size="sm"
              style={styles.secondaryBtn}
              onPress={a.onPress}
              disabled={isLoading}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: a.danger ? colors.destructive : colors.foreground }}>
                {a.label}
              </Text>
            </Button>
          ))}
        </View>
      </View>
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
  secondaryBtn: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 88,
  },
  actionBtn: {
    flex: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 38,
  },
});
