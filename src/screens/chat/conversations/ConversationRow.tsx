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
import { Camera, Trash2, CheckCheck, MailOpen, MoreVertical, Archive, ArchiveRestore, Store, ShoppingBag } from "lucide-react-native";
import { useReduceMotion } from "@/lib/animation";

import { type Conversation } from "@/api/conversations";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { Text } from "@/components/reusables/text";
import { Badge } from "@/components/reusables/badge";
import { StatusBadge, type ListingStatus } from "@/components/common/StatusBadge";
import { UserIdentity } from "@/components/common/UserIdentity";
import { PriceTag } from "@/components/common/PriceTag";
import { HighlightedText } from "@/components/common/HighlightedText";
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
  /**
   * TASK-Q847 — "inbox" (default) or "listing". On the per-listing
   * conversations screen (`ListingConversations`) every row already shares
   * the SAME listing — it's the screen's header — so the listing
   * thumbnail/title/`PriceTag`/`StatusBadge` group is redundant there and is
   * dropped; the buyer `UserIdentity` (avatar + name + verified tag) is
   * promoted to the row's headline instead. Purely additive: every other
   * branch (preview line, unread badge, time, long-press menu) renders
   * identically regardless of `context`, and the default keeps the inbox
   * byte-for-byte unchanged.
   */
  context?: "inbox" | "listing";
  /**
   * TASK-J471 — the active inbox search term (Conversations.tsx's
   * `searchTerm`). Drives `HighlightedText` on the preview line so the row
   * shows visually *why* it matched — the identical treatment used for
   * in-thread message search (`MessageBubble`). `filterConversations` keeps
   * sole ownership of matching; this can only highlight, never disagree with
   * what was already selected.
   */
  searchTerm?: string;
  /**
   * TASK-R517 — the screen's currently-active role scope ("buying" | "selling"
   * | undefined/null for both). When the active scope already matches this
   * row's `viewerRole`, the pill is redundant — every row in a Selling-only
   * list is trivially "Selling" and repeating it just eats width from
   * `titleGroup` (whose `title` has `flexShrink: 1`) for zero new
   * information. The pill still renders in the unfiltered mixed inbox, where
   * it's the only signal for which side of that specific thread you're on.
   */
  role?: "buying" | "selling" | null;
  onDelete: (id: number) => void;
  onMarkRead?: (id: number) => void;
  onMarkUnread?: (id: number) => void;
  onArchive?: (id: number) => void;
  onUnarchive?: (id: number) => void;
}

