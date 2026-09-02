/**
 * Conversation screen — full message thread for a single conversation.
 * Features:
 *  - Pinned listing header (thumbnail + PriceTag + StatusBadge)
 *  - FlatList of messages (RTL-safe bubbles, meetup_proposal special bubble)
 *  - Read receipts (calls mark_read on focus)
 *  - Meetup proposal via slide-up Modal (MeetupSheet)
 *  - Closed conversation → input disabled with notice
 *  - Start conversation flow: accepts listingId param → startConversation
 *  - sonner-native toasts for all failures
 *  - useFocusEffect for fresh data on re-visit
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { confirmAlert } from "@/utils/alert";
import { showPermissionDeniedAlert, showLimitedPhotoAccessAlert } from "@/lib/permissions";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight, keyboardBarLift, keyboardSafeBottom } from "@/hooks/useKeyboardVisible";
import { Send, Plus, ShieldBan, Search, X, Flag } from "lucide-react-native";
import { toast } from "@/lib/toast";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { conversationsAPI, type Conversation, type Message } from "@/api/conversations";
import { usersAPI } from "@/api/users";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { BackButton } from "@/components/common/BackButton";
import { ListingHeader } from "./conversation/ListingHeader";
import {
  isNearBottom,
  shouldTrackScrollPosition,
  scrollLockDeadline,
} from "./conversation/threadScroll";
import { ListingUnavailableNotice } from "./conversation/ListingUnavailableNotice";
import { AgreedDealBanner } from "./conversation/AgreedDealBanner";
import { MessageBubble } from "./conversation/MessageBubble";
import { DaySeparator } from "./conversation/DaySeparator";
import { buildThreadRows, resolveUnreadBoundaryId, threadRowKey, type ThreadRow } from "./conversation/groupMessagesByDay";
import { MeetupSheet } from "./conversation/MeetupSheet";
import { ComposerActionsSheet } from "./conversation/ComposerActionsSheet";
import { OfferSheet } from "@/screens/shared/listing-detail/OfferSheet";
import { ReportSheet } from "@/components/common/ReportSheet";
import { SafetyTipsSheet } from "@/components/common/SafetyTipsSheet";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useConversationCable } from "@/hooks/useConversationCable";
import { QuickReplies } from "@/components/common/QuickReplies";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { encodeMeetupBody, type MeetupCoords } from "./conversation/meetupBody";
import {
  buildPlaceHoldPrompt,
  buildReserveAfterAcceptPrompt,
  reserveAfterAccept,
  resolveReserveCurrency,
  type ReserveAfterAcceptPrompt,
} from "./conversation/reserveAfterAccept";
import { BuyerPickerSheet } from "@/components/common/BuyerPickerSheet";
import { listingsAPI } from "@/api/listings";
import { heldUnitsOf } from "@/utils/stock";
import { apiErrorMessage } from "@/utils/apiError";
import {
  canOfferInThread as canOfferInThreadPure,
  showUnavailableNotice as showUnavailableNoticePure,
  offerUnavailableStatus,
} from "./conversation/threadAvailability";
import {
  buildOfferIndex,
  canRespondToOffer,
  canCounterBack,
  type OfferRowFlags,
} from "./conversation/offerGuards";
import { findAgreedOffer, shouldShowAgreedDealBanner } from "./conversation/agreedOffer";
import { parseOfferAmount } from "@/utils/offerAmount";
import { parseOfferQuantity, offerUnits } from "@/screens/shared/listing-detail/offerQuantity";
// Review fix (SHOULD-FIX, DUPLICATION) — reuse the SAME query-key constants
// `useListingLifecycle.ts` already exports ("exported so callers/tests can
// assert against the exact same constants instead of hardcoding strings")
// instead of re-typing the strings in this file's own invalidation helper.
import {
  MY_LISTINGS_QK,
  MY_LISTING_STATUS_COUNTS_QK,
  MY_LISTING_QK,
  CONVERSATIONS_QK,
} from "@/hooks/useListingLifecycle";

// ── Reanimated imports for search bar animation ───────────────────────────────
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from "react-native-reanimated";
import { usePulse, useReduceMotion } from "@/lib/animation";
import { MESSAGE_MAX_LENGTH } from "./messageLimits";

// Skeleton pulse line — uses usePulse() so the shimmer is skipped when
// Reduce Motion is enabled (no more raw withRepeat loop here).
function PulseLine({ w, h = 14, colors }: { w: number | string; h?: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const anim = usePulse();
  return <Animated.View style={[{ backgroundColor: colors.muted as string, borderRadius: 8, height: h, width: w as number }, anim]} />;
}

function ChatSkeleton({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <>
      {/* Header skeleton */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <PulseLine w={56} h={56} colors={colors} />
        <View style={{ flex: 1, gap: 8 }}>
          <PulseLine w="60%" colors={colors} />
          <PulseLine w="40%" h={12} colors={colors} />
        </View>
      </View>
      {/* Bubble skeletons */}
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {["60%","45%","70%","50%","65%"].map((w, i) => (
          <View key={i} style={{ alignItems: i % 2 === 0 ? "flex-end" : "flex-start" }}>
            <PulseLine w={w} h={40} colors={colors} />
          </View>
        ))}
      </View>
    </>
  );
}

type Params = {
  id?: string;         // existing conversation id
  listingId?: string;  // start-flow: first message will create the conversation
  initialMessage?: string;
};

