/**
 * MessageBubble — single message in the conversation thread.
 * Supports: text, offer (special card), meetup_proposal, system, read receipts,
 * soft-deleted tombstone, long-press delete for own messages.
 * RTL-safe: mine bubbles anchor to start side in RTL.
 */
import React, { useState } from "react";
import { View, Linking, Pressable, Platform, Modal, Dimensions, Text as RNText } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { MapPin, Clock, Check, Tag, ExternalLink, FileText, CalendarCheck, CalendarX, Camera, X, ArrowLeftRight, Trash2 } from "lucide-react-native";
import { Image } from "expo-image";
import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useReduceMotion } from "@/lib/animation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirmAlert } from "@/utils/alert";
import type { Message } from "@/api/conversations";
import { parseMeetupBody, type MeetupCoords } from "./meetupBody";

const { width: SCREEN_W } = Dimensions.get("window");

// Platform audit (2026-06-18, extended TASK-M263 2026-07-04):
//   When `coords` is present (an exact pin was set via "Pick on map"),
//   openInMaps drops the REAL pin instead of doing a fuzzy text search:
//     Android: "geo:<lat>,<long>?q=<lat>,<long>(<label>)" — the parenthesized
//       label is the standard Android geo URI convention for a named pin.
//     iOS: "maps:?ll=<lat>,<long>&q=<label>" — Apple Maps ll= param centers
//       exactly on the coordinate, q= supplies the pin label.
//   When `coords` is absent (legacy 2-part meetup message, no pin was set),
//   falls back to the original fuzzy text-query behavior — never breaks old
//   messages.
//   Android: "geo:" URI opens the system maps chooser (Google Maps, HERE, etc.).
//     Fallback: Google Maps web URL when no handler is registered (e.g. bare emulator).
//   iOS: "maps:" URI opens Apple Maps natively.
//     Fallback: Google Maps web URL if Apple Maps is not installed (rare but safe).
//   else branch: intentional catch-all for any future platform additions; web was
//     removed in Q1 so this is not dead code — it is a forward-safe guard.
//   All branches have correct, tested fallbacks.
function openInMaps(place: string, coords?: MeetupCoords | null) {
  const encoded = encodeURIComponent(place);

  if (coords) {
    const { lat, long } = coords;
    if (Platform.OS === "android") {
      const query = encodeURIComponent(`${lat},${long}(${place})`);
      Linking.openURL(`geo:${lat},${long}?q=${query}`).catch(() =>
        Linking.openURL(`https://maps.google.com/?q=${lat},${long}`)
      );
      return;
    } else if (Platform.OS === "ios") {
      Linking.openURL(`maps:?ll=${lat},${long}&q=${encoded}`).catch(() =>
        Linking.openURL(`https://maps.google.com/?q=${lat},${long}`)
      );
      return;
    } else {
      // Intentional catch-all: Google Maps web URL works universally.
      Linking.openURL(`https://maps.google.com/?q=${lat},${long}`);
      return;
    }
  }

  // Legacy fallback — no precise coordinates attached, fuzzy text search.
  if (Platform.OS === "android") {
    Linking.openURL(`geo:0,0?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  } else if (Platform.OS === "ios") {
    Linking.openURL(`maps:0,0?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  } else {
    // Intentional catch-all: Google Maps web URL works universally.
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  }
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  /** Called when the recipient taps Accept (true) / Decline (false) on a proposal. */
  onMeetupRespond?: (accepted: boolean) => void;
  /** Outcome of this proposal, if it has been answered (shown on the bubble). */
  meetupOutcome?: "accepted" | "declined" | null;
  /** Called when the seller taps Accept (true) / Decline (false) on an offer. */
  onOfferRespond?: (accepted: boolean) => void;
  /** Outcome of this offer, if it has been answered. */
  offerOutcome?: "accepted" | "declined" | null;
  /**
   * Called when the recipient taps "Counter" on an `offer` or `offer_counter`
   * bubble — opens the shared counter-offer sheet pre-filled from this
   * message. Passed for `offer` (seller countering the buyer) and, since
   * TASK-C381, for `offer_counter` too (the buyer countering the seller's
   * counter, so a negotiation can run more than one round).
   */
  onOfferCounter?: () => void;
  /**
   * TASK-O947: true while a response to ANY offer/counter in this thread is
   * already in flight — greys out and disables Accept/Decline/Counter so a
   * fast double-tap can never fire two responses (and, on Accept, never
   * triggers the reserve-after-accept prompt twice).
   */
  offerActionsDisabled?: boolean;
  /** Active search query — matching substrings in the bubble body get highlighted. */
  searchQuery?: string;
  /**
   * Called when the author confirms deletion of their own message.
   * The parent handles the optimistic update + rollback.
   */
  onDeleteMessage?: () => void;
}

/**
 * Splits `text` by the search query (case-insensitive) and renders each segment,
 * wrapping matching parts with a highlight background using `warningAlpha`.
 */
function HighlightedText({
  text,
  query,
  baseStyle,
  colors,
}: {
  text: string;
  query: string;
  baseStyle: object;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  // Trim so that leading/trailing whitespace in the query never causes a mismatch
  // between what the filter selected (uses .trim()) and what we highlight here.
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return <Text style={baseStyle}>{text}</Text>;
  }

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
        if (isMatch) {
          return (
            <Text
              key={index}
              style={[
                baseStyle,
                {
                  backgroundColor: colors.warningAlpha,
                  borderRadius: 3,
                  // Use warning color for highlighted text so it's readable on both themes
                  color: colors.warning,
                  fontWeight: "700",
                },
              ]}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index} style={baseStyle}>{part}</Text>;
      })}
    </Text>
  );
}