export function ConversationRow({
  item,
  tabMode = "inbox",
  context = "inbox",
  searchTerm,
  role,
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
  // Design review fix — SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.4.3) explicitly
  // calls for dropping "reserved" from this exact condition ("a held
  // conversation stays full-weight in the inbox; only sold dims") but it was
  // never done: this row was still fading the thumbnail, muting the title
  // and PriceTag, for a Live-with-a-hold listing exactly as if it were
  // terminal `sold` — the same "reserved reads as a dead end" bug the rest
  // of this redesign exists to fix, just in the inbox instead of the thread.
  const isInactive = item.listing?.status === "sold";
  // The lifecycle badge overlay is a DIFFERENT concern from dimming — a held
  // listing still gets its "Reserved" ribbon (the badge IS the signal the
  // redesign wants, §1.1/§1.2), it just no longer dims everything around it.
  const hasLifecycleBadge = isInactive || item.listing?.status === "reserved";

  // TASK-R517 — this row's role hint, mapped from the serializer's
  // buyer/seller vocabulary to the screen's filter vocabulary so it can be
  // compared against the active `role` scope below.
  const viewerRoleMode: "buying" | "selling" | null =
    item.viewerRole === "seller" ? "selling" : item.viewerRole === "buyer" ? "buying" : null;
  // Skip the pill when the active role scope already tells the user which
  // side every row is on (review fix) — see the `role` prop doc comment.
  const showRolePill = Boolean(viewerRoleMode) && role !== viewerRoleMode;

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
        {/* ── Thumbnail: fixed 54×54 container, image fills via absoluteFillObject ──
            TASK-Q847: skipped entirely in "listing" context — every row on
            that screen shares the SAME listing (the screen's own header), so
            a repeated listing photo/status badge would be redundant. The
            buyer's avatar (via UserIdentity below) is the row's leading
            visual there instead. */}
        {context === "listing" ? null : (
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
            {hasLifecycleBadge && item.listing?.status && (
              <StatusBadge
                status={item.listing.status as ListingStatus}
                overlay
              />
            )}
          </View>
        )}

        {/* ── Text content ────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Title + price + time (inbox) — OR buyer identity + time (listing,
              TASK-Q847): the listing title/PriceTag/StatusBadge group is
              dropped there and the buyer `UserIdentity` (avatar + name +
              verified tag) is promoted to the row's headline instead. */}
          <View style={[styles.row1, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={[styles.titleGroup, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {context === "listing" ? (
                <UserIdentity
                  name={otherName || t("chat.unknownUser")}
                  avatarUrl={other?.avatarUrl}
                  verified={other?.verified ?? false}
                  size={32}
                  nameSize={14}
                />
              ) : (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    { color: isInactive ? colors.mutedForeground : colors.foreground },
                  ]}
                >
                  {item.listing?.title ?? t("chat.title")}
                </Text>
              )}
            </View>
            {/* Price (TASK-J471, design north star: price-prominence) — renders
                null when the listing has no price (PriceTag itself returns null),
                so no extra wrapper here to avoid an empty flex-gap slot. Muted
                tone on a SOLD row only (SF-M3 — see `isInactive`'s own doc),
                matching the dimmed title/thumbnail; a reserved/held row stays
                full-weight and just gains the "Reserved" badge overlay.
                TASK-J471 (review fix): the role pill (TASK-R517) used to live
                in this row too — with a vehicles-scale price (e.g.
                "AFN 1,250,000") and a >7-day-old timestamp (which includes the
                year), the three fixed-width items plus the title could exceed
                the row's content width and clip/overlap the timestamp. The
                pill moved to row2 (beside the participant name) so row1 only
                ever has to fit title + price + time.
                TASK-Q847: dropped entirely in "listing" context — every row
                shares the same listing, so a repeated price is redundant. */}
            {context === "listing" ? null : (
              <PriceTag
                perUnit={item.listing?.multiUnit === true}
                price={item.listing?.price}
                currency={item.listing?.currency}
                size="sm"
                tone={isInactive ? "muted" : "default"}
              />
            )}
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

          {/* Participant name + verified (shared UserIdentity, never hand-roll)
              + role hint (TASK-R517: which side of this thread the viewer is
              on). Renders if either piece exists — mirrors the pre-J471
              behaviour where the role pill never depended on the participant
              name resolving. Name wrapped in flex:1/minWidth:0 so it shrinks
              first; the pill (fixed-width) is never the one that clips.
              TASK-Q847: skipped entirely in "listing" context — the buyer's
              name is already the row1 headline there, so repeating it here
              would be a duplicate. */}
          {context === "inbox" && (otherName || showRolePill) ? (
            <View style={[styles.row2, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {otherName ? (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <UserIdentity
                    name={otherName}
                    verified={other?.verified ?? false}
                    showAvatar={false}
                    size={28}
                    nameSize={12}
                  />
                </View>
              ) : null}
              {/* TASK-R517 review fix: `Store`/`ShoppingBag` icon (matching
                  the Conversations.tsx role chips) so Buying vs Selling never
                  relies on an 11px text read alone, and `variant="secondary"`
                  (not "muted") for AA-contrast text on the pill in light mode
                  — Badge's `muted` text/bg pairing sits under the 4.5:1 floor. */}
              {showRolePill ? (
                <View style={styles.rolePillWrap} testID={`role-pill-${item.id}`}>
                  <Badge
                    label={t(
                      viewerRoleMode === "selling" ? "chat.role.selling" : "chat.role.buying"
                    )}
                    variant="secondary"
                    icon={viewerRoleMode === "selling" ? Store : ShoppingBag}
                    style={styles.rolePill}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Preview + unread badge */}
          <View style={[styles.row3, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <View style={[styles.previewInner, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {PreviewIcon && <PreviewIcon size={11} color={colors.mutedForeground} />}
              {/* TASK-J471 — highlights the substring that matched the active
                  inbox search term, the identical treatment as in-thread
                  message search. `searchTerm` is undefined outside search, so
                  this renders exactly like the plain Text it replaces. */}
              <HighlightedText
                text={previewText}
                query={searchTerm}
                numberOfLines={1}
                baseStyle={[
                  styles.preview,
                  { color: unread > 0 ? colors.foreground : colors.mutedForeground,
                    fontWeight: unread > 0 ? "500" : "400" },
                ]}
              />
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
  // Holds just the title now (TASK-J471 review fix: the role pill used to
  // live here too — see the PriceTag comment above for why it moved to
  // row2). flex: 1 so the title claims all of row1's leftover space once
  // price + time have taken theirs, and shrinks to 0 first under pressure.
  titleGroup: { flex: 1, alignItems: "center", gap: 6, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 19, flex: 1 },
  rolePillWrap: { flexShrink: 0 },
  rolePill: { paddingHorizontal: 8 },
  time:  { fontSize: 11, flexShrink: 0, marginTop: 1 },

  // gap: 6 (not 4) — TASK-J471: now also hosts the role pill (moved from
  // row1), so the name and pill get a touch more breathing room than the
  // tighter row3 preview/badge pairing.
  row2:  { alignItems: "center", gap: 6, marginBottom: 3 },

  row3:        { alignItems: "center", justifyContent: "space-between" },
  previewInner:{ flex: 1, alignItems: "center", gap: 4 },
  preview:     { fontSize: 12, lineHeight: 17, flex: 1 },
});
