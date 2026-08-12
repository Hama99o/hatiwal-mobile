import { View, Pressable, StyleSheet, Modal, Text as RNText } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Camera, Trash2, CheckCheck, MailOpen, MoreVertical, Archive, ArchiveRestore } from "lucide-react-native";
import { useReduceMotion } from "@/lib/animation";

import { type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { StatusBadge, type ListingStatus } from "@/components/common/StatusBadge";
import { UserIdentity } from "@/components/common/UserIdentity";
import { confirmAlert } from "@/utils/alert";
import { conversationPreviewText } from "./conversationPreviewText";

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
}

export function ConversationRow({
  item,
  tabMode = "inbox",
  onDelete,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
}: ConversationRowProps) {
  const router                                      = useRouter();
  const { isRtl, formatSmartTime, formatCurrency }  = useLocalization();
  const { t }                                       = useTranslation();
  const colors                                      = useColors();
  const insets                                      = useSafeAreaInsets();
  const [menuVisible, setMenuVisible]               = useState(false);

  const other     = item.otherParticipant;
  const otherName = other?.name ?? "";
  const unread    = item.unreadCount ?? 0;
  const isInactive =
    item.listing?.status === "sold" || item.listing?.status === "reserved";

  // ── Preview ───────────────────────────────────────────────────────────────
  // Shared with `filterConversations` (TASK-Z684 list search) — the row must
  // display exactly what search matches against, never a diverging string.
  // `formatCurrency` (cycle-4 CR fix) locale-formats an "offer" preview's
  // amount instead of printing the raw split-body number.
  const { text: previewText, icon: PreviewIcon } = conversationPreviewText(item, t, formatCurrency);

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
        testID={`conversation-row-${item.id}`}
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

          {/* Title (+ role pill) + time */}
          <View style={[styles.row1, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={[styles.titleGroup, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  { color: isInactive ? colors.mutedForeground : colors.foreground },
                ]}
              >
                {item.listing?.title ?? t("chat.title")}
              </Text>
              {/* Role hint (TASK-R517) — which side of this thread the viewer is on */}
              {item.viewerRole ? (
                <View style={styles.rolePillWrap} testID={`role-pill-${item.id}`}>
                  <Badge
                    label={t(
                      item.viewerRole === "seller" ? "chat.role.selling" : "chat.role.buying"
                    )}
                    variant="muted"
                    style={styles.rolePill}
                  />
                </View>
              ) : null}
            </View>
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
              <PulsingBadge count={unread} testID={`unread-badge-${item.id}`} />
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
          testID={`conversation-options-${item.id}`}
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
              // Clear the Android system nav bar — Math.max keeps the existing
              // 32pt minimum on devices with no bottom inset.
              paddingBottom:       Math.max(insets.bottom, 32) + 12,
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

  row1: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 },
  // Holds the title + role pill together as one flexible group so the
  // timestamp (flexShrink: 0 below) never gets pushed off-screen — the title
  // itself is flexShrink: 1 (never flex: 1) so it truncates before the pill
  // or the timestamp ever get squeezed out.
  titleGroup: { flex: 1, alignItems: "center", gap: 6, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 19, flexShrink: 1 },
  rolePillWrap: { flexShrink: 0 },
  rolePill: { paddingHorizontal: 8 },
  time:  { fontSize: 11, flexShrink: 0, marginTop: 1 },

  row2:  { alignItems: "center", gap: 4, marginBottom: 3 },

  row3:        { alignItems: "center", justifyContent: "space-between" },
  previewInner:{ flex: 1, alignItems: "center", gap: 4 },
  preview:     { fontSize: 12, lineHeight: 17, flex: 1 },
});
