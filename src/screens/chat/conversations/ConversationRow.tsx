import { View, Pressable, StyleSheet, Modal, Text as RNText } from "react-native";
import { useCallback, useEffect, useState } from "react";
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
import { Camera, MapPin, Tag, FileText, Trash2, CheckCheck, MailOpen, MoreVertical, Archive, ArchiveRestore } from "lucide-react-native";
import { useReduceMotion } from "@/lib/animation";

import { type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { StatusBadge, type ListingStatus } from "@/components/common/StatusBadge";
import { UserIdentity } from "@/components/common/UserIdentity";
import { confirmAlert } from "@/utils/alert";

const THUMB = 54;


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
  /** "inbox" (default) or "archived" — controls which menu items appear */
  tabMode?: "inbox" | "archived";
  onDelete: (id: number) => void;
  onMarkRead?: (id: number) => void;
  onMarkUnread?: (id: number) => void;
  onArchive?: (id: number) => void;
  onUnarchive?: (id: number) => void;
  index?: number;
}

export function ConversationRow({
  item,
  tabMode = "inbox",
  onDelete,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  index = 0,
}: ConversationRowProps) {
  const router                         = useRouter();
  const { isRtl, formatSmartTime }     = useLocalization();
  const { t }                          = useTranslation();
  const colors                         = useColors();
  const [menuVisible, setMenuVisible]  = useState(false);

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
    setMenuVisible(true);
  }, []);

  const handleDelete = useCallback(() => {
    setMenuVisible(false);
    confirmAlert(t("chat.deleteConversation"), t("chat.deleteConversationDescription"), [
      { text: t("common.cancel"),  style: "cancel" },
      { text: t("common.delete"),  style: "destructive", onPress: () => onDelete(item.id) },
    ]);
  }, [t, onDelete, item.id]);

  const handleMarkRead = useCallback(() => {
    setMenuVisible(false);
    onMarkRead?.(item.id);
  }, [onMarkRead, item.id]);

  const handleMarkUnread = useCallback(() => {
    setMenuVisible(false);
    onMarkUnread?.(item.id);
  }, [onMarkUnread, item.id]);

  const handleArchive = useCallback(() => {
    setMenuVisible(false);
    onArchive?.(item.id);
  }, [onArchive, item.id]);

  const handleUnarchive = useCallback(() => {
    setMenuVisible(false);
    onUnarchive?.(item.id);
  }, [onUnarchive, item.id]);

  const timeLabel = item.lastMessageAt ? formatSmartTime(item.lastMessageAt) : "";

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

      <View
        style={[
          styles.rowWrap,
          {
            flexDirection:     isRtl ? "row-reverse" : "row",
            backgroundColor:   unread > 0 ? colors.primaryAlpha : colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
      <Pressable
        onPress={() => router.push(`/(main)/conversation/${item.id}` as never)}
        onLongPress={handleLongPress}
        android_ripple={{ color: colors.muted }}
        testID={`conversation-row-${index}`}
        style={[
          styles.row,
          { flexDirection: isRtl ? "row-reverse" : "row" },
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

          {/* Participant name + verified — via shared UserIdentity (never hand-roll) */}
          {otherName ? (
            <View style={[styles.row2, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <UserIdentity
                name={otherName}
                verified={other?.verified ?? false}
                showAvatar={false}
                size={28}
                nameSize={12}
              />
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

        {/* Visible options button — makes mark-read/unread + delete discoverable
            (long-press on the row still opens the same menu for power users). */}
        <Pressable
          onPress={() => setMenuVisible(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("chat.actions.options")}
          android_ripple={{ color: colors.muted, borderless: true }}
          style={styles.kebab}
          testID={`conversation-options-${index}`}
        >
          <MoreVertical size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* ── Action menu (bottom-slide Modal) ───────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
        testID="conversation-action-menu"
      >
        <View
          style={{ flex: 1, backgroundColor: colors.darkScrim }}
          onTouchEnd={() => setMenuVisible(false)}
        >
          <View
            style={{
              position:            "absolute",
              bottom:              0,
              left:                0,
              right:               0,
              backgroundColor:     colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop:          12,
              paddingBottom:       32,
            }}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            <View style={{ paddingHorizontal: 16, gap: 4 }}>
              {/* Mark as read / unread — non-destructive */}
              {unread > 0 ? (
                <Pressable
                  onPress={handleMarkRead}
                  testID="menu-mark-read"
                  android_ripple={{ color: colors.muted }}
                  style={{
                    flexDirection:  isRtl ? "row-reverse" : "row",
                    alignItems:     "center",
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    gap:            12,
                  }}
                >
                  <CheckCheck size={20} color={colors.foreground} />
                  <RNText style={{ fontSize: 15, color: colors.foreground, fontWeight: "500", flex: 1 }}>
                    {t("chat.actions.markRead")}
                  </RNText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleMarkUnread}
                  testID="menu-mark-unread"
                  android_ripple={{ color: colors.muted }}
                  style={{
                    flexDirection:  isRtl ? "row-reverse" : "row",
                    alignItems:     "center",
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    gap:            12,
                  }}
                >
                  <MailOpen size={20} color={colors.foreground} />
                  <RNText style={{ fontSize: 15, color: colors.foreground, fontWeight: "500", flex: 1 }}>
                    {t("chat.actions.markUnread")}
                  </RNText>
                </Pressable>
              )}

              {/* Archive / Unarchive */}
              {tabMode === "inbox" ? (
                <Pressable
                  onPress={handleArchive}
                  testID="menu-archive"
                  android_ripple={{ color: colors.muted }}
                  style={{
                    flexDirection:  isRtl ? "row-reverse" : "row",
                    alignItems:     "center",
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    gap:            12,
                  }}
                >
                  <Archive size={20} color={colors.foreground} />
                  <RNText style={{ fontSize: 15, color: colors.foreground, fontWeight: "500", flex: 1 }}>
                    {t("chat.archive.archive")}
                  </RNText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleUnarchive}
                  testID="menu-unarchive"
                  android_ripple={{ color: colors.muted }}
                  style={{
                    flexDirection:  isRtl ? "row-reverse" : "row",
                    alignItems:     "center",
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    gap:            12,
                  }}
                >
                  <ArchiveRestore size={20} color={colors.foreground} />
                  <RNText style={{ fontSize: 15, color: colors.foreground, fontWeight: "500", flex: 1 }}>
                    {t("chat.archive.unarchive")}
                  </RNText>
                </Pressable>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

              {/* Delete — destructive */}
              <Pressable
                onPress={handleDelete}
                testID="menu-delete"
                android_ripple={{ color: colors.muted }}
                style={{
                  flexDirection:  isRtl ? "row-reverse" : "row",
                  alignItems:     "center",
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  gap:            12,
                }}
              >
                <Trash2 size={20} color={colors.destructive} />
                <RNText style={{ fontSize: 15, color: colors.destructive, fontWeight: "600", flex: 1 }}>
                  {t("chat.deleteConversation")}
                </RNText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  accent:      { position: "absolute", top: 0, bottom: 0, width: 3, zIndex: 1 },
  accentLeft:  { left: 0 },
  accentRight: { right: 0 },

  // Wrapper holds the row background + bottom border and lays the tap area and
  // the options (⋮) button side by side.
  rowWrap: {
    alignItems:        "center",
    borderBottomWidth: 1,
  },
  row: {
    flex:              1,
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:               12,
  },
  // Always-visible options button at the trailing edge.
  kebab: {
    alignSelf:         "stretch",
    paddingHorizontal: 10,
    alignItems:        "center",
    justifyContent:    "center",
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

  row3:        { alignItems: "center", justifyContent: "space-between" },
  previewInner:{ flex: 1, alignItems: "center", gap: 4 },
  preview:     { fontSize: 12, lineHeight: 17, flex: 1 },
});
