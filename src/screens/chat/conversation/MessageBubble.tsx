/**
 * MessageBubble — single message in the conversation thread.
 * Supports: text, offer (special card), meetup_proposal, system, read receipts,
 * soft-deleted tombstone, long-press delete for own messages.
 * RTL-safe: mine bubbles anchor to start side in RTL.
 */
import React, { useState } from "react";
import { View, Linking, Pressable, Platform, Modal, ActivityIndicator, Text as RNText, useWindowDimensions } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import {
  MapPin,
  Clock,
  Check,
  Tag,
  ExternalLink,
  FileText,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  XCircle,
  Camera,
  X,
  ArrowLeftRight,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { Image } from "expo-image";
import { Text } from "@/components/reusables/text";
import { PriceTag } from "@/components/common/PriceTag";
import { HighlightedText } from "@/components/common/HighlightedText";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useReduceMotion } from "@/lib/animation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { confirmAlert } from "@/utils/alert";
import type { Message } from "@/api/conversations";
import { parseMeetupBody, type MeetupCoords } from "./meetupBody";


/**
 * Bubbles were capped only as a PERCENTAGE (78–82%). That is fine on a phone and
 * wrong on a tablet: at 1280dp (the qa_tablet AVD) 80% is a ~1000dp-wide line of
 * text, far past the ~45–75 characters that is comfortably readable, so a long
 * message became one enormous ribbon across the screen.
 *
 * So: percentage AND an absolute ceiling. On every phone the percentage still
 * wins and nothing changes (80% of 430dp is 344, well under the cap); only wide
 * screens are clamped.
 */
const BUBBLE_MAX_W = 520;
// Takes the width rather than closing over a module-level snapshot. A
// `Dimensions.get("window")` at module scope is frozen at IMPORT time, so it
// survives rotation and every later layout change: a phone opened in portrait
// kept 78% of 411dp (=320) in landscape, where the cap should have given 520.
// This is the same freeze that made the tablet listing detail render as nothing
// but a photo (UI-020) — that one was severe, this one is narrow, and the shape
// of the mistake is identical.
const bubbleMaxWidth = (pct: number, screenWidth: number) =>
  Math.min(screenWidth * pct, BUBBLE_MAX_W);

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

/**
 * "Response" kinds whose outcome is folded into the ORIGINAL proposal /
 * offer / counter bubble and therefore never render as their own row — see
 * the early `return null` inside `MessageBubble` below, the only other
 * place this exact list may ever appear.
 *
 * Review fix (CR HIGH, TASK-D428): `groupMessagesByDay.ts` used to compute
 * day separators and the "unread messages" divider boundary by walking
 * EVERY loaded message, including these — so a hidden `offer_accepted` sent
 * on a later calendar day than the offer it answers could conjure a day
 * separator with no visible bubble under it, and could shift the unread
 * divider by however many invisible responses happened to be "incoming".
 * Exporting this list (and the predicate below) makes `MessageBubble` the
 * single source of truth both modules read, instead of groupMessagesByDay.ts
 * silently re-deriving its own copy that could drift from this one.
 */
export const RESPONSE_KINDS: readonly Message["kind"][] = [
  "meetup_accepted",
  "meetup_declined",
  "offer_accepted",
  "offer_declined",
];

