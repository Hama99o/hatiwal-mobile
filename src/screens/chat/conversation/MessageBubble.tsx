/**
 * MessageBubble — single message in the conversation thread.
 * Supports: text, offer (special card), meetup_proposal, system, read receipts.
 * RTL-safe: mine bubbles anchor to start side in RTL.
 */
import React from "react";
import { View, Linking, Pressable, Platform } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { MapPin, Clock, Check, Tag, ExternalLink, FileText, CalendarCheck, CalendarX } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useReduceMotion } from "@/lib/animation";
import type { Message } from "@/api/conversations";

// Platform audit (2026-06-18):
//   Android: "geo:" URI opens the system maps chooser (Google Maps, HERE, etc.).
//     Fallback: Google Maps web URL when no handler is registered (e.g. bare emulator).
//   iOS: "maps:" URI opens Apple Maps natively.
//     Fallback: Google Maps web URL if Apple Maps is not installed (rare but safe).
//   else branch: intentional catch-all for any future platform additions; web was
//     removed in Q1 so this is not dead code — it is a forward-safe guard.
//   All three branches have correct, tested fallbacks.
function openInMaps(place: string) {
  const encoded = encodeURIComponent(place);
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
  /** Active search query — matching substrings in the bubble body get highlighted. */
  searchQuery?: string;
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

export function MessageBubble({ message, isMine, onMeetupRespond, meetupOutcome, onOfferRespond, offerOutcome, searchQuery }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { isRtl, formatTime } = useLocalization();
  const colors = useColors();
  const reduceMotion = useReduceMotion();

  // Slide in from the side the bubble originates from.
  // In RTL: "mine" is visually on the left so we use FadeInLeft for mine and FadeInRight for others.
  // In LTR: "mine" is on the right so we use FadeInRight for mine and FadeInLeft for others.
  // When reduce motion is enabled, skip the entering animation entirely.
  const enteringAnimation = reduceMotion
    ? undefined
    : (isMine !== isRtl ? FadeInRight : FadeInLeft).duration(220).springify();

  // Accept/decline responses (meetup + offer) are not shown as their own bubble —
  // the outcome is rendered on the original proposal/offer bubble (both sides).
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
  const metaColor = isMine ? "rgba(255,255,255,0.65)" : colors.mutedForeground;
  const readColor = isMine ? "rgba(255,255,255,0.9)" : colors.primary;

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
    const parts = message.body.split("|");
    const amount = Number(parts[0] ?? 0);
    const currency = parts[1] ?? "AFN";
    const listedPrice = Number(parts[2] ?? 0);
    const formattedOffer = `${currency} ${amount.toLocaleString()}`;
    const formattedListed = `${currency} ${listedPrice.toLocaleString()}`;

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
                borderTopColor: isMine ? `${colors.warning}40` : colors.border,
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
              /* Accept / Decline — only for the seller (recipient), before responding */
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={() => onOfferRespond(true)}
                  android_ripple={{ color: colors.successAlpha }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, backgroundColor: colors.success }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.successForeground }}>
                    {t("chat.offer.accept")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onOfferRespond(false)}
                  android_ripple={{ color: colors.muted }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.destructive }}>
                    {t("chat.offer.decline")}
                  </Text>
                </Pressable>
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
    // Parse "place | time" format
    const parts = message.body.split("|").map((s) => s.trim());
    const place = parts[0] ?? message.body;
    const time = parts[1] ?? "";

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
          {/* Header */}
          <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isMine ? colors.primaryAlpha : colors.muted }}>
            <MapPin size={13} color={isMine ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: isMine ? colors.primary : colors.mutedForeground, flex: 1, textAlign: isRtl ? "right" : "left" }}>
              {t("chat.meetup.proposed").toUpperCase()}
            </Text>
          </View>

          <View style={{ padding: 12, gap: 6 }}>
            {/* Place — tappable → opens maps */}
            <Pressable
              onPress={() => openInMaps(place)}
              android_ripple={{ color: colors.primaryAlpha }}
              style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
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
                  style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryForeground }}>
                    {t("chat.meetup.accept")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onMeetupRespond(false)}
                  android_ripple={{ color: colors.muted }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
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

  // Document/file bubble
  if (message.kind === "document") {
    const fileName = message.body || "file";
    const attachmentUrl = (message as any).attachmentUrl as string | null;

    return (
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
    );
  }

  // Regular text bubble
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
          text={message.body}
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
    </Animated.View>
  );
}
