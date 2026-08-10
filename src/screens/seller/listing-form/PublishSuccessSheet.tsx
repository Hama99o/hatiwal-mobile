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
 * Share reuses the exact same pattern as ListingDetail's handleShare:
 * `resolveShareUrl` from `@/utils/shareUtils` for the link, and the
 * `listing.share.body` i18n template (via `t()`) for the message body — the
 * SAME localized string ListingDetail builds, so the share text is
 * translated in ps/fa instead of a hardcoded English JS template. RN's
 * `Share.share` opens the native sheet. No new share code.
 */
import React, { useCallback, useEffect } from "react";
import { View, Modal, Pressable, Share, Platform, StyleSheet, ScrollView } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Share2, Eye, Plus, X, Camera } from "lucide-react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RemoteImage } from "@/components/common/RemoteImage";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { triggerHaptic, useReduceMotion } from "@/lib/animation";
import { resolveShareUrl } from "@/utils/shareUtils";
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

  // Design review fix (CYCLE-4, gated further in CYCLE-5): reward the seller
  // with a success haptic the moment this sheet actually becomes visible —
  // mirrors ReviewPromptSheet's own `triggerHaptic("success", ...)` on its
  // confirmation step and BACKLOG.md's animation spec ("Trigger
  // notificationAsync(Success) on successful listing publish"). Keyed to
  // `visible` (so it fires exactly once per open, never on every re-render
  // that keeps `visible` true) AND `!!listing`: `visible={true}` with
  // `listing={null}` is an explicitly-supported prop shape (the sheet
  // renders nothing per the `if (!listing) return null` guard below), and
  // without this second condition the haptic would still fire with no sheet
  // ever appearing on screen.
  useEffect(() => {
    if (visible && listing) triggerHaptic("success", reduceMotion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, !!listing]);

  // ── Share — identical pattern to ListingDetail.handleShare, including the
  // localized `listing.share.body` i18n template (not a hardcoded JS string) ──
  const handleShare = useCallback(async () => {
    if (!listing) return;
    try {
      const url = resolveShareUrl(listing.shareUrl, listing.id, (path) => Linking.createURL(path));
      const price = formatCurrency(listing.price, listing.currency);
      const message = t("listing.share.body", { title: listing.title, price, url });
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
  }, [listing, formatCurrency, t]);

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
      {/* Design review fix: `overlay` is the "sold thumbnail strip" token —
          `darkScrim` is the correct semi-transparent modal-backdrop token,
          consistent with every other raw-Modal sheet in the project
          (MeetupSheet, ListingForm's currency picker, etc). */}
      <Pressable style={[styles.backdrop, { backgroundColor: colors.darkScrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Everything below the drag handle scrolls — at large accessibility
            font sizes (or a small device) the icon + copy + summary + four
            buttons can exceed the screen height; `maxHeight` on the outer
            sheet (below) caps it and this ScrollView makes the overflow
            reachable instead of clipping it, matching every other sheet in
            the project (BuyerPickerSheet / ReportSheet / ReviewPromptSheet). */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          showsVerticalScrollIndicator={false}
        >
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
            {thumbnailUri ? (
              <RemoteImage
                uri={thumbnailUri}
                style={styles.thumb}
                accessibilityLabel={listing.title}
              />
            ) : (
              // No real photo — show the same muted icon tile every other
              // listing thumbnail uses (ListingCard/SellerListingCard/
              // ConversationRow) instead of RemoteImage's loading blurhash,
              // which would otherwise sit there forever looking like a photo
              // that never finished loading. Design review fix (CYCLE-5):
              // this tile sits ON a summary row that is ALSO `colors.muted`
              // (below) — same value in both themes — so a `muted` fill here
              // would have zero contrast against its own row and read as a
              // bare floating icon, not a thumbnail. `colors.card` (the
              // sheet's own surface) gives it a real edge in both themes.
              <View
                style={[styles.thumb, styles.noPhotoThumb, { backgroundColor: colors.card }]}
                testID="publish-success-no-photo"
              >
                <Camera size={22} color={colors.mutedForeground} />
              </View>
            )}
            <View style={{ flex: 1, marginHorizontal: 10, minWidth: 0, gap: 4 }}>
              {/* Design review fix: a StatusBadge next to the title reassures
                  the seller the listing is really live now, not just saved —
                  the one fact this whole sheet exists to confirm. The badge
                  is wrapped with `flexShrink: 0` (CYCLE-5) so a longer
                  localized status label (e.g. ps/fa "reserved"/"sold" once
                  this sheet is reused for those states) can never squeeze
                  itself — only the title truncates. */}
              <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.foreground, textAlign: isRtl ? "right" : "left", flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {listing.title}
                </Text>
                <View style={{ flexShrink: 0 }}>
                  <StatusBadge status={listing.status} />
                </View>
              </View>
              {/* CYCLE-3 DR fix: "md" (17sp/700) — the price must outrank the
                  14sp/600 title on this summary row, matching every other
                  listing surface where price is the dominant text. */}
              <PriceTag price={listing.price} currency={listing.currency} size="md" />
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
        </ScrollView>
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
    paddingTop: 4,
    // Caps the sheet so it never grows past ~88% of the screen at large
    // font sizes — matches BuyerPickerSheet/ReportSheet/ReviewPromptSheet.
    maxHeight: "88%",
  },
  scroll: {
    flexShrink: 1,
    paddingHorizontal: 20,
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
  // Design review fix: 48px read as an afterthought next to a StatusBadge +
  // PriceTag — 64px gives the cover photo the weight it deserves as the
  // seller's proof-of-listing at the highest-intent moment in the app.
  thumb: { width: 64, height: 64, borderRadius: 10 },
  noPhotoThumb: { alignItems: "center", justifyContent: "center" },
});