/** True when `message` renders as its own bubble in the thread (see `RESPONSE_KINDS`). */
export function isRenderableInThread(message: Pick<Message, "kind">): boolean {
  return !RESPONSE_KINDS.includes(message.kind);
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  /** Called when the recipient taps Accept (true) / Decline (false) on a proposal. */
  onMeetupRespond?: (accepted: boolean) => void;
  /** Outcome of this proposal, if it has been answered (shown on the bubble). */
  meetupOutcome?: "accepted" | "declined" | null;
  /**
   * Review fix (LOW-MEDIUM, DUPLICATION + A11Y GAP) — mirrors
   * `offerActionsDisabled`: true while a response to ANY meetup proposal in
   * this thread is already in flight, so a fast double-tap on
   * Accept/Decline can never fire two `meetup_accepted`/`meetup_declined`
   * messages. The meetup row had no in-flight guard at all before this —
   * unlike the offer row, which TASK-O947 already guarded.
   */
  meetupActionsDisabled?: boolean;
  /**
   * Review fix (LOW-MEDIUM) — mirrors `offerResponsePending`: set to
   * `"accept"`/`"decline"` on THIS specific bubble while its own tapped
   * action is awaiting the server response.
   */
  meetupResponsePending?: "accept" | "decline" | null;
  /** Called when the seller taps Accept (true) / Decline (false) on an offer. */
  onOfferRespond?: (accepted: boolean) => void;
  /**
   * Outcome of this offer/counter. `"accepted"`/`"declined"` render the
   * existing green/red pill. `"countered"` (TASK-C381 review fix, DR MUST)
   * renders a muted, neutral pill instead of silently showing nothing — this
   * offer/counter has no direct accept/decline response, but it is no
   * longer the one to act on: either a further counter replied to it, or
   * (once more than one standalone offer can be open at once) a newer
   * offer/counter has superseded it as the live tip of the negotiation. See
   * `offerGuards.ts`'s `OfferRowFlags.isSuperseded`, which is exactly what
   * `Conversation.tsx` maps to this value.
   */
  offerOutcome?: "accepted" | "declined" | "countered" | null;
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
  /**
   * MEDIUM (STATES) review fix — set to `"accept"`/`"decline"` on THIS
   * specific bubble while its own tapped action is awaiting the server
   * response; `null`/`undefined` otherwise. `offerActionsDisabled` above
   * still dims every offer bubble in the thread (unchanged), but only the
   * bubble the user actually tapped shows a spinner in place of its label.
   */
  offerResponsePending?: "accept" | "decline" | null;
  /** Active search query — matching substrings in the bubble body get highlighted. */
  searchQuery?: string;
  /**
   * Called when the author confirms deletion of their own message.
   * The parent handles the optimistic update + rollback.
   */
  onDeleteMessage?: () => void;
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
 * TASK-O947 (design review dedup + semantics fix) — the single "answered"
 * pill shared by ALL THREE lifecycle-outcome sites in this file: the `offer`
 * bubble, the `offer_counter` bubble, and the meetup-proposal bubble. Each
 * call site supplies its own `icon`, so a price/deal outcome
 * (`CheckCircle2`/`XCircle`) reads distinctly from a meetup outcome
 * (`CalendarCheck`/`CalendarX`) even though the pill chrome — background
 * tint, padding, radius, text weight — is identical. Previously
 * `OfferOutcomeBadge` used the CALENDAR icons for offers too, which made
 * "Offer accepted" visually indistinguishable from
 * the meetup "Accepted" pill just above it in the same thread; the third,
 * inline copy at the meetup site duplicated the same JSX a third time.
 */
function OutcomeBadge({
  icon: Icon,
  label,
  tone,
  isRtl,
  colors,
  marginTop = 8,
}: {
  icon: LucideIcon;
  label: string;
  /**
   * "muted" (TASK-C381 review fix, DR MUST) — the neutral "no longer
   * active" pill for a countered/superseded offer, distinct from the
   * green "success"/red "destructive" decision pills.
   */
  tone: "success" | "destructive" | "muted";
  isRtl: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  /** Meetup's original inline copy used 6 vs the offer badges' 8 — preserved
   *  per call site rather than silently changing either's spacing. */
  marginTop?: number;
}) {
  const color =
    tone === "success" ? colors.success : tone === "destructive" ? colors.destructive : colors.mutedForeground;
  const backgroundColor =
    tone === "success" ? colors.successAlpha : tone === "destructive" ? colors.destructiveAlpha : colors.muted;
  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 6,
        marginTop,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor,
      }}
    >
      <Icon size={14} color={color} />
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