export function ConversationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { isRtl, formatCurrency } = useLocalization();
  const insets = useSafeAreaInsets();
  // Android draws edge-to-edge and does NOT resize for the keyboard, so the
  // screen has to inset itself by the keyboard's height. See useKeyboardVisible.
  const keyboardHeight = useKeyboardHeight();
  const keyboardVisible = keyboardHeight > 0;
  const [bottomBarH, setBottomBarH] = useState(0);
  // Container height now, and its height while the keyboard was closed. The two
  // together tell us whether the OS already shrank the window for the keyboard,
  // which is what decides how far the bottom bar must be lifted — see
  // keyboardBarLift. Measured rather than assumed per platform.
  const [rootH, setRootH] = useState(0);
  const rootBaselineH = useRef(0);
  if (keyboardHeight === 0 && rootH > 0) rootBaselineH.current = rootH;
  const barLift = keyboardBarLift(keyboardHeight, rootBaselineH.current, rootH);

  const qc = useQueryClient();
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  // Fallback: if the store is empty (e.g. web page refresh before Splash hydrates),
  // fetch the current user directly so isMine detection never breaks.
  const { data: fetchedUser } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
    enabled: !storeUser,
    staleTime: 1000 * 60 * 10,
  });
  // Hydrate store if we had to fetch
  useEffect(() => {
    if (fetchedUser && !storeUser) setUser(fetchedUser);
  }, [fetchedUser, storeUser, setUser]);
  const currentUser = storeUser ?? fetchedUser ?? null;

  const { id: rawId, listingId: rawListingId, initialMessage: rawInitial } =
    useLocalSearchParams<Params>();

  const conversationId = rawId ? Number(rawId) : null;
  const listingId = rawListingId ? Number(rawListingId) : null;
  const initialMessage = rawInitial ?? "";

  // Local state
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [meetupSheetVisible, setMeetupSheetVisible] = useState(false);
  // TASK-K487: single "+" bottom sheet replacing the four composer icons
  // (Photo / File / Propose meetup / Make an offer).
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(conversationId);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  // Safety tips sheet is hoisted here (single instance) rather than owned by
  // MeetupSheet, so opening it never stacks a second native <Modal> on top of
  // the meetup sheet's. Tapping the link inside MeetupSheet hides the meetup
  // modal (without resetting its place/time fields — the component stays
  // mounted) and shows this one; closing it restores the meetup sheet.
  const [safetyTipsVisible, setSafetyTipsVisible] = useState(false);
  // TASK-O947: guards against a double-tap on Accept/Decline while a response
  // is already in flight — without this, a fast double-tap could fire two
  // sendMessage calls (and, on Accept, could trigger the reserve-after-accept
  // prompt twice). Cleared in handleOfferRespond's `finally`. Review fix
  // (MEDIUM/STATES) — holds WHICH message + action so the specific tapped
  // bubble can show a spinner (`isRespondingToOffer` below still dims/blocks
  // EVERY offer bubble in the thread while this is non-null, unchanged).
  const [respondingOfferTarget, setRespondingOfferTarget] = useState<{
    messageId: number;
    accepted: boolean;
  } | null>(null);
  const isRespondingToOffer = respondingOfferTarget !== null;
  // Review fix (LOW-MEDIUM, DUPLICATION + A11Y GAP) — mirrors
  // `respondingOfferTarget` above: `handleMeetupRespond` had NO in-flight
  // guard at all, so a fast double-tap on a meetup proposal's Accept/Decline
  // could fire two `meetup_accepted`/`meetup_declined` messages (a live bug,
  // not just an a11y gap — the offer row was guarded by TASK-O947, the
  // structurally-identical meetup row never was).
  const [respondingMeetupTarget, setRespondingMeetupTarget] = useState<{
    messageId: number;
    accepted: boolean;
  } | null>(null);
  const isRespondingToMeetup = respondingMeetupTarget !== null;
  // TASK-O947 (cycle-4 design review): the one-tap reserve confirm shown
  // after a successful offer accept — the shared BuyerPickerSheet in its
  // "preselectedBuyer" confirm mode, never the full pick-a-buyer flow. `null`
  // means the sheet is closed; a non-null prompt (built by
  // `buildReserveAfterAcceptPrompt`) drives both its visibility and content.
  const [reserveConfirm, setReserveConfirm] = useState<ReserveAfterAcceptPrompt | null>(null);
  const [isReservingAfterAccept, setIsReservingAfterAccept] = useState(false);
  // Review fix (MEDIUM, STATES/ERROR FEEDBACK) — a reserve failure's ONLY
  // signal was `toast.error(...)`, but sonner-native only escapes to a
  // FullWindowOverlay on iOS; on Android the sheet's raw RN <Modal> is a
  // separate native window that occludes the toast entirely — spinner runs,
  // spinner stops, sheet stays open, nothing visibly explains why. This
  // inline message renders INSIDE the sheet (see the `errorMessage` prop on
  // BuyerPickerSheet below) so the failure is legible on Android too. Reset
  // to null whenever a fresh prompt opens or the seller retries.
  const [reserveConfirmError, setReserveConfirmError] = useState<string | null>(null);

  // ── Derived: is the current user the seller of this conversation's listing? ──
  // Single source of truth — reused by the pinned ListingHeader's `isOwner`
  // prop, the offer/counter action-button gating in the message list, the
  // seller-vs-buyer quick-reply set below, AND the reserve-after-accept guard
  // in handleOfferRespond. Previously hand-duplicated 4x across this file.
  const isOwner =
    !!currentUser &&
    !!conversation?.seller &&
    Number(conversation.seller.id) === Number(currentUser.id);

  // ── Composer draft persistence ───────────────────────────────────────────
  // The draft hook owns AsyncStorage persistence keyed per conversation.
  // `messageText` and `setMessageText` are aliased from the hook so the rest
  // of the component doesn't need renaming.
  const {
    draft: messageText,
    setDraft: setMessageText,
    clearDraft,
  } = useComposerDraft(currentConversationId);

  // Seed the composer with the deep-link initialMessage ONCE on first mount.
  // We only do this when there's an initialMessage and no stored draft for
  // this conversation (the hook starts as "" until storage is hydrated, so
  // checking for "" is safe here because storage hydration is async and the
  // effect below runs after the hook's own hydration effect).
  useEffect(() => {
    if (initialMessage && messageText === "") {
      setMessageText(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counter-offer sheet state
  const [counterSheetVisible, setCounterSheetVisible] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  // SF-M11 — units a counter is for. Prefilled from the offer being
  // countered (see `handleOpenCounterSheet`) so restating the price does not
  // silently reset the quantity both sides already agreed on.
  const [counterOfferQuantity, setCounterOfferQuantity] = useState("");
  // The original offer message the counter is responding to
  const [counterOfferTarget, setCounterOfferTarget] = useState<Message | null>(null);
  const [isSendingCounter, setIsSendingCounter] = useState(false);

  // ── TASK-C381: make/counter an offer without leaving the thread ──────────
  // Reuses the existing OfferSheet (with its TASK-G083 quick-amount chips) —
  // the composer's "+" actions sheet (TASK-K487) opens it, prefilled from the
  // pinned listing.
  const [threadOfferSheetVisible, setThreadOfferSheetVisible] = useState(false);
  const [threadOfferAmount, setThreadOfferAmount] = useState("");
  const [threadOfferQuantity, setThreadOfferQuantity] = useState("");
  const [isSendingThreadOffer, setIsSendingThreadOffer] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Reduce-motion accessibility ──────────────────────────────────────────
  const reduceMotion = useReduceMotion();

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Animated height for the search bar slide-in (0 = collapsed, 1 = expanded)
  const searchProgress = useSharedValue(0);
  const searchBarAnimStyle = useAnimatedStyle(() => ({
    height: interpolate(searchProgress.value, [0, 1], [0, 52], Extrapolation.CLAMP),
    opacity: interpolate(searchProgress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    overflow: "hidden",
  }));

  const openSearch = useCallback(() => {
    setSearchVisible(true);
    if (reduceMotion) {
      // Snap instantly — no animation when Reduce Motion is on
      searchProgress.value = 1;
    } else {
      searchProgress.value = withTiming(1, { duration: 200 });
    }
  }, [searchProgress, reduceMotion]);

  const closeSearch = useCallback(() => {
    if (reduceMotion) {
      // Snap instantly and clear state immediately — no animation to wait for
      searchProgress.value = 0;
      setSearchVisible(false);
      setSearchQuery("");
    } else {
      searchProgress.value = withTiming(0, { duration: 200 });
      // Delay state clear until animation finishes so bar doesn't flash empty
      setTimeout(() => {
        setSearchVisible(false);
        setSearchQuery("");
      }, 210);
    }
  }, [searchProgress, reduceMotion]);

  // Filtered messages — computed from full message list when search is active
  const filteredMessages = searchVisible && searchQuery.trim()
    ? messages.filter((m) =>
        m.kind === "text" &&
        !m.deleted &&
        !!m.body &&
        m.body.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  // Number of text messages that match (used for the counter badge)
  const matchCount = searchVisible && searchQuery.trim()
    ? filteredMessages.length
    : 0;

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isNearBottomRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  // A programmatic scroll-to-bottom is IN FLIGHT until this timestamp.
  //
  // Without it, sending a message scrolled only PART of the way and the user had
  // to finish by hand (owner report, 2026-09-02). The cause is a race between
  // the two halves of the old design — `isNearBottomRef` as the sole gate, and
  // ONE animated `scrollToEnd` from `onContentSizeChange`:
  //
  //   1. a send sets isNearBottomRef = true and appends the bubble
  //   2. onContentSizeChange fires and starts an ANIMATED scrollToEnd
  //   3. mid-animation, onScroll fires (scrollEventThrottle 200ms) and recomputes
  //      isNearBottomRef from the CURRENT offset — still far from the bottom, so
  //      the "< 120" test writes back FALSE
  //   4. the thread's own late layout passes — the bubble's final height, an
  //      offer/meetup card measuring, the bottom bar re-measuring as QuickReplies
  //      appear, the keyboard opening — each change the content size again, but
  //      the gate now says false, so nobody finishes the scroll
  //
  // The list therefore stopped wherever step 2's animation happened to reach.
  // A tall last bubble (a meetup proposal or an offer card) is the worst case,
  // which is why the proposal messages were the ones seen half-hidden.
  const scrollLockUntilRef = useRef(0);

  // Drive the thread to its TRUE bottom and hold it there across the late layout
  // passes that follow an append.
  //
  // Three attempts, not one, and the last is UNANIMATED: an animation in flight
  // can be clamped or superseded by a layout change (the keyboard opening, the
  // bottom bar re-measuring, a tall bubble settling), while setting the offset
  // directly cannot. The gate is held open for the whole window so onScroll
  // cannot cancel it half-way, which is the bug this replaces.
  const scrollThreadToEnd = useCallback((animated = true) => {
    isNearBottomRef.current = true;
    scrollLockUntilRef.current = scrollLockDeadline(Date.now());
    const jump = (a: boolean) => flatListRef.current?.scrollToEnd({ animated: a });
    jump(animated);
    setTimeout(() => jump(animated), 140);
    setTimeout(() => {
      jump(false);
      scrollLockUntilRef.current = 0;
    }, 460);
  }, []);

  // RE-LAND the bottom whenever the bar's measured height changes.
  //
  // This is the other half of the owner's report ("when there are messages and
  // you come to the message page you need to scroll to see the last message… the
  // send message input and default message text proposal hide the latest
  // message… the scroll might work but the TARGET might be wrong"). That reading
  // is exactly right, and it is a different bug from the mid-flight cancel:
  //
  //   `bottomBarH` starts at 0 and is only learned from the bar's onLayout, so
  //   the list's paddingBottom is 0 for the first frames. A scrollToEnd during
  //   that window lands on a content height that does not yet reserve room for
  //   the composer or the QuickReplies chips, so the newest bubble comes to rest
  //   UNDERNEATH them — the scroll ran, the target was simply wrong.
  //
  //   Worse, once the bar reports ~120px the list is suddenly ~120px from its
  //   new bottom, and the near-bottom test is `< 120` — so the flag flips to
  //   false at almost exactly the bar's height and onContentSizeChange then
  //   refuses to fix it. The two defects lined up to make the last message
  //   reliably unreachable without a manual drag.
  //
  // Keying the effect on the measured height means the scroll happens when the
  // real target is known, however late that is, and again whenever the bar grows
  // or shrinks (QuickReplies appearing, the composer wrapping to a second line,
  // the keyboard opening and moving barLift).
  useEffect(() => {
    if (bottomBarH <= 0) return;
    if (!isNearBottomRef.current) return;
    scrollThreadToEnd(false);
  }, [bottomBarH, barLift, scrollThreadToEnd]);
  // TASK-D428: the "unread messages" divider boundary — a specific message
  // id, resolved ONCE from the first load's (conversation, messages) pair —
  // BEFORE markRead fires and zeroes conversation.unreadCount server-side —
  // via `resolveUnreadBoundaryId` in the focus effect below. `hasCaptured...`
  // (a ref: it only guards a one-time side effect, never drives rendering)
  // is what makes it "once" — `unreadBoundaryId` itself stays real React
  // state so `threadRows` below correctly recomputes when it's set.
  //
  // Review fix (DR BLOCKER): freezing the resolved ID instead of the raw
  // `unreadCount` is what actually fixes the divider drifting during a live
  // conversation — see groupMessagesByDay.ts's module doc for why re-deriving
  // "Nth-from-last incoming message" from a growing message list moved the
  // boundary forward as new incoming messages arrived.
  const hasCapturedUnreadBoundaryRef = useRef(false);
  const [unreadBoundaryId, setUnreadBoundaryId] = useState<number | null>(null);

  // TASK-D428: day separators + a single "unread messages" divider, built
  // from `filteredMessages` so an active chat search recomputes day rows
  // from the filtered set — and the unread divider is suppressed entirely
  // while searching (search results are not a timeline). Outcome lookups
  // in renderItem below intentionally keep using the full `messages` array,
  // never `threadRows` / `filteredMessages`.
  //
  // Review fix (CR MUST, TASK-C381): memoized — this used to recompute on
  // EVERY render regardless of whether any of its inputs actually changed.
  //
  // Review fix (CR LOW, TASK-D428): `unreadBoundaryId` is real state, not a
  // ref — a ref mutation never invalidates a `useMemo`, so listing
  // `capturedUnreadCountRef.current` in the old dependency array did
  // nothing; it only appeared to work because a co-occurring `setMessages`
  // elsewhere happened to force the recompute anyway.
  const threadRows: ThreadRow[] = useMemo(
    () => buildThreadRows(filteredMessages, searchVisible ? null : unreadBoundaryId),
    [filteredMessages, searchVisible, unreadBoundaryId]
  );

  // TASK-C381 (review fix, CR MUST): one pass over the FULL message list —
  // never `threadRows`/`filteredMessages`, which chat search can shrink and
  // which never contain the offer_accepted/offer_declined/offer_counter
  // response rows this index needs to look up — instead of the THREE
  // separate `.find()`/`.some()` scans renderItem used to run PER ROW (an
  // O(n) scan for every offer/counter bubble, on every render). Memoized so
  // it only rebuilds when the message list itself changes; see
  // `offerGuards.ts` for the single source of truth this replaces.
  const offerIndex = useMemo(() => buildOfferIndex(messages), [messages]);

  // TASK-C763: the newest offer/offer_counter that has actually been
  // accepted — covers BOTH the seller-accepts-buyer's-offer path (O947's
  // one-shot prompt) AND the buyer-accepts-seller's-counter path O947 never
  // handled. Memoized off the same `offerIndex` above (never a fresh scan).
  const agreedOffer = useMemo(() => findAgreedOffer(messages, offerIndex), [messages, offerIndex]);

  // TASK-C763: the persistent "second chance" banner — shown to the owner on
  // an active listing whenever there's a live agreed price in the thread,
  // regardless of whether O947's one-shot prompt already fired or was
  // dismissed. See agreedOffer.ts for why this is a hoisted, tested predicate
  // rather than an inline condition.
  const showAgreedDealBanner = shouldShowAgreedDealBanner({
    isOwner,
    listing: conversation?.listing,
    agreedOffer,
  });

  const PAGE_SIZE = 30;

  // ── Load conversation + messages (page 1 = newest, backend returns DESC) ─
  // Returns the freshly fetched `{ conversation, messages }` pair (ascending
  // order) or `null` on failure. TASK-D428: callers that need the pre-read
  // state — namely `resolveUnreadBoundaryId` in the focus effect below —
  // read it from THIS return value, not from `messages`/`conversation`
  // state, because a state update scheduled inside this function isn't
  // guaranteed to have flushed by the time an `await`ing caller resumes.
  const load = useCallback(async (convId: number): Promise<{ conversation: Conversation; messages: Message[] } | null> => {
    try {
      const [conv, { items, pagination }] = await Promise.all([
        conversationsAPI.getConversation(convId),
        conversationsAPI.getMessages(convId, { pageSize: PAGE_SIZE }),
      ]);
      setConversation(conv);
      // Seed the block state from the server so the ShieldBan toggle reflects
      // reality on first load (otherwise it always shows "not blocked" until tapped).
      setIsBlocked(conv.blockedWithParticipant ?? false);
      // Backend returns newest-first → reverse so FlatList shows oldest→newest
      const ascendingMessages = [...items].reverse();
      setMessages(ascendingMessages);
      setPage(1);
      setTotalPages(pagination.totalPages);
      // Snap to bottom on open. Same retry chain every append path now uses —
      // this hand-rolled pair of setTimeouts was the ONLY place that had one,
      // which is why sends, having none, stopped short. Unanimated: animating
      // here would visibly race through the whole thread on open.
      scrollThreadToEnd(false);
      return { conversation: conv, messages: ascendingMessages };
    } catch {
      toast.error(t("chat.thread.loadFailed"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // ── TASK-O947 review fix (CACHE/DUPLICATION) ──────────────────────────────
  // The single source of truth for "a listing lifecycle mutation just
  // succeeded from inside this screen" — invalidates every query surface that
  // needs to reflect the new status (the listing detail, the seller's My
  // Listings feed + status-count chips, and this listing's conversations)
  // and reloads the local conversation state via `load(convId)` below so the
  // pinned ListingHeader flips without a manual refresh. Previously this
  // exact block lived ONLY inside `handleReserveAfterAcceptConfirm`'s
  // `onReserved`, while the pinned ListingHeader's own `onLifecycleDone` (its
  // manual "Reserve"/"Mark sold" button) invalidated just `["conversation",
  // id]` — so reserving via that button left My Listings and the
  // status-count chips stale until the seller manually pulled to refresh.
  // Both paths now call this one function.
  //
  // Review fix (SHOULD-FIX, DUPLICATION) — reuse the exported `..._QK`
  // constants (imported above) instead of re-typing their string values
  // here; a rename in `useListingLifecycle.ts` would otherwise silently stop
  // this helper from invalidating anything, with no test able to catch it.
  // Also now invalidates `CONVERSATIONS_QK` — the prefix of
  // `BuyerPickerSheet`'s own `["conversations", listingId, "buyer-picker"]`
  // key — matching `useListingLifecycle`'s own canonical `invalidateAll()`,
  // which this helper previously omitted.
  //
  // Review fix (LOW) — this screen still fetches `conversation`/`messages`
  // with `useState` + the imperative `load()` below rather than `useQuery`
  // (a pre-existing violation of the MANDATORY React Query rule, tracked
  // separately and out of scope here), so nothing in this codebase ever
  // subscribes to a `["conversation", id]` query key. Invalidating it was
  // dead code; the conversation is actually refreshed by `load(convId)`.
  const invalidateListingLifecycleQueries = useCallback(
    (convId: number | null) => {
      // Bare (id-less) key — deliberately broader than an exact
      // ["listing", id] match. ListingDetail.tsx and MyListingDetail.tsx key
      // their detail queries by the STRING route param while this handler
      // only has the numeric listingId; invalidating the whole "listing"
      // namespace (React Query's default partial match) refreshes both
      // regardless of the id's type instead of silently missing due to a
      // string/number key mismatch. (No exported constant covers this bare
      // "listing" namespace key — only the four below do.)
      qc.invalidateQueries({ queryKey: ["listing"] });
      qc.invalidateQueries({ queryKey: [MY_LISTING_QK] });
      qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
      qc.invalidateQueries({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
      qc.invalidateQueries({ queryKey: [CONVERSATIONS_QK] });
      if (convId) load(convId);
    },
    [qc, load]
  );

  // ── Load older messages when user scrolls to top ─────────────────────────
  const loadOlderMessages = useCallback(async () => {
    const convId = currentConversationId;
    if (!convId || isLoadingMoreRef.current || page >= totalPages) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const { items } = await conversationsAPI.getMessages(convId, {
        pageSize: PAGE_SIZE,
        pageNumber: page + 1,
      });
      // Reverse DESC→ASC then prepend (older goes on top)
      const older = [...items].reverse();
      setMessages((prev) => [...older, ...prev]);
      setPage((p) => p + 1);
    } catch {
      // silent — user can retry by scrolling
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [currentConversationId, page, totalPages]);

  // ── Memoized scroll handler for infinite scroll ──────────────────────────
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
      // Track whether user is near the bottom (latest messages) — EXCEPT while
      // a programmatic scroll-to-bottom is in flight. Those intermediate
      // offsets are not where the user chose to be, and treating them as such
      // is what cancelled the scroll half-way (see scrollLockUntilRef).
      if (shouldTrackScrollPosition(Date.now(), scrollLockUntilRef.current)) {
        isNearBottomRef.current = isNearBottom({
          contentHeight: contentSize.height,
          viewportHeight: layoutMeasurement.height,
          offsetY: contentOffset.y,
        });
      }
      // Trigger load of older messages when scrolled near the top
      if (
        contentOffset.y < 80 &&
        !isLoadingMoreRef.current &&
        page < totalPages
      ) {
        loadOlderMessages();
      }
    },
    [loadOlderMessages, page, totalPages]
  );

  // Mark messages as read silently
  const markRead = useCallback(
    async (convId: number) => {
      try {
        await conversationsAPI.markMessagesRead(convId);
        // The chat tab badge reads unreadMessageCount off ["me"], so reading a thread
        // has to invalidate it or the badge keeps advertising messages the user has
        // just read — up to a minute, until the poll comes round.
        qc.invalidateQueries({ queryKey: ["me"] });
      } catch {
        // silent — non-critical
      }
    },
    [qc]
  );

  useFocusEffect(
    useCallback(() => {
      if (currentConversationId) {
        // TASK-D428: load MUST resolve before markRead fires — markRead
        // zeroes unread server-side, so calling it first (or in parallel,
        // as before) would race the unread-divider capture below.
        (async () => {
          const result = await load(currentConversationId);
          // Review fix (DR BLOCKER): resolve the divider's boundary MESSAGE
          // ID exactly once, from THIS load's own (conversation, messages)
          // pair — never from a live recomputation later. Once resolved,
          // `threadRows` above just looks for that exact id for the rest of
          // this screen visit, so it can never drift as new messages arrive.
          if (!hasCapturedUnreadBoundaryRef.current) {
            hasCapturedUnreadBoundaryRef.current = true;
            setUnreadBoundaryId(
              result
                ? resolveUnreadBoundaryId(result.messages, result.conversation.unreadCount ?? 0, currentUser?.id ?? null)
                : null
            );
          }
          markRead(currentConversationId);
        })();
      } else {
        // Start-flow: no existing conversation yet
        setIsLoading(false);
      }
    }, [currentConversationId, load, markRead, currentUser?.id])
  );


  // ── Start conversation (first message, listing detail flow) ──────────────
  const handleStartConversation = useCallback(async () => {
    if (!listingId || !messageText.trim()) return;
    setIsStarting(true);
    try {
      // The backend StartService returns the existing conversation on duplicate (HTTP 201)
      // so we always get a valid conversation back on success.
      const conv = await conversationsAPI.startConversation(listingId, messageText.trim());
      setCurrentConversationId(conv.id);
      setMessageText("");
      // No clearDraft() here because the draft hook was a no-op while
      // currentConversationId was null. The setMessageText("") call is enough.
      await load(conv.id);
    } catch (err: unknown) {
      const httpStatus = (err as { response?: { status?: number } })?.response?.status;
      if (httpStatus === 422) {
        const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "";
        if (errorMsg.includes("not active")) {
          toast.error(t("chat.thread.inactiveListing"));
        } else if (errorMsg.includes("own listing")) {
          toast.error(t("chat.thread.selfConversation"));
        } else if (errorMsg.includes("blank")) {
          // message body blank — shouldn't happen because we check, but guard anyway
          toast.error(t("chat.thread.sendFailed"));
        } else {
          toast.error(t("chat.thread.startFailed"));
        }
      } else if (httpStatus === 403) {
        toast.error(t("chat.thread.inactiveListing"));
      } else {
        toast.error(t("chat.thread.startFailed"));
      }
    } finally {
      setIsStarting(false);
    }
  }, [listingId, messageText, load, t]);

  // ── Send a text message ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const convId = currentConversationId;
    if (!convId || !messageText.trim() || isSending) return;
    const text = messageText.trim();
    // Clear the composer immediately — also wipes the persisted draft key.
    // If the send fails, we restore the text and the draft (via setMessageText).
    setMessageText("");
    clearDraft();
    setIsSending(true);

    // Optimistic append — always scroll to bottom when user sends
    const optimistic: Message = {
      id: -Date.now(),
      body: text,
      kind: "text",
      readAt: null,
      createdAt: new Date().toISOString(),
      sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
    };
    // Mark "at bottom" so onContentSizeChange scrolls to the true bottom once
    // the new bubble has rendered and the list re-measures.
    scrollThreadToEnd();
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await conversationsAPI.sendMessage(convId, text, "text");
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      // Draft was already cleared above; nothing else needed on success.
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      // Restore the draft text on failure — this also re-persists it to storage
      // (debounced) so the user doesn't lose their message.
      setMessageText(text);
      toast.error(t("chat.thread.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }, [currentConversationId, messageText, isSending, currentUser, clearDraft, t]);

  // ── TASK-C381: send a price offer from inside the thread ─────────────────
  // Reuses the canonical "amount|currency|listedPrice" body encoding parsed
  // by MessageBubble/ConversationRow, and the same optimistic-append +
  // rollback pattern as handleSend.
  const handleSendOfferInThread = useCallback(
    async (inputAmount: string) => {
      const convId = currentConversationId;
      if (!convId) return;
      // Review fix (DR): hoisted into the shared `parseOfferAmount` — see
      // its own doc comment — so this guard and `handleSendCounter`'s below
      // can never drift apart again.
      const amount = parseOfferAmount(inputAmount);
      if (amount == null) {
        toast.error(t("listing.detail.offerInvalid"));
        return;
      }
      const currency = conversation?.listing?.currency ?? "AFN";
      const listedPrice = conversation?.listing?.price ?? 0;
      const body = `${amount}|${currency}|${listedPrice}`;

      // SF-M11 — validated against the same ceiling the server enforces, so
      // "I'll take 20" on a 15-unit batch is caught here rather than coming
      // back as a 422 the sender has to decode.
      const parsedQuantity = parseOfferQuantity(
        threadOfferQuantity,
        conversation?.listing?.availableUnits
      );
      if (parsedQuantity.errorKey) {
        toast.error(
          t(parsedQuantity.errorKey, {
            available: conversation?.listing?.availableUnits ?? 0,
          })
        );
        return;
      }

      // Close the sheet immediately — mirrors handleSend clearing the
      // composer before the request resolves.
      setThreadOfferSheetVisible(false);
      setThreadOfferAmount("");
      setThreadOfferQuantity("");
      setIsSendingThreadOffer(true);

      // Optimistic append — same pattern as handleSend / handleProposeMeetup.
      const optimistic: Message = {
        id: -Date.now(),
        body,
        kind: "offer",
        readAt: null,
        createdAt: new Date().toISOString(),
        sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
        // SF-M11: the optimistic bubble carries the quantity too, or it would
        // render "AFN 14,000" for a beat and then jump to "3 × AFN 14,000"
        // when the real row arrives.
        offerQuantity: parsedQuantity.value,
      };
      scrollThreadToEnd();
      setMessages((prev) => [...prev, optimistic]);

      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          body,
          "offer",
          undefined,
          parsedQuantity.value ?? undefined
        );
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      } catch (err) {
        // Rollback — remove the optimistic bubble; the buyer/seller can
        // retry from the composer's offer button again.
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        // SF-M11: show what the SERVER said, not a blanket "couldn't send".
        // This path can now fail for a reason the sender can act on (someone
        // else bought units between opening the sheet and sending), and
        // "Message failed to send" would hide it — the exact class of bug
        // reported as "user did not see this error, it says server error".
        toast.error(apiErrorMessage(err, t, "chat.thread.sendFailed"));
      } finally {
        setIsSendingThreadOffer(false);
      }
    },
    [currentConversationId, conversation, currentUser, threadOfferQuantity, t]
  );

  // ── Send meetup proposal ─────────────────────────────────────────────────
  // Body encoding is backward compatible (see meetupBody.ts): coords are only
  // appended as a 3rd "lat,long" segment when the proposer picked an exact
  // spot on the map — legacy 2-part "place | time" messages keep working.
  const handleProposeMeetup = useCallback(async (place: string, time: string, coords?: MeetupCoords) => {
    const convId = currentConversationId;
    if (!convId) return;
    const body = encodeMeetupBody(place, time, coords);

    try {
      const sent = await conversationsAPI.sendMessage(convId, body, "meetup_proposal");
      scrollThreadToEnd();
      setMessages((prev) => [...prev, sent]);
      setMeetupSheetVisible(false);
      toast.success(t("chat.thread.meetupSent"));
    } catch {
      toast.error(t("chat.thread.meetupFailed"));
    }
  }, [currentConversationId, t]);

  // ── Respond to a meetup proposal (accept / decline) ──────────────────────
  const handleMeetupRespond = useCallback(
    async (proposal: Message, accepted: boolean) => {
      const convId = currentConversationId;
      // Review fix (LOW-MEDIUM, DUPLICATION + A11Y GAP) — mirrors the offer
      // row's existing double-tap guard (TASK-O947); this row never had one.
      if (!convId || !proposal.body || isRespondingToMeetup) return;
      setRespondingMeetupTarget({ messageId: proposal.id, accepted });
      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          proposal.body,
          accepted ? "meetup_accepted" : "meetup_declined",
          proposal.id
        );
        scrollThreadToEnd();
        setMessages((prev) => [...prev, sent]);
        toast.success(accepted ? t("chat.meetup.acceptedToast") : t("chat.meetup.declinedToast"));
      } catch {
        toast.error(t("chat.thread.meetupFailed"));
      } finally {
        setRespondingMeetupTarget(null);
      }
    },
    [currentConversationId, t, isRespondingToMeetup]
  );

  // ── Respond to a price offer (accept / decline) ──────────────────────────
  const handleOfferRespond = useCallback(
    async (offer: Message, accepted: boolean) => {
      const convId = currentConversationId;
      // TASK-O947: ignore a second tap while a response is already in flight
      // (see isRespondingToOffer above) — never queue/duplicate the request.
      if (!convId || !offer.body || isRespondingToOffer) return;
      setRespondingOfferTarget({ messageId: offer.id, accepted });
      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          offer.body,
          accepted ? "offer_accepted" : "offer_declined",
          offer.id
        );
        scrollThreadToEnd();
        setMessages((prev) => [...prev, sent]);
        toast.success(accepted ? t("chat.offer.acceptedToast") : t("chat.offer.declinedToast"));

        // TASK-O947: after a SUCCESSFUL accept, offer the owner a one-tap
        // reserve for the conversation's buyer at the accepted price — this
        // never fires on decline, never fires for the buyer (the shared
        // `isOwner` guards that), and a reserve failure never touches the
        // accept above. Building the prompt has no side effects — it only
        // opens the confirm sheet (rendered near the other sheets below);
        // the actual reserve happens in `handleReserveAfterAcceptConfirm`.
        if (accepted && conversation?.listing) {
          const offerAmount =
            offer.offerAmount ?? Number((offer.body ?? "").split("|")[0] ?? 0);
          const listingRef = conversation.listing;

          const prompt = buildReserveAfterAcceptPrompt({
            isOwner,
            listing: listingRef,
            buyer: conversation.buyer ?? null,
            offerAmount,
            // Review fix: precedence logic (listing currency wins, offer
            // currency is only a fallback) hoisted into `resolveReserveCurrency`
            // — see reserveAfterAccept.ts and its unit tests.
            currency: resolveReserveCurrency(listingRef.currency, offer.offerCurrency),
            t,
            formatCurrency,
          });
          if (prompt) {
            setReserveConfirmError(null);
            setReserveConfirm(prompt);
          }
        }
      } catch {
        toast.error(t("chat.thread.sendFailed"));
      } finally {
        setRespondingOfferTarget(null);
      }
    },
    [currentConversationId, conversation, isOwner, formatCurrency, t, isRespondingToOffer]
  );

  // ── TASK-O947: confirm the one-tap reserve prompt ─────────────────────────
  // Called from the confirm sheet's onConfirm. `reserveAfterAccept` (the
  // standalone, unit-tested module function) does the actual PUT + toasts
  // and resolves true/false (never throws); this wrapper only owns the
  // sheet's submitting state and — mirroring ListingHeader's own
  // `handleBuyerPickerConfirm` — only closes the sheet on SUCCESS, so a
  // reserve failure leaves it open for the seller to retry. The invalidation
  // set itself is `invalidateListingLifecycleQueries` (review fix, MUST-FIX
  // CACHE/DUPLICATION — shared with the pinned ListingHeader's own
  // `onLifecycleDone` below, so reserving from EITHER path refreshes My
  // Listings and the status-count chips, not just this conversation).
  const handleReserveAfterAcceptConfirm = useCallback(async (quantity?: number) => {
    if (!reserveConfirm) return;
    const convId = currentConversationId;
    setIsReservingAfterAccept(true);
    // Clear any previous failure's inline message before retrying.
    setReserveConfirmError(null);
    const succeeded = await reserveAfterAccept(reserveConfirm, {
      t,
      // Design review fix — this was never threaded through, so BOTH the
      // O947 auto-prompt AND the SF-M2 manual "Place a hold" trigger placed
      // every hold for exactly 1 unit no matter what the seller picked in
      // the sheet's own quantity stepper (once that stepper could even
      // render at all — see the `remainingQuantity` fix on this sheet's JSX
      // above). `BuyerPickerSheet`'s `onConfirm` already hands back
      // `result.quantity` — the caller just never read it.
      quantity,
      onReserved: () => invalidateListingLifecycleQueries(convId),
      onError: setReserveConfirmError,
    });
    setIsReservingAfterAccept(false);
    // CYCLE-6/O947 fix-list: `reserveAfterAccept` resolves `false` (never
    // throws) specifically so a failed reserve can leave this sheet OPEN for
    // a retry — the same contract ListingHeader's own
    // `handleBuyerPickerConfirm` already honors (it only clears
    // `buyerPickerAction` inside the success path, never in its `catch`).
    // Only clearing `reserveConfirm` on success closes the sheet; a failure
    // now keeps it visible with the same buyer/price/error toast already
    // shown, instead of silently discarding the seller's one-tap reserve.
    if (succeeded) setReserveConfirm(null);
  }, [reserveConfirm, currentConversationId, invalidateListingLifecycleQueries, t]);

  // ── TASK-C763: open the reserve-confirm sheet from the AgreedDealBanner ───
  // Builds EXACTLY the same prompt shape `handleOfferRespond`'s O947 one-shot
  // path already builds and feeds into the SAME `reserveConfirm` state — so
  // the SAME `BuyerPickerSheet` confirm mode, `reserveAfterAccept()` call and
  // `reserveConfirmError` inline-error path handle it. Never a second reserve
  // flow, never a second sheet.
  const handleOpenAgreedDealReserve = useCallback(() => {
    if (!agreedOffer || !conversation?.listing || !conversation?.buyer) return;
    const listingRef = conversation.listing;
    const prompt = buildReserveAfterAcceptPrompt({
      isOwner,
      listing: listingRef,
      buyer: conversation.buyer,
      offerAmount: agreedOffer.amount,
      currency: resolveReserveCurrency(listingRef.currency, agreedOffer.currency),
      t,
      formatCurrency,
    });
    if (prompt) {
      setReserveConfirmError(null);
      setReserveConfirm(prompt);
    }
  }, [agreedOffer, conversation, isOwner, t, formatCurrency]);

  // ── SF-M2: "Place a hold for {{name}}" — ComposerActionsSheet's "+" menu ──
  // Builds the SAME confirm-sheet prompt shape (`buildPlaceHoldPrompt`
  // generalizes `buildReserveAfterAcceptPrompt` for this manual trigger — see
  // reserveAfterAccept.ts's own doc) and feeds it into the SAME
  // `reserveConfirm` state as the accept-offer / agreed-deal-banner paths
  // above — the SAME BuyerPickerSheet confirm mode, the SAME
  // `reserveAfterAccept()` side effect, the SAME stay-open-on-error contract.
  // Never a second reserve flow, never a second sheet, and — because the
  // buyer is always this conversation's own buyer — never the full
  // pick-a-buyer list.
  const handlePlaceHold = useCallback(() => {
    if (!conversation?.listing || !conversation?.buyer) return;
    const prompt = buildPlaceHoldPrompt({
      listing: conversation.listing,
      buyer: conversation.buyer,
      t,
    });
    if (prompt) {
      setReserveConfirmError(null);
      setReserveConfirm(prompt);
    }
  }, [conversation, t]);

  // ── SF-M2: "Release hold" — ComposerActionsSheet's "+" menu ───────────────
  // Same endpoint + copy as useListingLifecycle.ts's own `releaseHold`
  // mutation (`PUT .../activate`, `listing.releaseHoldSuccess`) — reused here
  // via the SAME exported `..._QK` constants and the SAME
  // `invalidateListingLifecycleQueries` helper this screen already shares
  // with the reserve-after-accept path above, rather than pulling in the
  // WHOLE `useListingLifecycle` hook: that hook also owns
  // publish/unpublish/delete/edit/duplicate/mark-sold/review-prompt state
  // that has nothing to do with this composer row, and expects a
  // differently-shaped `listing` Pick than a conversation payload carries.
  const releaseHoldMutation = useMutation({
    mutationFn: (id: number) => listingsAPI.activateListing(id),
    onSuccess: () => {
      invalidateListingLifecycleQueries(currentConversationId);
      toast.success(t("listing.releaseHoldSuccess"));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const handleReleaseHold = useCallback(() => {
    const id = conversation?.listing?.id;
    if (!id) return;
    confirmAlert(
      t("listing.confirmReleaseHold"),
      t("listing.confirmReleaseHoldDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.releaseHold"), onPress: () => releaseHoldMutation.mutate(id) },
      ]
    );
  }, [t, conversation?.listing?.id, releaseHoldMutation]);

  // ── Open counter-offer sheet — either participant, TASK-C381 ─────────────
  const handleOpenCounterSheet = useCallback((offer: Message) => {
    if (!offer.body) return;
    setCounterOfferTarget(offer);
    // Pre-fill with the prior offer/counter amount so the recipient can edit from there
    const parts = offer.body.split("|");
    const priorAmount = offer.offerAmount ?? Number(parts[0] ?? 0);
    setCounterOfferAmount(String(priorAmount > 0 ? priorAmount : ""));
    // SF-M11 — carry the prior quantity in as the starting value, the same way
    // the amount is carried. Left EMPTY when the prior offer named no quantity
    // (`offerQuantity == null`), because empty means "unspecified" on the wire:
    // prefilling a literal "1" would turn a silence into an assertion.
    setCounterOfferQuantity(
      offer.offerQuantity != null ? String(offerUnits(offer.offerQuantity)) : ""
    );
    setCounterSheetVisible(true);
  }, []);

  // ── Send a counter-offer — either participant, TASK-C381 ────────────────
  const handleSendCounter = useCallback(
    async (amountStr: string) => {
      const convId = currentConversationId;
      if (!convId || !counterOfferTarget?.body) return;
      // Review fix (CR MUST / DR): the merged OfferSheet's Send button is now
      // disabled for a non-positive amount too, but this handler validates
      // independently (defense in depth, and the same `parseOfferAmount`
      // guard `handleSendOfferInThread` already uses) — a counter of "0" or
      // "-500" must never reach the API with no error toast.
      const amount = parseOfferAmount(amountStr);
      if (amount == null) {
        toast.error(t("listing.detail.offerInvalid"));
        return;
      }
      setIsSendingCounter(true);

      const parts = counterOfferTarget.body.split("|");
      const currency = counterOfferTarget.offerCurrency ?? parts[1] ?? "AFN";
      const listedPrice = parts[2] ?? "0";
      const body = `${amount}|${currency}|${listedPrice}`;

      // SF-M11 — a counter restates the quantity as well as the price. The API
      // permits it on `offer_counter` for exactly this reason: without it, the
      // agreed units are lost the moment either side moves the price, because
      // `findAgreedOffer` reads the terms off the NEWEST accepted offer.
      const parsedQuantity = parseOfferQuantity(
        counterOfferQuantity,
        conversation?.listing?.availableUnits
      );
      if (parsedQuantity.errorKey) {
        toast.error(
          t(parsedQuantity.errorKey, {
            available: conversation?.listing?.availableUnits ?? 0,
          })
        );
        setIsSendingCounter(false);
        return;
      }

      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          body,
          "offer_counter",
          counterOfferTarget.id,
          parsedQuantity.value ?? undefined
        );
        scrollThreadToEnd();
        setMessages((prev) => [...prev, sent]);
        setCounterSheetVisible(false);
        setCounterOfferTarget(null);
        setCounterOfferAmount("");
        setCounterOfferQuantity("");
        toast.success(t("chat.offer.counterSentToast"));
      } catch (err) {
        // Same reasoning as the in-thread offer path: surface the server's own
        // reason (e.g. only 12 units left now) instead of a blanket failure.
        toast.error(apiErrorMessage(err, t, "chat.thread.sendFailed"));
      } finally {
        setIsSendingCounter(false);
      }
    },
    [currentConversationId, counterOfferTarget, conversation, counterOfferQuantity, t]
  );

  // ── Send file attachment ─────────────────────────────────────────────────
  // TASK-K487: same optimistic-bubble → replace-on-success / rollback +
  // toast-on-failure contract as handlePhotoAttachment below — previously
  // this awaited conversationsAPI.sendFile with no in-flight feedback at
  // all, so picking a large PDF looked like the tap did nothing until the
  // bubble finally appeared.
  const [isSendingFile, setIsSendingFile] = useState(false);

  const handleAttachment = useCallback(async () => {
    const convId = currentConversationId;
    if (!convId || isSendingFile) return;
    try {
      // Dynamic import so the app still works if expo-document-picker is not installed
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const fileName = file.name ?? "file";
      const mimeType = file.mimeType ?? "application/octet-stream";

      setIsSendingFile(true);

      // Optimistic insert — same pattern as handlePhotoAttachment: show a
      // placeholder bubble immediately and scroll to it, replace it with the
      // server message on success, roll it back + toast on failure.
      const optimistic: Message = {
        id: -Date.now(),
        body: fileName,
        kind: "document",
        readAt: null,
        createdAt: new Date().toISOString(),
        sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
        attachmentUrl: file.uri, // local URI so the bubble is tappable immediately
      };
      scrollThreadToEnd();
      setMessages((prev) => [...prev, optimistic]);

      try {
        const sent = await conversationsAPI.sendFile(convId, file.uri, fileName, mimeType);
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      } catch {
        // Rollback optimistic insert
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(t("chat.thread.sendFailed"));
      } finally {
        setIsSendingFile(false);
      }
    } catch (err: unknown) {
      setIsSendingFile(false);
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("Cannot find module")) {
        toast.error(t("chat.thread.filePickerNotAvailable"));
      } else {
        toast.error(t("chat.thread.sendFailed"));
      }
    }
  }, [currentConversationId, isSendingFile, currentUser, t]);

  // ── Send photo from camera or library ───────────────────────────────────
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);

  const handlePhotoAttachment = useCallback(async () => {
    const convId = currentConversationId;
    if (!convId || isSendingPhoto) return;

    try {
      const ImagePicker = await import("expo-image-picker");

      // Platform audit (2026-07-03): same "limited" access rule as PhotosSection /
      // Profile avatar picker — status stays "granted" while accessPrivileges can be
      // "limited" (iOS 14+ / Android 14+ partial photo access). Denied → centralized,
      // localized alert with an Open Settings action (never a silent toast dead-end).
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        showPermissionDeniedAlert("photos", t);
        return;
      }
      if (libraryPermission.accessPrivileges === "limited") {
        showLimitedPhotoAccessAlert(t);
        // Intentionally fall through — the user can still pick from their allowed subset.
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
        allowsMultipleSelection: false,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      const asset = pickerResult.assets[0];
      const uri = asset.uri;
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";

      setIsSendingPhoto(true);

      // Optimistic insert — show a placeholder bubble while uploading
      const optimistic: Message = {
        id: -Date.now(),
        body: fileName,
        kind: "image_message",
        readAt: null,
        createdAt: new Date().toISOString(),
        sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
        attachmentUrl: uri, // local URI for immediate preview
      };
      scrollThreadToEnd();
      setMessages((prev) => [...prev, optimistic]);

      try {
        const sent = await conversationsAPI.sendImage(convId, uri, fileName, mimeType);
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      } catch {
        // Rollback optimistic insert
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(t("chat.photo.uploadFailed"));
      } finally {
        setIsSendingPhoto(false);
      }
    } catch (err: unknown) {
      setIsSendingPhoto(false);
      toast.error(t("chat.photo.uploadFailed"));
    }
  }, [currentConversationId, isSendingPhoto, currentUser, t]);

  // ── Soft-delete a message (author only) ──────────────────────────────────
  const handleDeleteMessage = useCallback(
    async (msg: Message) => {
      const convId = currentConversationId;
      if (!convId) return;

      // Optimistic update: flip the bubble to tombstone immediately
      const tombstone: Message = { ...msg, deleted: true, body: null, attachmentUrl: null };
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? tombstone : m)));

      try {
        const updated = await conversationsAPI.deleteMessage(convId, msg.id);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } catch {
        // Rollback on failure
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        toast.error(t("chat.thread.sendFailed"));
      }
    },
    [currentConversationId, t]
  );

  // ── Block / unblock the other participant ────────────────────────────────
  const otherParticipant = conversation?.otherParticipant;

  const blockMutation = useMutation({
    mutationFn: (userId: number) => usersAPI.blockUser(userId),
    onSuccess: () => {
      setIsBlocked(true);
      toast.success(t("chat.block.blockSuccess"));
    },
    onError: () => toast.error(t("chat.block.blockFailed")),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: number) => usersAPI.unblockUser(userId),
    onSuccess: () => {
      setIsBlocked(false);
      toast.success(t("chat.block.unblockSuccess"));
    },
    onError: () => toast.error(t("chat.block.unblockFailed")),
  });

  const handleBlockToggle = useCallback(() => {
    if (!otherParticipant) return;
    if (isBlocked) {
      unblockMutation.mutate(otherParticipant.id);
    } else {
      confirmAlert(
        t("chat.block.blockConfirmTitle"),
        t("chat.block.blockConfirmDescription"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("chat.block.blockUser"),
            style: "destructive",
            onPress: () => blockMutation.mutate(otherParticipant.id),
          },
        ]
      );
    }
  }, [otherParticipant, isBlocked, blockMutation, unblockMutation, t]);

  // ── Quick-reply chip insert ──────────────────────────────────────────────
  // Appends the selected phrase to the current draft (with a leading space if
  // the draft is non-empty), then focuses the input so the user can edit
  // before sending. Does NOT auto-send.
  const handleQuickReplySelect = useCallback((phrase: string) => {
    // Build the new text from the current draft value, then call setDraft (aliased
    // as setMessageText) which persists it to AsyncStorage and updates the UI state.
    const trimmed = messageText.trimEnd();
    const next = trimmed.length > 0 ? `${trimmed} ${phrase}` : phrase;
    setMessageText(next);
    // Focus the text input so the keyboard opens and cursor lands at the end
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [messageText, setMessageText]);

  // ── Live updates via ActionCable ─────────────────────────────────────────
  useConversationCable(currentConversationId, useCallback((incoming: Message) => {
    // If the incoming broadcast carries deleted:true, flip any existing bubble
    // with that id to tombstone — this handles the remote participant seeing the
    // delete in real time. Skip the sender-guard for deletes so the author's own
    // optimistic tombstone can be confirmed by the cable broadcast.
    if (incoming.deleted) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === incoming.id ? { ...m, deleted: true, body: null, attachmentUrl: null } : m
        )
      );
      return;
    }

    // Skip new messages from the current user — they're already handled by
    // the optimistic update + HTTP response. Without this check the cable
    // broadcast (which goes to ALL participants including the sender) would
    // race with the HTTP response and produce a duplicate.
    if (currentUser && Number(incoming.sender.id) === Number(currentUser.id)) return;

    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
    // Scrolling is handled by onContentSizeChange (guarded by isNearBottomRef),
    // which fires after the new bubble has rendered.
  }, [currentUser]));

  // ── Derived ──────────────────────────────────────────────────────────────
  const isClosed = conversation?.status === "closed";
  // isBlocked belongs here with isClosed: the API refuses both
  // (ConversationPolicy#send_message?), so a live composer in either state can
  // only lead the user into a 403 after they have typed the whole message.
  const canSend = !isClosed && !isBlocked && !!currentConversationId;
  const isStartMode = !currentConversationId && !!listingId;

  // ── SF-M2: "Place a hold for {{name}}" / "Release hold" (ComposerActionsSheet
  // "+" menu) ────────────────────────────────────────────────────────────────
  // `conversation.listing` never carries `heldUnits` — ConversationSerializer
  // hand-rolls its own `listing` hash for BOTH its `:list` and `:detailed`
  // views (conversation_serializer.rb) rather than reusing ListingSerializer,
  // so it never picked up `held_units` even though that field sits on
  // ListingSerializer's BASE fields (present on every OTHER view — see
  // stock.ts's own doc). Rather than paper over the gap by gating on status
  // alone (the exact mistake this ticket exists to prevent), fetch the
  // owner's own listing detail here — under the SAME [MY_LISTING_QK, id] key
  // MyListingDetail/useListingLifecycle already use, so a place/release hold
  // from ANY surface invalidates and refreshes this one too. Owner-only: a
  // buyer viewing this thread has no reason to hit an endpoint they'd 403 on.
  const pinnedListingId = conversation?.listing?.id ?? null;
  const { data: ownerListingDetail } = useQuery({
    queryKey: [MY_LISTING_QK, String(pinnedListingId)],
    queryFn: () => listingsAPI.getMyListing(pinnedListingId as number),
    enabled: isOwner && !!pinnedListingId,
  });

  // Mirrors useListingLifecycle's own `hasOpenHold` EXACTLY — status alone is
  // not enough, because a multi-unit batch deliberately keeps `status:
  // "active"` while holding units for a buyer (SF-B2), and the backend's
  // `ListingPolicy#activate?` was widened to match. Never re-derive this —
  // `heldUnitsOf` (stock.ts) is the one place that reads `heldUnits`.
  const hasOpenHold =
    conversation?.listing?.status === "reserved" || heldUnitsOf(ownerListingDetail) > 0;

  // The composer's "Place a hold for {{name}}" row: seller, a Live listing
  // that isn't ALREADY holding units for anyone, and a known buyer (always
  // true for a real conversation — SF-M2's whole premise, docs/
  // SELL_FLOW_REDESIGN.md §4.4.2).
  const canPlaceHold =
    isOwner &&
    !!conversation?.listing &&
    !!conversation?.buyer &&
    conversation.listing.status === "active" &&
    !hasOpenHold;

  // TASK-C381 / TASK-K729: show the composer's offer button only on an open
  // conversation about a listing that still exists, isn't reserved or sold,
  // and is negotiable. Both roles may tap it — a seller opening one is a
  // proactive discount. Reserved is excluded (as well as sold) because once
  // the seller has committed to a buyer, a NEW offer no longer makes sense —
  // ListingUnavailableNotice below replaces the vanished control with an
  // explicit reason + a real next step instead of a silent gap.
  //
  // Review fix (MEDIUM): hoisted into a pure, independently-unit-tested
  // module (threadAvailability.ts) — this screen is too deeply coupled to
  // mount in a test, so an inline guard here was only ever exercised by
  // hand-copied duplicates in the test files, which is how the original
  // K729 bug (reserved offers not excluded) stayed green.
  const canOfferInThread = canOfferInThreadPure({
    canSend,
    listing: conversation?.listing,
    listingDeleted: conversation?.listingDeleted,
  });

  // TASK-K729: the buyer-facing reserved/sold recovery notice — never shown
  // to the listing's own seller (isOwner), who already has the lifecycle
  // controls in ListingHeader and the buyer info in SaleBuyerCard elsewhere,
  // and never before the viewer is known (review fix, LOW — prevents a
  // one-frame flash of the buyer-facing copy for a seller on a cold start,
  // while `currentUser` is still resolving and `isOwner` reads false).
  const showUnavailableNotice = showUnavailableNoticePure({
    isOwner,
    viewerKnown: !!currentUser,
    listing: conversation?.listing,
    listingDeleted: conversation?.listingDeleted,
  });

  // TASK-K729 (review fix, LOW): the reason the composer's offer row is
  // missing FROM INSIDE the sheet where it vanished — reused as a disabled
  // row with a one-line explanation in ComposerActionsSheet (both roles: the
  // seller opening "+" on their own reserved/sold listing gets the same
  // neutral status reason, never the buyer-facing recovery copy above).
  const offerUnavailableReasonStatus = offerUnavailableStatus({
    canSend,
    listing: conversation?.listing,
    listingDeleted: conversation?.listingDeleted,
  });
  const offerUnavailableReason =
    offerUnavailableReasonStatus === "sold"
      ? t("chat.thread.unavailable.soldTitle")
      : offerUnavailableReasonStatus === "reserved"
      ? t("chat.thread.unavailable.reservedTitle")
      : undefined;

  return (
    <View
      onLayout={(e) => setRootH(e.nativeEvent.layout.height)}
      style={[
        styles.container,
        { backgroundColor: colors.background },
        // No keyboard padding here. The bottom bar is absolutely positioned
        // against this view at the keyboard's top edge — see the bar itself.
      ]}
    >

      {/* ── Nav bar — always shown, owns safe-area top ───────────────────── */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop:      insets.top + 8,
            flexDirection:   isRtl ? "row-reverse" : "row",
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <BackButton
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(main)/(tabs)/chat" as any);
          }}
        />

        {/* Tappable participant info → seller profile */}
        <View style={[styles.navCenter, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          {otherParticipant ? (
            <UserIdentity
              name={otherParticipant.name}
              avatarUrl={otherParticipant.avatarUrl}
              verified={otherParticipant.verified ?? false}
              size={32}
              layout="row"
              // UserIdentity puts this on its Pressable wrapper when onPress is
              // set. Without it the only handle was the participant's NAME, which
              // is seed data — so the flow broke whenever the fixture changed.
              testID="other-participant-name"
              onPress={() => router.push(`/(main)/seller/${otherParticipant.id}` as never)}
            />
          ) : (
            <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
              {conversation?.listing?.title ?? t("chat.title")}
            </Text>
          )}
        </View>

        {/* Search toggle */}
        <Pressable
          onPress={searchVisible ? closeSearch : openSearch}
          hitSlop={8}
          style={styles.navAction}
          accessibilityLabel={t("chat.search.placeholder")}
        >
          <Search size={18} color={searchVisible ? colors.primary : colors.mutedForeground} />
        </Pressable>

        {/* Block / unblock */}
        {otherParticipant && (
          <Pressable
            onPress={handleBlockToggle}
            disabled={blockMutation.isPending || unblockMutation.isPending}
            hitSlop={8}
            style={styles.navAction}
            accessibilityLabel={isBlocked ? t("chat.block.unblockUser") : t("chat.block.blockUser")}
            // The report button beside this one has had a testID all along; this
            // one did not, so every flow that blocks from a thread failed on
            // "Element not found: Id matching regex: block-user-button" while the
            // feature worked perfectly. A testID, not the accessibilityLabel,
            // because that label is localized and flipped by isBlocked.
            testID="block-user-button"
          >
            <ShieldBan size={18} color={isBlocked ? colors.destructive : colors.mutedForeground} />
          </Pressable>
        )}

        {/* Report participant — only shown when there is another participant
            and it is not the current user (defensive guard against self-report) */}
        {otherParticipant && currentUser && Number(otherParticipant.id) !== Number(currentUser.id) && (
          <Pressable
            onPress={() => setReportSheetVisible(true)}
            hitSlop={8}
            style={styles.navAction}
            accessibilityLabel={t("chat.report.action")}
            testID="report-participant-button"
          >
            <Flag size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* ── Search bar (animated slide-down) ─────────────────────────────────── */}
      <Animated.View style={[searchBarAnimStyle, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.searchBar,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("chat.search.placeholder")}
            autoFocus={searchVisible}
            style={[styles.searchInput, { textAlign: isRtl ? "right" : "left" }] as any}
          />
          {/* Match count: "3 of 12" means 3 matching out of total loaded messages */}
          {searchQuery.trim() ? (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, minWidth: 52, textAlign: "center" }}>
              {t("chat.search.matchCount", {
                current: matchCount,
                total: messages.filter((m) => m.kind === "text").length,
              })}
            </Text>
          ) : null}
          {/* Clear / close */}
          <Pressable onPress={closeSearch} hitSlop={8} style={{ padding: 4 }}>
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {/* Hint when pagination means not all messages are loaded */}
        {totalPages > 1 && searchQuery.trim() ? (
          <Text style={{ fontSize: 11, color: colors.mutedForeground, paddingHorizontal: 12, paddingBottom: 4 }}>
            {t("chat.search.partialResults")}
          </Text>
        ) : null}
      </Animated.View>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {isLoading && <ChatSkeleton colors={colors} />}

      {/* ── Loaded content ───────────────────────────────────────────────── */}
      {!isLoading && <>

      {/* Listing-deleted notice — shown when the listing has been removed */}
      {conversation?.listingDeleted && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colors.muted,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center" }}>
            {t("chat.listingDeleted")}
          </Text>
        </View>
      )}

      {/* Pinned listing header — hidden when listing is deleted */}
      {conversation?.listing && !conversation.listingDeleted && (
        <ListingHeader
          listing={conversation.listing}
          onPress={() => router.push(`/(main)/listing/${conversation.listing!.id}` as never)}
          isOwner={isOwner}
          // Fix (found while wiring SF-M2): ListingHeader's own inline "Mark
          // sold" pill is gated on `isOwner && isLive && !!buyer` (SF-M2
          // §4.4.1 — there is nothing to confirm sold-to before the buyer is
          // known), but this prop was never passed here, so `buyer` defaulted
          // to `null` and the pill was unreachable for every seller — the
          // exact same "built the sheet, never wired the prop" bug this
          // ticket exists to close, one control over.
          buyer={conversation.buyer ?? null}
          // SF-M11 — the units this thread agreed on, so "Mark sold" opens on
          // that number instead of 1. Passed HERE deliberately: the two
          // previous times a control was added to this header it was built and
          // never wired (see the `buyer` note directly above), so this prop is
          // covered by a test that fails if it stops arriving.
          agreedQuantity={agreedOffer?.quantity ?? null}
          // Review fix (MUST-FIX, CACHE/DUPLICATION) — same shared helper the
          // reserve-after-accept confirm uses below, so a manual Reserve/Mark
          // Sold tap from THIS header also refreshes My Listings and the
          // status-count chips instead of just this conversation.
          onLifecycleDone={() => invalidateListingLifecycleQueries(currentConversationId)}
        />
      )}

      {/* TASK-C763: slim "agreed deal" banner directly under the pinned
          ListingHeader — the seller's second chance to reserve at the price
          this thread already agreed on, whether that came from the seller's
          own Accept (O947's one-shot prompt already fired, or was dismissed)
          or — the gap this task closes — the BUYER accepting the SELLER's
          counter-offer, which O947 never prompted for at all. */}
      {showAgreedDealBanner && agreedOffer && conversation?.buyer && (
        <AgreedDealBanner
          buyerName={conversation.buyer.name}
          buyerAvatarUrl={conversation.buyer.avatarUrl}
          buyerVerified={conversation.buyer.verified}
          amount={agreedOffer.amount}
          currency={resolveReserveCurrency(conversation.listing?.currency, agreedOffer.currency)}
          onReserve={handleOpenAgreedDealReserve}
        />
      )}

      {/* TASK-K729: buyer-facing "item reserved/sold" recovery notice — replaces
          the vanished composer offer control with an explicit reason plus a
          real next step (Browse similar / More from seller) instead of a
          silent dead end. Never shown to the listing's own seller. */}
      {showUnavailableNotice && conversation?.listing && (
        <ListingUnavailableNotice
          status={conversation.listing.status as "reserved" | "sold"}
          viewerIsSaleBuyer={conversation.listing.viewerIsSaleBuyer}
          category={conversation.listing.category}
          sellerId={conversation.seller?.id}
          sellerName={conversation.seller?.name}
          sellerAvatarUrl={conversation.seller?.avatarUrl}
          sellerVerified={conversation.seller?.verified}
          transactionId={conversation.listing.viewerSaleTransactionId}
          hasReviewedSale={conversation.listing.viewerHasReviewedSale}
          // TASK-K729 (review fix, MEDIUM — must fix): refresh the cached
          // conversation (so `viewerHasReviewedSale` flips and the "Rate
          // {seller}" CTA disappears) plus the Profile "Rate your recent
          // deals" nudge, mirroring the house pattern at
          // PendingReviewsNudge.tsx and the same refresh `onLifecycleDone`
          // already performs above.
          onReviewSubmitted={() => {
            if (currentConversationId) {
              qc.invalidateQueries({ queryKey: ["conversation", currentConversationId] });
            }
            qc.invalidateQueries({ queryKey: ["pending-reviews"] });
          }}
        />
      )}

      {/* Closed notice */}
      {isClosed && (
        <View style={[styles.closedBanner, { backgroundColor: colors.muted }]}>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center" }}>
            {t("chat.thread.closedNotice")}
          </Text>
        </View>
      )}

      {/* Blocked notice — same banner as the closed one. Neutral wording: the
          blocked flag is bidirectional and the app cannot tell who blocked whom,
          and saying so would disclose that someone blocked you. */}
      {isBlocked && !isClosed && (
        <View style={[styles.closedBanner, { backgroundColor: colors.muted }]}>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center" }}>
            {t("chat.block.messagingUnavailable")}
          </Text>
        </View>
      )}

      {/* Message list. No KeyboardAvoidingView on either platform — the bottom
          bar is absolutely anchored to the keyboard instead (see the block after
          this one), so nothing here has to react to the keyboard at all. */}
      <View style={{ flex: 1 }}>
        <FlatList
          // Lets a flow scroll THIS list rather than guessing at the screen.
          testID="messages-list"
          ref={flatListRef}
          data={threadRows}
          keyExtractor={threadRowKey}
          renderItem={({ item: row }) => {
            // TASK-D428: non-message rows (day separators, unread divider)
            // render DaySeparator and stop — all bubble logic below only
            // ever runs for `{ type: "message" }` rows.
            if (row.type === "day") return <DaySeparator variant="day" iso={row.iso} />;
            if (row.type === "unread") return <DaySeparator variant="unread" />;

            const item = row.message;

            // Outcome for THIS proposal only — matched by the response's link
            // (responds_to_id), so one response never affects another. Uses
            // the full `messages` array (not filtered/threadRows) so
            // accept/decline responses (which are filtered out of both) can
            // still be found.
            let meetupOutcome: "accepted" | "declined" | null = null;
            if (item.kind === "meetup_proposal") {
              const r = messages.find(
                (m) =>
                  (m.kind === "meetup_accepted" || m.kind === "meetup_declined") &&
                  m.respondsToId === item.id
              );
              if (r) meetupOutcome = r.kind === "meetup_accepted" ? "accepted" : "declined";
            }

            // Review fix (CR MUST): the offer/offer_counter outcome +
            // superseded lookups now come from `offerIndex` — ONE pass over
            // `messages` (memoized above), not three separate `.find()`/
            // `.some()` scans re-run for every row on every render. `flags`
            // is `undefined` for every other message kind.
            const offerFlags: OfferRowFlags | undefined = offerIndex.get(item.id);
            // `"countered"` (TASK-C381 review fix, DR MUST) tells MessageBubble
            // to render the muted "no longer active" chip instead of silently
            // showing nothing once this offer/counter is superseded.
            const offerOutcome: "accepted" | "declined" | "countered" | null =
              offerFlags?.outcome ?? (offerFlags?.isSuperseded ? "countered" : null);

            // Computed once so both the `isMine` prop and the onOfferCounter
            // guard below use the exact same value (TASK-C381).
            const itemIsMine = !!currentUser && Number(item.sender.id) === Number(currentUser.id);

            return (
              <MessageBubble
                message={item}
                isMine={itemIsMine}
                meetupOutcome={meetupOutcome}
                onMeetupRespond={
                  item.kind === "meetup_proposal"
                    ? (accepted) => handleMeetupRespond(item, accepted)
                    : undefined
                }
                // Review fix (LOW-MEDIUM, DUPLICATION + A11Y GAP) — mirrors
                // offerActionsDisabled/offerResponsePending below: disables +
                // dims every meetup proposal in the thread while ANY meetup
                // response is in flight, and shows a spinner only on the
                // specific bubble that was actually tapped.
                meetupActionsDisabled={isRespondingToMeetup}
                meetupResponsePending={
                  respondingMeetupTarget?.messageId === item.id
                    ? respondingMeetupTarget.accepted
                      ? "accept"
                      : "decline"
                    : null
                }
                offerOutcome={offerOutcome}
                onOfferRespond={
                  // The recipient of an offer/counter can respond as long as
                  // it is still the live, un-superseded one — identical rule
                  // for both kinds now (see `canRespondToOffer`/`offerGuards.ts`).
                  canRespondToOffer(offerFlags)
                    ? (accepted) => handleOfferRespond(item, accepted)
                    : undefined
                }
                onOfferCounter={
                  // TASK-C381: the recipient (not the sender) of a live,
                  // un-superseded offer/counter can tap "Counter" to reopen
                  // the sheet — works from either side, so a negotiation can
                  // run more than one round. Only ever true for offer/
                  // offer_counter kinds — `offerFlags` is `undefined` for
                  // every other kind, and `canCounterBack` returns `false`
                  // for an `undefined` `flags`.
                  canCounterBack({ isMine: itemIsMine, flags: offerFlags })
                    ? () => handleOpenCounterSheet(item)
                    : undefined
                }
                // TASK-O947: disable Accept/Decline while a response for ANY
                // offer/counter is already in flight — prevents a fast
                // double-tap from firing two responses (and, on Accept,
                // triggering the reserve-after-accept prompt twice).
                offerActionsDisabled={isRespondingToOffer}
                // Review fix (MEDIUM/STATES) — only THIS bubble's actually-
                // tapped action shows the spinner; every other offer bubble
                // in the thread stays merely dimmed (offerActionsDisabled).
                offerResponsePending={
                  respondingOfferTarget?.messageId === item.id
                    ? respondingOfferTarget.accepted
                      ? "accept"
                      : "decline"
                    : null
                }
                searchQuery={searchVisible ? searchQuery.trim() : undefined}
                onDeleteMessage={
                  // Only the author of a non-deleted text-like message can delete it.
                  // Offer / meetup / system messages are excluded — only text+image+document.
                  !!currentUser &&
                  Number(item.sender.id) === Number(currentUser.id) &&
                  !item.deleted &&
                  (item.kind === "text" || item.kind === "image_message" || item.kind === "document")
                    ? () => handleDeleteMessage(item)
                    : undefined
                }
              />
            );
          }}
          // styles.messageList plus clearance for the absolutely-positioned bottom
          // bar AND the keyboard beneath it, so the newest message is never covered.
          contentContainerStyle={[styles.messageList, { paddingBottom: bottomBarH + barLift }]}
          // maintainVisibleContentPosition ONLY while prepending older messages.
          //
          // Its whole purpose is pagination: when a page of older messages is
          // spliced in ABOVE the current view, this keeps what you were reading
          // where it was. Left on permanently it does the opposite of what this
          // thread needs — it anchors item 0 and actively resists every
          // scroll-to-bottom. On iOS especially, where this maps to a native
          // UIScrollView feature that adjusts contentOffset on any content change,
          // it is a strong candidate for the owner's report that the thread would
          // not follow its own newest message on TestFlight 1.0.4. The Android
          // verification could not have caught it — the two platforms implement
          // this prop differently.
          //
          // Still off during search, so a filtered list does not jump as the query
          // changes.
          maintainVisibleContentPosition={
            isLoadingMore && !searchVisible ? { minIndexForVisible: 0 } : undefined
          }
          // iOS: keep OUR padding math authoritative.
          //
          // With the default "automatic" behaviour UIKit adds its own safe-area
          // content insets on top of the contentContainer padding computed from the
          // measured bar height. scrollToEnd then lands SHORT by roughly the
          // home-indicator inset, leaving the newest bubble just under the composer
          // — the reported symptom, and exactly the kind of thing that shows on an
          // iPhone but not on the Android emulator this was verified on. Both props
          // are no-ops on Android.
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          scrollEventThrottle={200}
          onScroll={handleScroll}
          // Scroll to the true bottom AFTER the list re-measures (new bubble
          // rendered), but only when the user was already at the bottom and search
          // is not active (search may show older messages we don't want to jump past).
          onContentSizeChange={() => {
            // Re-arm through the helper. A single animated scrollToEnd here was
            // the half-scroll bug: every late measure that changes content size
            // now gets the full retry chain, ending on an exact, unanimated
            // landing at the true bottom.
            if (isNearBottomRef.current && !searchVisible) {
              scrollThreadToEnd();
            }
          }}
          ListHeaderComponent={
            // Always rendered, so the top of the thread has a stable anchor to
            // scroll to; it collapses to zero height when nothing is loading, so
            // it adds no space above the first message. Previously this returned
            // null unless a page was in flight, which left the only "top of
            // thread" handle existing exactly while it was too late to aim at.
            <View
              testID="messages-list-top"
              // height 1, not 0, when idle. A zero-size view is not VISIBLE to the
              // accessibility tree, so Maestro could not find this anchor at all —
              // "No visible element found: id: messages-list-top" — even though it
              // was mounted. One pixel is imperceptible above the first bubble and
              // makes the node real.
              style={{
                paddingVertical: isLoadingMore ? 14 : 0,
                height: isLoadingMore ? undefined : 1,
                alignItems: "center",
              }}
            >
              {isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 16, fontWeight: "600", textAlign: "center" }}>
                {searchVisible && searchQuery.trim()
                  ? t("chat.search.noResults")
                  : t("chat.thread.emptyTitle")}
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 4 }}>
                {searchVisible && searchQuery.trim()
                  ? ""
                  : t("chat.thread.emptyDescription")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* THE BOTTOM BAR — absolutely anchored to the keyboard top.

          Measured on device (Expo SDK 54 / Android): with the keyboard open the
          root view stays top=0 height=932 — edge-to-edge, the window is NOT
          resized — and the keyboard reports 345. Yet laid out in the flex column
          this bar's bottom landed at 499 instead of 587: 88px short, with nothing
          in the tree to account for it. The bar was flush with its container
          (measured gapBelowComposer=0) and every sibling below it is a <Modal>,
          which takes no layout space.

          So it no longer depends on the flex chain: it is positioned against the
          ROOT, whose bounds are known and stable, with its bottom edge exactly at
          the keyboard top. That is arithmetic an intermediate view cannot eat, and
          it needs no KeyboardAvoidingView on either platform. The list is padded
          by this bar's measured height so the newest message is never hidden. */}
      <View
        onLayout={(e) => setBottomBarH(e.nativeEvent.layout.height)}
        style={{ position: "absolute", left: 0, right: 0, bottom: barLift }}
      >
        {/* Input bar */}
        {isStartMode ? (
          // Start-conversation input
          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: keyboardSafeBottom(keyboardVisible, insets.bottom, 8, 12) },
            ]}
          >
            <Input
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t("chat.startConversation.placeholder")}
              // Mirrors hatiwal-api's Message validation
              // (`length: { maximum: 1000 }`). Without it a longer message could
              // only fail at send time as a 422 — the user typed it all, then
              // lost the send for a reason nothing on screen had warned about.
              maxLength={MESSAGE_MAX_LENGTH}
              multiline
              style={[styles.textInput, { textAlign: isRtl ? "right" : "left" }] as any}
              editable={!isStarting}
            />
            <Button
              size="icon"
              onPress={handleStartConversation}
              disabled={!messageText.trim() || isStarting}
              style={{ marginLeft: 8 }}
            >
              {isStarting ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Send
                  size={20}
                  color={colors.primaryForeground}
                  style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}
                />
              )}
            </Button>
          </View>
        ) : canSend ? (
          // Normal send input with meetup button and quick-reply chips
          <>
            {/* Quick-reply chip row — above the composer, hidden when closed */}
            <QuickReplies
              role={isOwner ? "seller" : "buyer"}
              onSelect={handleQuickReplySelect}
            />
          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: keyboardSafeBottom(keyboardVisible, insets.bottom, 8, 12) },
            ]}
          >
            {/* TASK-K487: single "+" bottom sheet replaces the four icons
                (Calendar/Paperclip/ImageIcon/Tag) that used to crowd this row —
                see ComposerActionsSheet below. */}
            <Pressable
              onPress={() => setActionsSheetVisible(true)}
              style={styles.plusButton}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t("chat.composer.moreActions")}
              testID="composer-plus-button"
            >
              <Plus size={22} color={colors.primary} />
            </Pressable>
            <Input
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t("chat.messagePlaceholder")}
              // Mirrors hatiwal-api's Message validation
              // (`length: { maximum: 1000 }`). Without it a longer message could
              // only fail at send time as a 422 — the user typed it all, then
              // lost the send for a reason nothing on screen had warned about.
              maxLength={MESSAGE_MAX_LENGTH}
              multiline
              style={[styles.textInput, { textAlign: isRtl ? "right" : "left" }] as any}
              editable={!isSending}
            />
            <Button
              size="icon"
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
              style={{ marginLeft: 8 }}
              accessibilityLabel={t("chat.send")}
            >
              {isSending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Send
                  size={20}
                  color={colors.primaryForeground}
                  style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}
                />
              )}
            </Button>
          </View>
          </>
        ) : (
          // Closed notice in input area
          <View
            style={[
              styles.closedInput,
              { borderTopColor: colors.border, backgroundColor: colors.muted, paddingBottom: keyboardSafeBottom(keyboardVisible, insets.bottom, 12, 12) },
            ]}
          >
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center" }}>
              {t("chat.thread.closedInput")}
            </Text>
          </View>
        )}
      </View>

      {/* TASK-K487: the composer's single "+" actions sheet — Photo / File /
          Propose meetup / Make an offer (offer row gated by canOfferInThread,
          exactly like the Tag button it replaces). Only reachable via the "+"
          button, which only renders in the canSend branch above, so this
          never opens in isStartMode or on a closed conversation.

          SF-M2: `placeHoldRow`/`releaseHoldRow` are seller-only and mutually
          exclusive by construction — `canPlaceHold`/`hasOpenHold` above never
          agree on both at once (see ComposerActionsSheet's own prop docs for
          why that invariant matters). */}
      <ComposerActionsSheet
        visible={actionsSheetVisible}
        onClose={() => setActionsSheetVisible(false)}
        onPhoto={handlePhotoAttachment}
        onFile={handleAttachment}
        onProposeMeetup={() => setMeetupSheetVisible(true)}
        onMakeOffer={() => setThreadOfferSheetVisible(true)}
        canMakeOffer={canOfferInThread}
        offerUnavailableReason={offerUnavailableReason}
        placeHoldRow={
          canPlaceHold && conversation?.buyer
            ? { buyerName: conversation.buyer.name, onPress: handlePlaceHold }
            : null
        }
        releaseHoldRow={
          isOwner && hasOpenHold && conversation?.listing
            ? { onPress: handleReleaseHold }
            : null
        }
        disabled={isSendingPhoto || isSendingFile}
      />

      {/* Meetup proposal sheet */}
      <MeetupSheet
        visible={meetupSheetVisible}
        onClose={() => setMeetupSheetVisible(false)}
        onPropose={handleProposeMeetup}
        onOpenSafetyTips={() => {
          // Hide the meetup modal (place/time fields are preserved — the
          // component stays mounted, only its `visible` prop toggles) and
          // show the safety-tips sheet on top; closing it restores this one.
          setMeetupSheetVisible(false);
          setSafetyTipsVisible(true);
        }}
      />

      {/* Meetup safety tips sheet — single hoisted instance (see state comment
          above). Reopens the meetup sheet on close so the in-progress place/time
          the user was entering is never lost. */}
      <SafetyTipsSheet
        visible={safetyTipsVisible}
        onClose={() => {
          setSafetyTipsVisible(false);
          setMeetupSheetVisible(true);
        }}
      />

      {/* TASK-C381: make/counter an offer without leaving the thread — reuses
          the existing OfferSheet (with its TASK-G083 quick-amount chips),
          fed the pinned listing's price/currency. */}
      {canOfferInThread && conversation?.listing && (
        <OfferSheet
          visible={threadOfferSheetVisible}
          onClose={() => {
            setThreadOfferSheetVisible(false);
            setThreadOfferAmount("");
            setThreadOfferQuantity("");
          }}
          onSend={handleSendOfferInThread}
          offerAmount={threadOfferAmount}
          onChangeAmount={setThreadOfferAmount}
          quantity={threadOfferQuantity}
          onChangeQuantity={setThreadOfferQuantity}
          availableUnits={conversation.listing.availableUnits}
          currency={conversation.listing.currency ?? "AFN"}
          price={conversation.listing.price ?? 0}
          // The offer anchor is per-unit on a batch listing, same as on the
          // listing detail. SF-M11 also makes this the flag that reveals the
          // quantity field — so the offer now carries how many units it is
          // for, which is what the old version of this comment said it could
          // not do.
          perUnit={conversation.listing.multiUnit === true}
          isBusy={isSendingThreadOffer}
          // Review fix (DR): role-neutral safety note — this button is
          // usable by either participant, unlike ListingDetail's buyer-only
          // "Make an Offer" CTA. See OfferSheet.tsx's `inThread` doc comment.
          inThread
        />
      )}

      {/* Counter-offer sheet — either participant responds to an offer/counter
          with a new price. TASK-C381 (review fix, DR): folded into the SAME
          `OfferSheet` component via `mode="counter"` — the former standalone
          `CounterOfferSheet` was a near-duplicate of it (see OfferSheet.tsx's
          header comment). `price` here is the amount being responded to
          (the "Previous offer" reference line), not the listing's price. */}
      <OfferSheet
        mode="counter"
        visible={counterSheetVisible}
        onClose={() => {
          setCounterSheetVisible(false);
          setCounterOfferTarget(null);
          setCounterOfferAmount("");
          setCounterOfferQuantity("");
        }}
        onSend={handleSendCounter}
        offerAmount={counterOfferAmount}
        onChangeAmount={setCounterOfferAmount}
        quantity={counterOfferQuantity}
        onChangeQuantity={setCounterOfferQuantity}
        availableUnits={conversation?.listing?.availableUnits}
        // SF-M11 — a counter on a batch listing gets the quantity field too
        // (the API permits `offer_quantity` on `offer_counter` for this
        // reason). Without it, a seller countering "3 for 40,000" could only
        // restate the price and the units would silently fall back to one.
        perUnit={conversation?.listing?.multiUnit === true}
        currency={
          counterOfferTarget?.offerCurrency ??
          counterOfferTarget?.body?.split("|")[1] ??
          "AFN"
        }
        price={
          counterOfferTarget?.offerAmount ??
          Number(counterOfferTarget?.body?.split("|")[0] ?? 0)
        }
        isBusy={isSendingCounter}
      />

      {/* Report participant sheet — surfaces the existing ReportSheet pre-targeted
          at the other participant. Only renders when we have a valid participant id
          that is not the current user (the guard is also on the trigger button). */}
      {otherParticipant && currentUser && Number(otherParticipant.id) !== Number(currentUser.id) && (
        <ReportSheet
          visible={reportSheetVisible}
          onClose={() => setReportSheetVisible(false)}
          reportableType="User"
          reportableId={otherParticipant.id}
          onBlocked={() => {
            // Sync local block state so the ShieldBan icon reflects reality
            // immediately without a full conversation reload.
            setIsBlocked(true);
          }}
        />
      )}

      {/* TASK-O947: one-tap reserve confirm after a successful offer accept —
          the SAME shared BuyerPickerSheet used by ListingHeader/MyListingDetail/
          SellerListingCard, but in its "preselectedBuyer" confirm mode
          (cycle-4 design review): listing thumb + locked buyer identity +
          PriceTag, never the full pick-a-buyer list. "Not now" is just
          `onClose` — it never reserves and never touches the accept above.
          Review fix (SHOULD-FIX, content flash) — the sheet is only ever
          MOUNTED while `reserveConfirm` is non-null (not just `visible`).
          `animationType="slide"` keeps a Modal's children mounted through
          the ~250–300ms exit animation; driving `visible` off `reserveConfirm
          !== null` while ALSO clearing `reserveConfirm` in the same commit
          (every dismissal path: Not now, backdrop, header X, back button,
          and the success path in handleReserveAfterAcceptConfirm) made the
          sheet re-render as the full pick-a-buyer view — the exact list this
          task exists to eliminate — for that whole exit window. Unmounting
          instantly avoids it; the slide-out is invisible either way once
          `visible` is already false. */}
      {reserveConfirm !== null && (
        <BuyerPickerSheet
          visible
          onClose={() => setReserveConfirm(null)}
          listingId={reserveConfirm.listingId}
          price={reserveConfirm.finalPrice}
          currency={reserveConfirm.currency}
          action="reserve"
          // Design review fix (SF-M2/§4.4's own spec — "with the quantity
          // stepper when multiUnit"): this prop was never threaded through,
          // so `asksQuantity` (`(remainingQuantity ?? 1) > 1`) could never be
          // true here — a seller could never hold more than 1 unit for a
          // buyer from EITHER chat trigger (the auto-prompt after accepting
          // an offer, or the manual "Place a hold" row), on a multi-unit
          // listing, from chat, ever. `conversation.listing.availableUnits`
          // is the same field `ListingHeader`'s OWN BuyerPickerSheet already
          // reads for the mark-sold case — reused here for the reserve case.
          remainingQuantity={conversation?.listing?.availableUnits ?? 1}
          preselectedBuyer={reserveConfirm.buyer}
          listingThumbnailUrl={conversation?.listing?.thumbnailUrl ?? null}
          listingTitle={conversation?.listing?.title ?? null}
          confirmTitle={reserveConfirm.title}
          confirmBody={reserveConfirm.body}
          cancelLabel={t("chat.offer.reserveAfterAcceptDismiss")}
          errorMessage={reserveConfirmError}
          onConfirm={(result) => {
            void handleReserveAfterAcceptConfirm(result.quantity);
          }}
          isSubmitting={isReservingAfterAccept}
        />
      )}
      </>}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    alignItems:        "center",
    paddingHorizontal: 12,
    paddingBottom:     8,
    borderBottomWidth: 1,
    gap:               8,
  },
  navCenter: {
    flex:        1,
    alignItems:  "center",
    gap:         6,
  },
  navTitle: {
    fontSize:   16,
    fontWeight: "600",
    flex:       1,
  },
  navAction: {
    padding: 4,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  closedBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 4,
  },
  textInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
  },
  // TASK-K487: the composer's single "+" trigger — DESIGN_SYSTEM §3 44pt
  // minimum touch target (replaces the old 4pt-padded meetupButton icons).
  plusButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closedInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    // 44px min tap target (DESIGN_SYSTEM §3); stays visually compact via padding.
    height: 44,
    minHeight: 44,
  },
});
