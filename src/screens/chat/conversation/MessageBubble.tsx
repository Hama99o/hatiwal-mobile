/**
 * MessageBubble — single message in the conversation thread.
 * Supports: text bubbles (mine/theirs), meetup_proposal special bubbles,
 * system messages (centered), read receipts (read_at).
 * RTL-safe: mine bubbles anchor to start side in RTL.
 */
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, Check } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/api/conversations";

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
  const bubbleBg = isMine ? colors.primary : colors.card;
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
            backgroundColor: isMine ? colors.primary + "1A" : colors.card,
            padding: 12,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isMine ? colors.primary : colors.mutedForeground,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.meetup.proposed").toUpperCase()}
          </Text>

          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <MapPin size={14} color={isMine ? colors.primary : colors.mutedForeground} />
            <Text
              style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14 }}
            >
              {place}
            </Text>
          </View>

          {time ? (
            <View
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Clock size={14} color={isMine ? colors.primary : colors.mutedForeground} />
              <Text
                style={{ flex: 1, textAlign: isRtl ? "right" : "left", fontSize: 14 }}
              >
                {time}
              </Text>
            </View>
          ) : null}

          {/* Timestamp + read receipt */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              marginTop: 2,
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
    );
  }

  // Regular text bubble
  return (
    <View style={{ alignItems: bubbleAlign, marginVertical: 2, marginHorizontal: 16 }}>
      <View
        style={{
          maxWidth: "78%",
          borderRadius: 16,
          borderBottomRightRadius: isMine && !isRtl ? 4 : 16,
          borderBottomLeftRadius: !isMine && !isRtl ? 4 : 16,
          backgroundColor: bubbleBg,
          paddingHorizontal: 12,
          paddingVertical: 8,
          ...(isMine ? {} : { borderWidth: 1, borderColor: colors.border }),
        }}
      >
        <Text
          style={{
            fontSize: 15,
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
            gap: 3,
            marginTop: 3,
          }}
        >
          <Text style={{ fontSize: 11, color: metaColor }}>
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
  );
}