/**
 * TASK-O947 (design review dedup fix) — the Accept / Decline (+ optional
 * Counter) action row shown on an unanswered bubble to its recipient.
 * Originally `OfferActionsRow`, hardcoded to the offer/counter copy + tone;
 * generalized (review fix, LOW-MEDIUM DUPLICATION) so the meetup-proposal
 * bubble's own Accept/Decline row — structurally identical (same
 * flexDirection/gap/minHeight/paddingVertical/borderRadius/13px-700 labels)
 * but previously left inline with none of the a11y/disabled/pending
 * machinery below — can share it instead of drifting further from the offer
 * row every time one of them is fixed. `acceptTone` is the only visual
 * difference between the two callers (offers = success/green, meetups =
 * primary/blue) so it stays distinct from the OTHER accepted-outcome
 * surfaces in this file (the offer/meetup `OutcomeBadge`s).
 */
function ActionPairRow({
  onAccept,
  onDecline,
  onCounter,
  acceptLabel,
  declineLabel,
  acceptTone,
  disabled,
  pending,
  isRtl,
  colors,
  counterLabel,
  counterAccessibilityLabel,
  testID,
  marginTop = 8,
}: {
  onAccept: () => void;
  onDecline: () => void;
  onCounter?: () => void;
  acceptLabel: string;
  declineLabel: string;
  /** Offers = success/green (distinct from the meetup pill's primary/blue). */
  acceptTone: "success" | "primary";
  disabled?: boolean;
  /**
   * MEDIUM (STATES) review fix — which action, if any, is the one the
   * seller/buyer actually tapped and is now awaiting the server response.
   * `disabled` alone only dims the whole row (it goes true for every bubble
   * of this kind in the thread while ANY response is in flight), which reads
   * as a dead tap on a mid-range Android with no other progress cue.
   * `pending` swaps THIS bubble's tapped button label for a spinner instead.
   */
  pending?: "accept" | "decline" | null;
  isRtl: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  /** Only rendered when `onCounter` is provided (offer/counter bubbles only). */
  counterLabel?: string;
  counterAccessibilityLabel?: string;
  testID?: string;
  /** The offer row used 8, the meetup row's inline copy used 6 — preserved
   *  per call site (same pattern as `OutcomeBadge`'s own `marginTop` prop)
   *  rather than silently changing either's spacing. */
  marginTop?: number;
}) {
  const acceptBg = acceptTone === "success" ? colors.success : colors.primary;
  const acceptRipple = acceptTone === "success" ? colors.successAlpha : colors.primaryAlpha;
  const acceptFg = acceptTone === "success" ? colors.successForeground : colors.primaryForeground;

  return (
    // Review fix (SHOULD-FIX, STATES) — dimming the WHOLE row (including the
    // pending button itself) re-created the exact ambiguity the pending
    // spinner was meant to remove: on the tapped bubble `disabled` is also
    // true (the global in-flight guard), so its own spinner rendered at 50%
    // opacity inside an already-disabled row was barely more legible than
    // the dead tap it replaced. Only dim when nothing on THIS row is pending
    // — the tapped bubble's spinner now always renders at full opacity.
    <View testID={testID} style={{ gap: 6, marginTop, opacity: disabled && !pending ? 0.5 : 1 }}>
      {/* Accept + Decline row */}
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 8 }}>
        <Pressable
          onPress={onAccept}
          disabled={disabled}
          android_ripple={{ color: acceptRipple }}
          accessibilityRole="button"
          accessibilityLabel={acceptLabel}
          // Review fix (SHOULD-FIX, A11Y) — `busy` tells a screen-reader user
          // a response is in flight while the visible label is swapped for a
          // spinner (the accessibilityLabel alone still reads a plain
          // "Accept" with no progress signal otherwise).
          accessibilityState={{ disabled: !!disabled, busy: pending === "accept" }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, backgroundColor: acceptBg }}
        >
          {pending === "accept" ? (
            <ActivityIndicator size="small" color={acceptFg} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "700", color: acceptFg }}>{acceptLabel}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={disabled}
          android_ripple={{ color: colors.muted }}
          accessibilityRole="button"
          accessibilityLabel={declineLabel}
          accessibilityState={{ disabled: !!disabled, busy: pending === "decline" }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
        >
          {pending === "decline" ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.destructive }}>{declineLabel}</Text>
          )}
        </Pressable>
      </View>
      {/* Counter button — full width, below Accept/Decline (offer/counter bubbles only) */}
      {onCounter && (
        <Pressable
          onPress={onCounter}
          disabled={disabled}
          android_ripple={{ color: colors.warningAlpha }}
          accessibilityRole="button"
          accessibilityLabel={counterAccessibilityLabel ?? counterLabel}
          accessibilityState={{ disabled: !!disabled }}
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
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.warning }}>{counterLabel}</Text>
        </Pressable>
      )}
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
  // A fullscreen image viewer is the one place rotation matters most, so this
  // must be the LIVE height, not the height at first render.
  const { height: screenHeight } = useWindowDimensions();

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
  // Live width, for the same reason as the text bubbles: an image sized from a
  // width captured at import time is wrong after any rotation.
  const { width: windowWidth } = useWindowDimensions();
  const maxImageWidth = Math.round(windowWidth * 0.68);

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

