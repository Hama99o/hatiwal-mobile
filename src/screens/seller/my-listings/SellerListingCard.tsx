import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, FlatList, Dimensions } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Eye, MessageCircle, Trash2, Camera } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { listingsAPI, type Listing } from "@/api/listings";
import { confirmAlert } from "@/utils/alert";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const MY_LISTINGS_QK = "my-listings";

/** Animated shimmer shown behind each photo until it finishes loading */
function PhotoSkeleton({ width }: { width: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 750 }), -1, true);
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
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
      <Image
        source={{ uri }}
        style={[styles.galleryImage, { width }]}
        placeholder={{ blurhash: BLURHASH }}
        contentFit="cover"
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

  const handleEdit = useCallback(() => {
    router.push(`/(main)/listing/edit/${listing.id}` as never);
  }, [router, listing.id]);

  const isLoading =
    publish.isPending ||
    reserve.isPending ||
    markSold.isPending ||
    deleteListing.isPending;

  // ── Primary action button per status ────────────────────────────────────────

  const primaryAction = (() => {
    switch (listing.status) {
      case "draft":
        return (
          <Button variant="default" size="sm" style={styles.actionBtn} onPress={handlePublish} disabled={isLoading}>
            <Text style={{ fontSize: 12, fontWeight: "600" }}>{t("listing.publish")}</Text>
          </Button>
        );
      case "active":
        return (
          <Button variant="secondary" size="sm" style={styles.actionBtn} onPress={handleReserve} disabled={isLoading}>
            <Text style={{ fontSize: 12, fontWeight: "600" }}>{t("listing.markReserved")}</Text>
          </Button>
        );
      case "reserved":
        return (
          <Button variant="default" size="sm" style={styles.actionBtn} onPress={handleMarkSold} disabled={isLoading}>
            <Text style={{ fontSize: 12, fontWeight: "600" }}>{t("listing.markSold")}</Text>
          </Button>
        );
      default:
        return null;
    }
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Photo gallery — tap anywhere on the card to edit */}
      <Pressable onPress={handleEdit} accessibilityRole="button" accessibilityLabel={listing.title}>
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

            {/* Status badge */}
            <View
              style={[
                styles.statusBadge,
                isRtl ? styles.statusBadgeRtl : styles.statusBadgeLtr,
              ]}
            >
              <StatusBadge status={listing.status} />
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
                            ? "#fff"
                            : "rgba(255,255,255,0.45)",
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

          <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
            <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
              <Eye size={12} color={colors.mutedForeground} />
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                {t("listing.viewsCount", { count: formatNumber(listing.viewsCount ?? 0) })}
              </Text>
            </View>
            {listing.conversationsCount != null && (
              <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
                <MessageCircle size={12} color={colors.mutedForeground} />
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  {t("listing.conversationsCount", { count: formatNumber(listing.conversationsCount) })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Action buttons */}
      <View style={[styles.actions, { flexDirection: rowDirection, borderTopColor: colors.border }]}>
        {primaryAction}
        <Button
          variant="outline"
          size="sm"
          style={styles.iconBtn}
          onPress={handleDelete}
          disabled={isLoading}
          accessibilityLabel={t("common.delete")}
        >
          <Trash2 size={15} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
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
    gap: 10,
    alignItems: "center",
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
