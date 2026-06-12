// SellerListingCard — seller variant: photo, price, views/chats, per-state action, edit, delete
import React, { useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Eye, MessageCircle, Pencil, Trash2 } from "lucide-react-native";
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
import { cn } from "@/lib/utils";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

const MY_LISTINGS_QK = "my-listings";

interface SellerListingCardProps {
  listing: Listing;
  className?: string;
}

export function SellerListingCard({ listing, className }: SellerListingCardProps) {
  const { t } = useTranslation();
  const { isRtl, formatNumber } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const rowDirection = isRtl ? "row-reverse" : "row";

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

  const primaryAction = (() => {
    switch (listing.status) {
      case "draft":
        return (
          <Button
            variant="default"
            size="sm"
            style={styles.actionBtn}
            onPress={handlePublish}
            disabled={isLoading}
          >
            <Text className="text-primary-foreground text-xs font-semibold">
              {t("listing.publish")}
            </Text>
          </Button>
        );
      case "active":
        return (
          <Button
            variant="secondary"
            size="sm"
            style={styles.actionBtn}
            onPress={handleReserve}
            disabled={isLoading}
          >
            <Text className="text-secondary-foreground text-xs font-semibold">
              {t("listing.markReserved")}
            </Text>
          </Button>
        );
      case "reserved":
        return (
          <Button
            variant="default"
            size="sm"
            style={styles.actionBtn}
            onPress={handleMarkSold}
            disabled={isLoading}
          >
            <Text className="text-primary-foreground text-xs font-semibold">
              {t("listing.markSold")}
            </Text>
          </Button>
        );
      default:
        return null;
    }
  })();

  return (
    <View
      className={cn("bg-card rounded-lg border border-border overflow-hidden mb-3", className)}
    >
      <Pressable
        onPress={handleEdit}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        android_ripple={{ color: colors.muted }}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.imagePlaceholder }]}>
          <Image
            source={listing.thumbnailUrl ? { uri: listing.thumbnailUrl } : undefined}
            placeholder={BLURHASH}
            contentFit="cover"
            transition={200}
            style={styles.image}
          />
          <View
            style={[
              styles.statusOverlay,
              isRtl ? styles.statusOverlayRtl : styles.statusOverlayLtr,
            ]}
          >
            <StatusBadge status={listing.status} />
          </View>
        </View>

        <View className="p-3 gap-1.5">
          <PriceTag price={listing.price} currency={listing.currency} size="md" />

          <Text
            className="text-sm font-medium text-foreground"
            numberOfLines={2}
            style={{ textAlign: isRtl ? "right" : "left" }}
          >
            {listing.title}
          </Text>

          <View style={{ flexDirection: rowDirection, gap: 12, alignItems: "center" }}>
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
              <Eye size={12} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">
                {t("listing.viewsCount", { count: formatNumber(listing.viewsCount ?? 0) })}
              </Text>
            </View>
            {listing.conversationsCount != null && (
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 4 }}>
                <MessageCircle size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-muted-foreground">
                  {t("listing.conversationsCount", {
                    count: formatNumber(listing.conversationsCount),
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      <View className="px-3 pb-3" style={{ flexDirection: rowDirection, gap: 8 }}>
        {primaryAction}
        <Button variant="outline" size="sm" style={styles.iconBtn} onPress={handleEdit} disabled={isLoading} accessibilityLabel={t("common.edit")}>
          <Pencil size={15} color={colors.foreground} />
        </Button>
        <Button variant="outline" size="sm" style={styles.iconBtn} onPress={handleDelete} disabled={isLoading} accessibilityLabel={t("common.delete")}>
          <Trash2 size={15} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  statusOverlay: {
    position: "absolute",
    top: 8,
  },
  statusOverlayLtr: {
    left: 8,
  },
  statusOverlayRtl: {
    right: 8,
  },
  actionBtn: {
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: 36,
  },
});
