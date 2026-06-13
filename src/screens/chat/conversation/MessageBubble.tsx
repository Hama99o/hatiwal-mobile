/**
 * MessageBubble — single message in the conversation thread.
 * Supports: text, offer (special card), meetup_proposal, system, read receipts.
 * RTL-safe: mine bubbles anchor to start side in RTL.
 */
import React from "react";
import { View, Linking, TouchableOpacity, Platform, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Check, Tag, ExternalLink, FileText } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/api/conversations";

function openInMaps(place: string) {
  const encoded = encodeURIComponent(place);
  // On native: try native maps app first (geo: for Android, maps: for iOS)
  if (Platform.OS === "android") {
    Linking.openURL(`geo:0,0?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  } else if (Platform.OS === "ios") {
    Linking.openURL(`maps:0,0?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  } else {
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  }
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
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

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { isRtl, formatTime } = useLocalization();
  const colors = useColors();

  // In RTL languages, "my" messages anchor to the left side (which is the end/right
  // of the visual reading direction). We keep isMine logic the same but flip direction.
  const bubbleAlign = isMine !== isRtl ? "flex-end" : "flex-start";
  const bubbleBg = isMine ? colors.primary : colors.secondary;
  const bubbleText = isMine ? colors.primaryForeground : colors.foreground;
  const metaColor = isMine ? "rgba(255,255,255,0.65)" : colors.mutedForeground;
  const readColor = isMine ? "rgba(255,255,255,0.9)" : colors.primary;

  if (message.kind === "system") {
    return (
      <View style={{ alignItems: "center", paddingVertical: 4, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18, textAlign: "center" }}>
          {message.body}
        </Text>
      </View>
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
      <View style={{ alignItems: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}>
        <View
          style={{
            maxWidth: "82%",
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
            <Tag size={13} color={isMine ? "#fff" : colors.mutedForeground} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.5,
                color: isMine ? "#fff" : colors.mutedForeground,
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
      </View>
    );
  }

  if (message.kind === "meetup_proposal") {
    // Parse "place | time" format
    const parts = message.body.split("|").map((s) => s.trim());
    const place = parts[0] ?? message.body;
    const time = parts[1] ?? "";

    return (
      <View style={{ alignItems: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}>
        <View
          style={{
            maxWidth: "80%",
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
            <TouchableOpacity
              onPress={() => openInMaps(place)}
              activeOpacity={0.7}
              style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}
            >
              <MapPin size={14} color={isMine ? colors.primary : colors.primary} />
              <Text style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14, color: colors.primary, textDecorationLine: "underline" }}>
                {place}
              </Text>
              <ExternalLink size={12} color={colors.primary} />
            </TouchableOpacity>

            {time ? (
              <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                <Clock size={14} color={isMine ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14 }}>
                  {time}
                </Text>
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
      </View>
    );
  }

  // Document/file bubble
  if (message.kind === "document") {
    const fileName = message.body || "file";
    const attachmentUrl = (message as any).attachmentUrl as string | null;

    return (
      <View style={{ alignItems: bubbleAlign, marginVertical: 2, marginHorizontal: 16 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (attachmentUrl) {
              Linking.openURL(attachmentUrl);
            } else {
              Alert.alert("", "File not available");
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
        </TouchableOpacity>
      </View>
    );
  }

  // Regular text bubble
  return (
    <View style={{ alignItems: bubbleAlign, marginVertical: 4, marginHorizontal: 12 }}>
      <View
        style={{
          maxWidth: "78%",
          borderRadius: 18,
          borderBottomRightRadius: isMine && !isRtl ? 6 : 18,
          borderBottomLeftRadius: !isMine && !isRtl ? 6 : 18,
          backgroundColor: bubbleBg,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: "#000",
          shadowOpacity: isMine ? 0.15 : 0.08,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: isMine ? 2 : 1,
          ...(isMine ? {} : { borderWidth: 0.5, borderColor: colors.border }),
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "400",
            color: bubbleText,
            lineHeight: 22,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {message.body}
        </Text>

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
    </View>
  );
}