/** Two-tick read indicator rendered as overlapping Check icons */
function ReadReceipt({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Check size={11} color={color} />
      <Check size={11} color={color} style={{ marginLeft: -5 }} />
    </View>
  );
}

/**
 * Fullscreen image viewer modal — reuses the same pattern as ListingGallery's fullscreen modal.
 * Single image only (chat photos are one-at-a-time), tap close or back to dismiss.
 */
function FullscreenImageViewer({
  uri,
  visible,
  onClose,
}: {
  uri: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.photoViewerBg }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 14,
            paddingHorizontal: 16,
            backgroundColor: colors.darkScrimHeavy,
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor: colors.overlayButtonBg,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          >
            <X size={22} color={colors.overlayForeground} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Full-screen image */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            height: screenHeight - 80,
          }}
        >
          <Image
            source={{ uri }}
            contentFit="contain"
            transition={300}
            style={{ width: "100%", height: "100%" }}
            cachePolicy="memory-disk"
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Renders a photo message inline — rounded image, max 70% bubble width,
 * tappable to open fullscreen viewer.
 */
function ImageMessageBubble({
  message,
  isMine,
  bubbleAlign,
  metaColor,
  readColor,
  colors,
  enteringAnimation,
  onLongPress,
}: {
  message: Message;
  isMine: boolean;
  bubbleAlign: string;
  metaColor: string;
  readColor: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  enteringAnimation: any;
  /** Long-press handler that opens the delete action sheet for own messages. */
  onLongPress?: () => void;
}) {
  const { t } = useTranslation();
  const { isRtl, formatTime } = useLocalization();
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const attachmentUrl = message.attachmentUrl ?? null;
  const maxImageWidth = Math.round(SCREEN_W * 0.68);

  return (
    <>
      <Animated.View
        entering={enteringAnimation}
        style={{ alignItems: bubbleAlign as any, marginVertical: 2, marginHorizontal: 12 }}
      >
        <Pressable
          onPress={() => {
            if (attachmentUrl) {
              setFullscreenVisible(true);
            } else {
              toast.error(t("chat.photo.notAvailable"));
            }
          }}
          onLongPress={onLongPress}
          delayLongPress={400}
          android_ripple={{ color: colors.primaryAlpha }}
          style={{
            maxWidth: maxImageWidth,
            borderRadius: 14,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: isMine ? colors.primary : colors.border,
            backgroundColor: colors.muted,
            // min 44px touch target
            minHeight: 44,
          }}
          accessibilityRole="imagebutton"
          accessibilityLabel={t("chat.photo.viewFullscreen")}
        >
          {attachmentUrl ? (
            <View>
              <Image
                source={{ uri: attachmentUrl }}
                contentFit="cover"
                transition={300}
                placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
                cachePolicy="memory-disk"
                style={{
                  width: maxImageWidth,
                  height: Math.round(maxImageWidth * 0.75),
                  borderRadius: 13,
                }}
              />
              {/* Timestamp + read receipt overlay on the image */}
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: isRtl ? undefined : 8,
                  left: isRtl ? 8 : undefined,
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: colors.darkScrim,
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, color: colors.overlayForeground }}>
                  {formatTime(message.createdAt)}
                </Text>
                {isMine ? (
                  message.readAt ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Check size={11} color={colors.overlayForeground} />
                      <Check size={11} color={colors.overlayForeground} style={{ marginLeft: -5 }} />
                    </View>
                  ) : (
                    <Check size={11} color={colors.overlayForeground} />
                  )
                ) : null}
              </View>
            </View>
          ) : (
            /* Placeholder while image is uploading / not yet available */
            <View
              style={{
                width: maxImageWidth,
                height: Math.round(maxImageWidth * 0.75),
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.muted,
              }}
            >
              <Camera size={32} color={colors.mutedForeground} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6 }}>
                {t("chat.photo.loading")}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {attachmentUrl && (
        <FullscreenImageViewer
          uri={attachmentUrl}
          visible={fullscreenVisible}
          onClose={() => setFullscreenVisible(false)}
        />
      )}
    </>
  );
}

