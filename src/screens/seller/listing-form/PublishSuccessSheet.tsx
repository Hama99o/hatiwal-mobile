/**
 * PublishSuccessSheet — TASK-J952.
 *
 * Slide-up modal shown right after a seller PUBLISHES a listing from
 * ListingForm (create or edit-then-publish). Previously every exit path out
 * of ListingForm blew the stack away and replaced it with the Browse tab,
 * leaving a freshly-published seller with nothing but a toast at the single
 * highest-intent moment in the app. This sheet gives them a next step:
 * share the listing (word-of-mouth is the primary growth lever for a
 * marketplace with no payment/delivery), preview it as a buyer would see
 * it, or post another one right away.
 *
 * Presented by MyListingDetail (the owner detail screen) when it receives a
 * `published=1` route param from ListingForm's publish success — see
 * MyListingDetail.tsx for the param-clearing logic that keeps this sheet
 * from ever reappearing on focus or back-navigation.
 *
 * Uses a raw RN <Modal> — matches every other sheet in this project
 * (MeetupSheet / OfferSheet / BuyerPickerSheet / ReviewPromptSheet all use
 * raw Modal; @gorhom/bottom-sheet has native-only platform splits that
 * crash the web dev runner — see BuyerPickerSheet.tsx's header comment).
 *
 * Share reuses the exact same helpers ListingDetail's handleShare uses —
 * `resolveShareUrl` + `buildShareBody` from `@/utils/shareUtils` — and RN's
 * `Share.share`. No new share code.
 */
import React, { useCallback } from "react";
import { View, Modal, Pressable, Share, Platform, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Share2, Eye, Plus, X } from "lucide-react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { RemoteImage } from "@/components/common/RemoteImage";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useReduceMotion } from "@/lib/animation";
import { resolveShareUrl, buildShareBody } from "@/utils/shareUtils";
import type { Listing } from "@/api/listings";

export interface PublishSuccessSheetProps {
  visible: boolean;
  /** The just-published listing. The sheet renders nothing when this is null. */
  listing: Listing | null;
  onClose: () => void;
}

export function PublishSuccessSheet({ visible, listing, onClose }: PublishSuccessSheetProps) {
  const { t } = useTranslation();
  const { isRtl, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReduceMotion();

  // ── Share — identical helpers/pattern to ListingDetail.handleShare ────────
  const handleShare = useCallback(async () => {
    if (!listing) return;
    try {
      const url = resolveShareUrl(listing.shareUrl, listing.id, (path) => Linking.createURL(path));
      const price = formatCurrency(listing.price, listing.currency);
      const message = buildShareBody(listing.title, price, url);
      // Platform split mirrors ListingDetail: iOS omits the separate `url`
      // field (it would duplicate the link already embedded in `message`);
      // every other platform (Android) gets it as a standalone attachment.
      await Share.share(
        Platform.OS === "ios"
          ? { title: listing.title, message }
          : { title: listing.title, message, url }
      );
    } catch {
      /* user dismissed the native share sheet — not an error */
    }
  }, [listing, formatCurrency]);

  const handleViewAsBuyer = useCallback(() => {
    if (!listing) return;
    onClose();
    router.push(`/(main)/listing/${listing.id}` as never);
  }, [listing, onClose, router]);

  const handlePostAnother = useCallback(() => {
    onClose();
    router.replace("/(main)/listing/new" as never);
  }, [onClose, router]);

  if (!listing) return null;

  const thumbnailUri =
    listing.thumbnailUrl ?? listing.images?.[0] ?? listing.imageUrls?.[0] ?? null;
  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <View style={[styles.closeRow, { flexDirection: rowDir }]}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            android_ripple={{ color: colors.muted, borderless: true }}
            testID="publish-success-close"
          >
            <X size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Success icon */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Animated.View
            entering={reduceMotion ? undefined : ZoomIn.duration(350).springify().damping(14).stiffness(120)}
            style={[styles.successIcon, { backgroundColor: colors.successAlpha }]}
          >
            <CheckCircle2 size={32} color={colors.success} />
          </Animated.View>
        </View>

        <Text
          className="text-lg font-semibold"
          style={{ color: colors.foreground, textAlign: "center", marginBottom: 4 }}
        >
          {t("listing.form.publishSuccess.title")}
        </Text>
        <Text
          className="text-sm"
          style={{ color: colors.mutedForeground, textAlign: "center", marginBottom: 20 }}
        >
          {t("listing.form.publishSuccess.subtitle")}
        </Text>

        {/* Listing summary — cover thumbnail + title + PriceTag */}
        <View
          style={[
            styles.summaryRow,
            { flexDirection: rowDir, backgroundColor: colors.muted, borderColor: colors.border },
          ]}
          testID="publish-success-summary"
        >
          <RemoteImage uri={thumbnailUri} style={styles.thumb} />
          <View style={{ flex: 1, marginHorizontal: 10, minWidth: 0 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}
              numberOfLines={1}
            >
              {listing.title}
            </Text>
            <PriceTag price={listing.price} currency={listing.currency} size="sm" />
          </View>
        </View>

        <View style={{ height: 20 }} />

        <Button variant="default" onPress={handleShare} testID="publish-success-share">
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
            <Share2 size={16} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
              {t("listing.form.publishSuccess.share")}
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          onPress={handleViewAsBuyer}
          style={{ marginTop: 10 }}
          testID="publish-success-view-as-buyer"
        >
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
            <Eye size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {t("listing.form.publishSuccess.viewAsBuyer")}
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          onPress={handlePostAnother}
          style={{ marginTop: 10 }}
          testID="publish-success-post-another"
        >
          <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
            <Plus size={16} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {t("listing.form.publishSuccess.postAnother")}
            </Text>
          </View>
        </Button>

        <Button variant="ghost" onPress={onClose} style={{ marginTop: 8 }} testID="publish-success-done">
          <Text style={{ color: colors.mutedForeground }}>{t("listing.form.publishSuccess.done")}</Text>
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  handleContainer: { alignItems: "center", paddingVertical: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  closeRow: { alignItems: "center", marginBottom: 4 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  thumb: { width: 48, height: 48, borderRadius: 8 },
});