export function MessageBubble({ message, isMine, onMeetupRespond, meetupOutcome, meetupActionsDisabled, meetupResponsePending, onOfferRespond, offerOutcome, onOfferCounter, offerActionsDisabled, offerResponsePending, searchQuery, onDeleteMessage }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
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
  // `isRenderableInThread`/`RESPONSE_KINDS` above are exported so
  // `groupMessagesByDay.ts` filters the exact same set (CR HIGH, TASK-D428).
  if (!isRenderableInThread(message)) {
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
            maxWidth: bubbleMaxWidth(0.78, windowWidth),
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
    const formattedListed = formatCurrency(listedPrice, currency);

    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ flexDirection: "row", justifyContent: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}
      >
        <View
          style={{
            maxWidth: bubbleMaxWidth(0.82, windowWidth),
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
            {/* TASK-C381 (review fix, DR) — reuse the shared PriceTag instead
                of hand-rolling a colored price Text (CLAUDE.md: never fork
                PriceTag). `tone="warning"` matches this bubble's own accent
                on a "mine" offer; the wrapping View (not PriceTag's own
                Text) owns the RTL edge-alignment since PriceTag has no
                textAlign prop. */}
            <View style={{ alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <PriceTag price={amount} currency={currency} size="lg" tone={isMine ? "warning" : "default"} />
            </View>

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
            {offerOutcome === "accepted" || offerOutcome === "declined" ? (
              <OutcomeBadge
                icon={offerOutcome === "accepted" ? CheckCircle2 : XCircle}
                label={offerOutcome === "accepted" ? t("chat.offer.accepted") : t("chat.offer.declined")}
                tone={offerOutcome === "accepted" ? "success" : "destructive"}
                isRtl={isRtl}
                colors={colors}
              />
            ) : offerOutcome === "countered" ? (
              /* TASK-C381 (review fix, DR MUST) — no direct accept/decline
                 response, but this offer is no longer live (superseded by a
                 counter or by a newer standalone offer) — a muted pill
                 instead of the buttons silently vanishing with no reason. */
              <OutcomeBadge
                icon={ArrowLeftRight}
                label={t("chat.offer.noLongerActive")}
                tone="muted"
                isRtl={isRtl}
                colors={colors}
              />
            ) : !isMine && onOfferRespond ? (
              /* Accept / Decline / Counter — seller sees all three actions before responding.
                 TASK-O947: all three are disabled + dimmed while ANY offer response in this
                 thread is in flight (offerActionsDisabled) — never a double-tap. */
              <ActionPairRow
                testID="offer-actions-row"
                onAccept={() => onOfferRespond(true)}
                onDecline={() => onOfferRespond(false)}
                onCounter={onOfferCounter}
                acceptLabel={t("chat.offer.accept")}
                declineLabel={t("chat.offer.decline")}
                counterLabel={t("chat.offer.counter")}
                acceptTone="success"
                disabled={offerActionsDisabled}
                pending={offerResponsePending}
                isRtl={isRtl}
                colors={colors}
              />
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

    return (
      <Animated.View
        entering={enteringAnimation}
        style={{ flexDirection: "row", justifyContent: bubbleAlign, marginVertical: 4, marginHorizontal: 16 }}
      >
        <View
          style={{
            maxWidth: bubbleMaxWidth(0.82, windowWidth),
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
            {/* TASK-C381 (review fix, DR) — shared PriceTag, see the "offer"
                card above for the rationale. */}
            <View style={{ alignItems: isRtl ? "flex-end" : "flex-start" }}>
              <PriceTag price={amount} currency={currency} size="lg" tone={isMine ? "warning" : "default"} />
            </View>

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
            {offerOutcome === "accepted" || offerOutcome === "declined" ? (
              <OutcomeBadge
                icon={offerOutcome === "accepted" ? CheckCircle2 : XCircle}
                label={offerOutcome === "accepted" ? t("chat.offer.accepted") : t("chat.offer.declined")}
                tone={offerOutcome === "accepted" ? "success" : "destructive"}
                isRtl={isRtl}
                colors={colors}
              />
            ) : offerOutcome === "countered" ? (
              /* TASK-C381 (review fix, DR MUST) — this counter has itself
                 been superseded by a further counter-back with no direct
                 accept/decline response — a muted pill, not a silent gap. */
              <OutcomeBadge
                icon={ArrowLeftRight}
                label={t("chat.offer.noLongerActive")}
                tone="muted"
                isRtl={isRtl}
                colors={colors}
              />
            ) : !isMine && onOfferRespond ? (
              /* Accept / Decline / Counter — the recipient of a counter-offer sees
                 all three actions, the same way the original offer does, so a
                 negotiation can run more than one round (TASK-C381: the buyer can
                 counter the seller's counter, and vice versa). TASK-O947: all
                 three are disabled + dimmed while ANY offer response in this
                 thread is in flight (offerActionsDisabled). */
              <ActionPairRow
                testID="offer-actions-row"
                onAccept={() => onOfferRespond(true)}
                onDecline={() => onOfferRespond(false)}
                onCounter={onOfferCounter}
                acceptLabel={t("chat.offer.accept")}
                declineLabel={t("chat.offer.decline")}
                counterLabel={t("chat.offer.counter")}
                acceptTone="success"
                disabled={offerActionsDisabled}
                pending={offerResponsePending}
                isRtl={isRtl}
                colors={colors}
                counterAccessibilityLabel={t("chat.offer.counterBack")}
              />
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
            maxWidth: bubbleMaxWidth(0.8, windowWidth),
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
              <OutcomeBadge
                icon={meetupOutcome === "accepted" ? CalendarCheck : CalendarX}
                label={meetupOutcome === "accepted" ? t("chat.meetup.accepted") : t("chat.meetup.declined")}
                tone={meetupOutcome === "accepted" ? "success" : "destructive"}
                isRtl={isRtl}
                colors={colors}
                marginTop={6}
              />
            ) : !isMine && onMeetupRespond ? (
              /* Accept / Decline — only for the recipient, before they respond.
                 Review fix (LOW-MEDIUM, DUPLICATION + A11Y) — this row was
                 structurally identical to the offer row (`ActionPairRow`)
                 but left inline with none of its accessibilityRole/Label/
                 State, `disabled`, or `pending` — now shares the same
                 component so a fast double-tap can never fire two
                 meetup_accepted/meetup_declined messages either (guarded by
                 `meetupActionsDisabled`/`meetupResponsePending` at the
                 Conversation.tsx call site, mirroring the offer guard). */
              <ActionPairRow
                onAccept={() => onMeetupRespond(true)}
                onDecline={() => onMeetupRespond(false)}
                acceptLabel={t("chat.meetup.accept")}
                declineLabel={t("chat.meetup.decline")}
                acceptTone="primary"
                disabled={meetupActionsDisabled}
                pending={meetupResponsePending}
                isRtl={isRtl}
                colors={colors}
                marginTop={6}
              />
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
            maxWidth: bubbleMaxWidth(0.78, windowWidth),
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
          style={{ maxWidth: bubbleMaxWidth(0.78, windowWidth) }}
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
              query={searchQuery}
              baseStyle={{
                fontSize: 15,
                fontWeight: "400",
                color: bubbleText,
                lineHeight: 22,
                textAlign: isRtl ? "right" : "left",
              }}
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