export function MessageBubble({ message, isMine, onMeetupRespond, meetupOutcome, onOfferRespond, offerOutcome, onOfferCounter, offerActionsDisabled, searchQuery, onDeleteMessage }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { isRtl, formatTime, formatCurrency } = useLocalization();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [deleteMenuVisible, setDeleteMenuVisible] = useState(false);

  // Slide in from the side the bubble originates from.
  // In RTL: "mine" is visually on the left so we use FadeInLeft for mine and FadeInRight for others.
  // In LTR: "mine" is on the right so we use FadeInRight for mine and FadeInLeft for others.
  // When reduce motion is enabled, skip the entering animation entirely.
  const enteringAnimation = reduceMotion
    ? undefined
    : (isMine !== isRtl ? FadeInRight : FadeInLeft).duration(220).springify();

  // Accept/decline responses (meetup + offer) are not shown as their own bubble —
  // the outcome is rendered on the original proposal/offer/counter bubble (both sides).
  if (
    message.kind === "meetup_accepted" ||
    message.kind === "meetup_declined" ||
    message.kind === "offer_accepted" ||
    message.kind === "offer_declined"
  ) {
    return null;
  }

  // In RTL languages, "my" messages anchor to the left side (which is the end/right
  // of the visual reading direction). We keep isMine logic the same but flip direction.
  const bubbleAlign = isMine !== isRtl ? "flex-end" : "flex-start";
  const bubbleBg = isMine ? colors.primary : colors.secondary;
  const bubbleText = isMine ? colors.primaryForeground : colors.foreground;
  // On the "mine" bubble (primary background) meta + read receipts use the
  // theme's on-primary color so they stay dark-mode-correct — no hardcoded rgba.
  const metaColor = isMine ? colors.primaryForeground : colors.mutedForeground;
  const readColor = isMine ? colors.primaryForeground : colors.primary;

  // ── Tombstone: soft-deleted message ──────────────────────────────────────────
  // Both participants see the tombstone bubble — no body/attachment exposed.
  if (message.deleted) {
    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ alignItems: bubbleAlign, marginVertical: 4, marginHorizontal: 12 }}
      >
        <View
          style={{
            maxWidth: "78%",
            borderRadius: 18,
            borderBottomRightRadius: isMine && !isRtl ? 6 : 18,
            borderBottomLeftRadius: !isMine && !isRtl ? 6 : 18,
            backgroundColor: colors.muted,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderWidth: 0.5,
            borderColor: colors.border,
          }}
          accessibilityLabel={t("chat.message.deleted")}
        >
          <Text
            style={{
              fontSize: 14,
              fontStyle: "italic",
              color: colors.mutedForeground,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.message.deleted")}
          </Text>
          <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2, textAlign: isRtl ? "right" : "left" }}>
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // ── Long-press delete menu (bottom-slide modal) ───────────────────────────────
  // Only shown for own non-deleted messages that have a delete callback.
  const handleLongPress = () => {
    if (isMine && onDeleteMessage && !message.deleted) {
      setDeleteMenuVisible(true);
    }
  };

  const handleConfirmDelete = () => {
    setDeleteMenuVisible(false);
    confirmAlert(
      t("chat.message.deleteConfirm"),
      "",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.message.deleteConfirmCta"),
          style: "destructive",
          onPress: () => onDeleteMessage?.(),
        },
      ]
    );
  };

  // Shared bottom-slide "delete message" action sheet — reused by every
  // deletable bubble kind (text, document, image_message) so long-press
  // delete is not silently text-only.
  const deleteSheetModal = isMine && onDeleteMessage && (
    <Modal
      visible={deleteMenuVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDeleteMenuVisible(false)}
    >
      <View
        style={{ flex: 1, backgroundColor: colors.darkScrim }}
        onTouchEnd={() => setDeleteMenuVisible(false)}
      >
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            // Clear the Android system nav bar — Math.max keeps the existing
            // 32pt minimum on devices with no bottom inset.
            paddingBottom: Math.max(insets.bottom, 32) + 12,
          }}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 4 }}>
            <Pressable
              onPress={handleConfirmDelete}
              android_ripple={{ color: colors.destructiveAlpha }}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                paddingVertical: 14,
                gap: 12,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("chat.message.deleteAction")}
            >
              <Trash2 size={20} color={colors.destructive} />
              <RNText style={{ fontSize: 15, color: colors.destructive, fontWeight: "600", flex: 1 }}>
                {t("chat.message.deleteAction")}
              </RNText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (message.kind === "system") {
    // System messages center-align with a fade-in; no directional slide.
    return (
      <Animated.View
        entering={reduceMotion ? undefined : FadeInLeft.duration(220)}
        style={{ alignItems: "center", paddingVertical: 4, paddingHorizontal: 24 }}
      >
        <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18, textAlign: "center" }}>
          {message.body}
        </Text>
      </Animated.View>
    );
  }

  if (message.kind === "offer") {
    // Body format: "amount|currency|listedPrice"
    // message.body is only null for a deleted message, already handled above.
    const parts = (message.body ?? "").split("|");
    const amount = Number(parts[0] ?? 0);
    const currency = parts[1] ?? "AFN";
    const listedPrice = Number(parts[2] ?? 0);
    // Localized currency (Arabic-Indic digits + locale grouping in ps/fa) per
    // mobile.prompt.md §4 — never raw toLocaleString.
    const formattedOffer = formatCurrency(amount, currency);
    const formattedListed = formatCurrency(listedPrice, currency);

    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ flexDirection: "row", justifyContent: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}
      >
        <View
          style={{
            maxWidth: "82%",
            // minWidth prevents the web flexbox min-content collapse that wrapped
            // the amount + Accept/Decline buttons character-by-character.
            minWidth: 240,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: isMine ? colors.warning : colors.border,
            backgroundColor: isMine ? colors.warningAlpha : colors.secondary,
            overflow: "hidden",
          }}
        >
          {/* Header bar */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: isMine ? colors.warning : colors.muted,
            }}
          >
            <Tag size={13} color={isMine ? colors.warningForeground : colors.mutedForeground} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.5,
                color: isMine ? colors.warningForeground : colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("chat.offer.label").toUpperCase()}
            </Text>
          </View>

          {/* Offer amount */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
            <Text
              style={{
                fontSize: 11,
                color: isMine ? colors.warning : colors.mutedForeground,
                fontWeight: "600",
                textAlign: isRtl ? "right" : "left",
                marginBottom: 2,
              }}
            >
              {t("chat.offer.yourOffer")}
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: isMine ? colors.warning : colors.foreground,
                textAlign: isRtl ? "right" : "left",
                letterSpacing: -0.5,
              }}
            >
              {formattedOffer}
            </Text>

            {listedPrice > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  marginTop: 3,
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                {t("chat.offer.listedAt", { price: formattedListed })}
              </Text>
            )}

            {/* No payment note */}
            <View
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: isMine ? colors.warningAlpha : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                  lineHeight: 16,
                }}
              >
                {t("chat.offer.noPayment")}
              </Text>
            </View>

            {/* Outcome — shown to both sides once the seller responds */}
            {/* Offer actions — shown only when no outcome yet */}
            {offerOutcome ? (
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: offerOutcome === "accepted" ? colors.successAlpha : colors.destructiveAlpha,
                }}
              >
                {offerOutcome === "accepted" ? (
                  <CalendarCheck size={14} color={colors.success} />
                ) : (
                  <CalendarX size={14} color={colors.destructive} />
                )}
                <Text style={{ fontSize: 12, fontWeight: "700", color: offerOutcome === "accepted" ? colors.success : colors.destructive }}>
                  {offerOutcome === "accepted" ? t("chat.offer.accepted") : t("chat.offer.declined")}
                </Text>
              </View>
            ) : !isMine && onOfferRespond ? (
              /* Accept / Decline / Counter — seller sees all three actions before responding.
                 TASK-O947: all three are disabled + dimmed while ANY offer response in this
                 thread is in flight (offerActionsDisabled) — never a double-tap. */
              <View style={{ gap: 6, marginTop: 8, opacity: offerActionsDisabled ? 0.5 : 1 }}>
                {/* Accept + Decline row */}
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}>
                  <Pressable
                    onPress={() => onOfferRespond(true)}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.successAlpha }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.success }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.successForeground }}>
                      {t("chat.offer.accept")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onOfferRespond(false)}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.muted }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.destructive }}>
                      {t("chat.offer.decline")}
                    </Text>
                  </Pressable>
                </View>
                {/* Counter button — full width, below Accept/Decline */}
                {onOfferCounter && (
                  <Pressable
                    onPress={onOfferCounter}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.warningAlpha }}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 44,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: colors.warning,
                      flexDirection: isRtl ? "row-reverse" : "row",
                      gap: 6,
                    }}
                  >
                    <ArrowLeftRight size={14} color={colors.warning} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.warning }}>
                      {t("chat.offer.counter")}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* Timestamp */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 10, color: metaColor }}>
                {formatTime(message.createdAt)}
              </Text>
              {isMine ? (
                message.readAt ? (
                  <ReadReceipt color={readColor} />
                ) : (
                  <Check size={11} color={metaColor} />
                )
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (message.kind === "offer_counter") {
    // Counter-offer card — same pipe-encoded body format as regular offer:
    // "amount|currency|listedPrice"
    // Prefer the pre-parsed fields exposed by the serializer when available.
    // message.body is only null for a deleted message, already handled above.
    const parts = (message.body ?? "").split("|");
    const amount = message.offerAmount ?? Number(parts[0] ?? 0);
    const currency = message.offerCurrency ?? parts[1] ?? "AFN";
    const formattedCounter = formatCurrency(amount, currency);

    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ flexDirection: "row", justifyContent: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}
      >
        <View
          style={{
            maxWidth: "82%",
            minWidth: 240,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: isMine ? colors.warning : colors.border,
            backgroundColor: isMine ? colors.warningAlpha : colors.secondary,
            overflow: "hidden",
          }}
        >
          {/* Header bar */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: isMine ? colors.warning : colors.muted,
            }}
          >
            <ArrowLeftRight size={13} color={isMine ? colors.warningForeground : colors.mutedForeground} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.5,
                color: isMine ? colors.warningForeground : colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("chat.offer.counterLabel").toUpperCase()}
            </Text>
          </View>

          {/* Counter amount */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
            <Text
              style={{
                fontSize: 11,
                color: isMine ? colors.warning : colors.mutedForeground,
                fontWeight: "600",
                textAlign: isRtl ? "right" : "left",
                marginBottom: 2,
              }}
            >
              {t("chat.offer.counteredAt")}
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: isMine ? colors.warning : colors.foreground,
                textAlign: isRtl ? "right" : "left",
                letterSpacing: -0.5,
              }}
            >
              {formattedCounter}
            </Text>

            {/* No payment note */}
            <View
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: isMine ? colors.warningAlpha : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                  lineHeight: 16,
                }}
              >
                {t("chat.offer.noPayment")}
              </Text>
            </View>

            {/* Outcome — shown to both sides once the buyer responds to the counter */}
            {offerOutcome ? (
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: offerOutcome === "accepted" ? colors.successAlpha : colors.destructiveAlpha,
                }}
              >
                {offerOutcome === "accepted" ? (
                  <CalendarCheck size={14} color={colors.success} />
                ) : (
                  <CalendarX size={14} color={colors.destructive} />
                )}
                <Text style={{ fontSize: 12, fontWeight: "700", color: offerOutcome === "accepted" ? colors.success : colors.destructive }}>
                  {offerOutcome === "accepted" ? t("chat.offer.accepted") : t("chat.offer.declined")}
                </Text>
              </View>
            ) : !isMine && onOfferRespond ? (
              /* Accept / Decline / Counter — the recipient of a counter-offer sees
                 all three actions, the same way the original offer does, so a
                 negotiation can run more than one round (TASK-C381: the buyer can
                 counter the seller's counter, and vice versa). TASK-O947: all
                 three are disabled + dimmed while ANY offer response in this
                 thread is in flight (offerActionsDisabled). */
              <View style={{ gap: 6, marginTop: 8, opacity: offerActionsDisabled ? 0.5 : 1 }}>
                {/* Accept + Decline row */}
                <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}>
                  <Pressable
                    onPress={() => onOfferRespond(true)}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.successAlpha }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.success }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.successForeground }}>
                      {t("chat.offer.accept")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onOfferRespond(false)}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.muted }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.destructive }}>
                      {t("chat.offer.decline")}
                    </Text>
                  </Pressable>
                </View>
                {/* Counter button — full width, below Accept/Decline (TASK-C381) */}
                {onOfferCounter && (
                  <Pressable
                    onPress={onOfferCounter}
                    disabled={offerActionsDisabled}
                    android_ripple={{ color: colors.warningAlpha }}
                    accessibilityRole="button"
                    accessibilityLabel={t("chat.offer.counterBack")}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 44,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: colors.warning,
                      flexDirection: isRtl ? "row-reverse" : "row",
                      gap: 6,
                    }}
                  >
                    <ArrowLeftRight size={14} color={colors.warning} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.warning }}>
                      {t("chat.offer.counter")}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* Timestamp */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 10, color: metaColor }}>
                {formatTime(message.createdAt)}
              </Text>
              {isMine ? (
                message.readAt ? (
                  <ReadReceipt color={readColor} />
                ) : (
                  <Check size={11} color={metaColor} />
                )
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (message.kind === "meetup_proposal") {
    // Parse "place | time" (legacy) or "place | time | lat,long" (TASK-M263)
    // via the shared, tested helper — tolerates malformed/missing coords.
    // message.body is only null for a deleted message, already handled above.
    const { place, time, coords } = parseMeetupBody(message.body);

    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ flexDirection: "row", justifyContent: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}
      >
        <View
          style={{
            maxWidth: "80%",
            minWidth: 240,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: isMine ? colors.primary : colors.border,
            backgroundColor: isMine ? colors.primaryAlpha : colors.secondary,
            overflow: "hidden",
          }}
        >
          {/* Header — a small filled pin badge appears when the proposer
              attached a precise map pin (TASK-M263), distinguishing this
              from a legacy text-only place name. */}
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isMine ? colors.primaryAlpha : colors.muted }}>
            <MapPin size={13} color={isMine ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: isMine ? colors.primary : colors.mutedForeground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
              {t("chat.meetup.proposed").toUpperCase()}
            </Text>
            {coords ? (
              <View
                accessibilityLabel={t("chat.meetup.locationSet")}
                testID="meetup-precise-pin-badge"
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: isMine ? colors.primary : colors.primaryAlpha,
                }}
              >
                <MapPin size={10} color={isMine ? colors.primaryForeground : colors.primary} fill={isMine ? colors.primaryForeground : colors.primary} />
              </View>
            ) : null}
          </View>

          <View style={{ padding: 12, gap: 6 }}>
            {/* Place — tappable → opens maps. Uses REAL coordinates when a
                pin is attached; falls back to a fuzzy text search for
                legacy 2-part meetup messages. */}
            <Pressable
              onPress={() => openInMaps(place, coords)}
              android_ripple={{ color: colors.primaryAlpha }}
              style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
              accessibilityLabel={t("chat.meetup.openInMaps")}
            >
              <MapPin size={14} color={colors.primary} />
              <Text style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14, color: colors.primary, textDecorationLine: "underline" }}>
                {place}
              </Text>
              <ExternalLink size={12} color={colors.primary} />
            </Pressable>

            {time ? (
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                <Clock size={14} color={isMine ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14 }}>
                  {time}
                </Text>
              </View>
            ) : null}

            {/* Outcome — shown to BOTH sides once answered (so the proposer sees it too) */}
            {meetupOutcome ? (
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: meetupOutcome === "accepted" ? colors.successAlpha : colors.destructiveAlpha,
                }}
              >
                {meetupOutcome === "accepted" ? (
                  <CalendarCheck size={14} color={colors.success} />
                ) : (
                  <CalendarX size={14} color={colors.destructive} />
                )}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: meetupOutcome === "accepted" ? colors.success : colors.destructive,
                  }}
                >
                  {meetupOutcome === "accepted" ? t("chat.meetup.accepted") : t("chat.meetup.declined")}
                </Text>
              </View>
            ) : !isMine && onMeetupRespond ? (
              /* Accept / Decline — only for the recipient, before they respond */
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, marginTop: 6 }}>
                <Pressable
                  onPress={() => onMeetupRespond(true)}
                  android_ripple={{ color: colors.primaryAlpha }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
                    {t("chat.meetup.accept")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onMeetupRespond(false)}
                  android_ripple={{ color: colors.muted }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.destructive }}>
                    {t("chat.meetup.decline")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timestamp + read receipt */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 10, color: metaColor }}>{formatTime(message.createdAt)}</Text>
              {isMine ? (
                message.readAt ? <ReadReceipt color={readColor} /> : <Check size={11} color={metaColor} />
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Document/file bubble — long-pressable for own messages to delete
  if (message.kind === "document") {
    const fileName = message.body || "file";
    const attachmentUrl = (message as any).attachmentUrl as string | null;

    return (
      <>
        {deleteSheetModal}
        <Animated.View
          entering={enteringAnimation}
          style={{ alignItems: bubbleAlign, marginVertical: 2, marginHorizontal: 16 }}
        >
        <Pressable
          android_ripple={{ color: colors.primaryAlpha }}
          onPress={() => {
            if (attachmentUrl) {
              Linking.openURL(attachmentUrl);
            } else {
              toast.error(t("chat.document.notAvailable"));
            }
          }}
          onLongPress={handleLongPress}
          delayLongPress={400}
          testID="message-bubble-document-pressable"
          style={{
            maxWidth: "78%",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isMine ? colors.primary : colors.border,
            backgroundColor: isMine ? colors.primaryAlpha : colors.secondary,
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: isMine ? colors.primary : colors.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={20} color={isMine ? colors.primaryForeground : colors.mutedForeground} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }} numberOfLines={2}>
              {fileName}
            </Text>
            <Text style={{ fontSize: 11, color: colors.primary, textAlign: isRtl ? "right" : "left" }}>
              {t("chat.document.tap")}
            </Text>
          </View>
          <View style={{ flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <Text style={{ fontSize: 10, color: metaColor }}>{formatTime(message.createdAt)}</Text>
            {isMine ? (message.readAt ? <ReadReceipt color={readColor} /> : <Check size={11} color={metaColor} />) : null}
          </View>
        </Pressable>
        </Animated.View>
      </>
    );
  }

  // Image message bubble — tap to open fullscreen, long-press to delete (own messages)
  if (message.kind === "image_message") {
    return (
      <>
        {deleteSheetModal}
        <ImageMessageBubble
          message={message}
          isMine={isMine}
          bubbleAlign={bubbleAlign}
          metaColor={metaColor}
          readColor={readColor}
          colors={colors}
          enteringAnimation={enteringAnimation}
          onLongPress={handleLongPress}
        />
      </>
    );
  }

  // Regular text bubble — long-pressable for own messages to delete
  return (
    <>
      {/* Delete action bottom-sheet modal */}
      {deleteSheetModal}

      <Animated.View
        entering={enteringAnimation}
        style={{ alignItems: bubbleAlign, marginVertical: 4, marginHorizontal: 12 }}
      >
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={400}
          android_ripple={isMine && onDeleteMessage ? { color: colors.primaryAlpha } : undefined}
          style={{ maxWidth: "78%" }}
          accessibilityRole="none"
          testID="message-bubble-pressable"
        >
          <View
            style={{
              borderRadius: 18,
              borderBottomRightRadius: isMine && !isRtl ? 6 : 18,
              borderBottomLeftRadius: !isMine && !isRtl ? 6 : 18,
              backgroundColor: bubbleBg,
              paddingHorizontal: 14,
              paddingVertical: 10,
              shadowColor: colors.shadow,
              shadowOpacity: isMine ? 0.15 : 0.08,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: isMine ? 2 : 1,
              ...(isMine ? {} : { borderWidth: 0.5, borderColor: colors.border }),
            }}
          >
            <HighlightedText
              text={message.body ?? ""}
              query={searchQuery ?? ""}
              baseStyle={{
                fontSize: 15,
                fontWeight: "400",
                color: bubbleText,
                lineHeight: 22,
                textAlign: isRtl ? "right" : "left",
              }}
              colors={colors}
            />

            {/* Timestamp + read receipt row */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 5,
              }}
            >
              <Text style={{ fontSize: 12, color: metaColor, fontWeight: "400" }}>
                {formatTime(message.createdAt)}
              </Text>
              {isMine ? (
                message.readAt ? (
                  <ReadReceipt color={readColor} />
                ) : (
                  <Check size={12} color={metaColor} />
                )
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
}
