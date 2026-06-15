import { View, Pressable, StyleSheet } from "react-native";
import { useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Camera, MapPin, Tag, FileText } from "lucide-react-native";
import { useReduceMotion } from "@/lib/animation";

import { type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { StatusBadge, type ListingStatus } from "@/components/common/StatusBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { confirmAlert } from "@/utils/alert";

const THUMB = 54;

function smartTime(dateStr: string, lang: string): string {
  const d          = new Date(dateStr);
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const locale     = lang === "ps" ? "fa-AF" : lang === "fa" ? "fa-IR" : "en-US";
  if (d >= todayStart) {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  const weekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (d >= weekAgo) {
    return d.toLocaleDateString(locale, { weekday: "short" });
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function PulsingBadge({ count, testID }: { count: number; testID?: string }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1, true,
    );
  }, [scale, reduceMotion]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle} testID={testID}>
      <Badge label={count} variant="default" />
    </Animated.View>
  );
}

interface ConversationRowProps {
  item: Conversation;
  onDelete: (id: number) => void;
  index?: number;
}

export function ConversationRow({ item, onDelete, index = 0 }: ConversationRowProps) {
  const router          = useRouter();
  const { isRtl, lang } = useLocalization();
  const { t }           = useTranslation();
  const colors          = useColors();

  const other     = item.otherParticipant;
  const otherName = other?.name ?? "";
  const unread    = item.unreadCount ?? 0;
  const isInactive =
    item.listing?.status === "sold" || item.listing?.status === "reserved";

  // ── Preview ───────────────────────────────────────────────────────────────
  let PreviewIcon: typeof MapPin | null = null;
  let previewText = item.lastMessageBody ?? t("chat.noMessages");
  if (item.lastMessageBody) {
    switch (item.lastMessageKind) {
      case "meetup_proposal":  PreviewIcon = MapPin;   previewText = t("chat.preview.meetup");         break;
      case "meetup_accepted":  PreviewIcon = MapPin;   previewText = t("chat.preview.meetupAccepted"); break;
      case "meetup_declined":  PreviewIcon = MapPin;   previewText = t("chat.preview.meetupDeclined"); break;
      case "offer": {
        const [amount, currency] = item.lastMessageBody.split("|");
        PreviewIcon = Tag;
        previewText = t("chat.preview.offer", { amount: amount ?? "", currency: currency ?? "" });
        break;
      }
      case "offer_accepted":   PreviewIcon = Tag;      previewText = t("chat.preview.offerAccepted"); break;
      case "offer_declined":   PreviewIcon = Tag;      previewText = t("chat.preview.offerDeclined"); break;
      case "image_message":    PreviewIcon = Camera;   previewText = t("chat.preview.photo");          break;
      case "document":         PreviewIcon = FileText; previewText = t("chat.preview.file");           break;
    }
  }

  const handleLongPress = useCallback(() => {
    confirmAlert(t("chat.deleteConversation"), t("chat.deleteConversationDescription"), [
      { text: t("common.cancel"),  style: "cancel" },
      { text: t("common.delete"),  style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  }, [t, onDelete, item.id]);

  const timeLabel = item.lastMessageAt ? smartTime(item.lastMessageAt, lang) : "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View>
      {/* Unread accent strip */}
      {unread > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.accent,
            isRtl ? styles.accentRight : styles.accentLeft,
            { backgroundColor: colors.primary },
          ]}
        />
      )}

      <Pressable
        onPress={() => router.push(`/(main)/conversation/${item.id}` as never)}
        onLongPress={handleLongPress}
        android_ripple={{ color: colors.muted }}
        style={[
          styles.row,
          {
            flexDirection:     isRtl ? "row-reverse" : "row",
            backgroundColor:   unread > 0 ? colors.primaryAlpha : colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* ── Thumbnail: fixed 54×54 container, image fills via absoluteFillObject ── */}
        <View
          style={[styles.thumb, { backgroundColor: colors.muted }]}
        >
          {item.listing?.thumbnailUrl ? (
            <Image
              source={{ uri: item.listing.thumbnailUrl }}
              contentFit="cover"
              transition={200}
              style={[
                StyleSheet.absoluteFillObject,
                isInactive && styles.thumbFaded,
              ]}
            />
          ) : (
            <View style={styles.thumbIcon}>
              <Camera size={22} color={colors.mutedForeground} />
            </View>
          )}
          {isInactive && item.listing?.status && (
            <StatusBadge
              status={item.listing.status as ListingStatus}
              overlay
            />
          )}
        </View>

        {/* ── Text content ────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Title + time */}
          <View style={[styles.row1, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: isInactive ? colors.mutedForeground : colors.foreground }]}
            >
              {item.listing?.title ?? t("chat.title")}
            </Text>
            {timeLabel ? (
              <Text
                style={[
                  styles.time,
                  { color: unread > 0 ? colors.primary : colors.mutedForeground,
                    fontWeight: unread > 0 ? "600" : "400" },
                ]}
              >
                {timeLabel}
              </Text>
            ) : null}
          </View>

          {/* Participant name + verified */}
          {otherName ? (
            <View style={[styles.row2, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.mutedForeground }]}>
                {otherName}
              </Text>
              {other?.verified && <VerifiedBadge size={12} />}
            </View>
          ) : null}

          {/* Preview + unread badge */}
          <View style={[styles.row3, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={[styles.previewInner, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {PreviewIcon && <PreviewIcon size={11} color={colors.mutedForeground} />}
              <Text
                numberOfLines={1}
                style={[
                  styles.preview,
                  { color: unread > 0 ? colors.foreground : colors.mutedForeground,
                    fontWeight: unread > 0 ? "500" : "400" },
                ]}
              >
                {previewText}
              </Text>
            </View>
            {unread > 0 && (
              <PulsingBadge count={unread} testID={`unread-badge-${index}`} />
            )}
          </View>

        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  accent:      { position: "absolute", top: 0, bottom: 0, width: 3, zIndex: 1 },
  accentLeft:  { left: 0 },
  accentRight: { right: 0 },

  row: {
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    gap:               12,
  },

  // Fixed 54×54 square — layout engine enforces this, expo-image fills via absoluteFillObject
  thumb: {
    width:        THUMB,
    height:       THUMB,
    borderRadius: 10,
    overflow:     "hidden",
    flexShrink:   0,
  },
  thumbFaded: { opacity: 0.45 },
  thumbIcon:  { flex: 1, alignItems: "center", justifyContent: "center" },

  content:  { flex: 1, minWidth: 0 },

  row1: { alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 19, flex: 1 },
  time:  { fontSize: 11, flexShrink: 0, marginTop: 1 },

  row2:  { alignItems: "center", gap: 4, marginBottom: 3 },
  name:  { fontSize: 12, fontWeight: "500", flexShrink: 1 },

  row3:        { alignItems: "center", justifyContent: "space-between" },
  previewInner:{ flex: 1, alignItems: "center", gap: 4 },
  preview:     { fontSize: 12, lineHeight: 17, flex: 1 },
});
