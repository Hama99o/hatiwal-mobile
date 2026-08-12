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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
} from "react-native";
import { confirmAlert } from "@/utils/alert";
import { showPermissionDeniedAlert, showLimitedPhotoAccessAlert } from "@/lib/permissions";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Plus, ShieldBan, Search, X, Flag } from "lucide-react-native";
import { toast } from "sonner-native";

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
import { ListingUnavailableNotice } from "./conversation/ListingUnavailableNotice";
import { MessageBubble } from "./conversation/MessageBubble";
import { DaySeparator } from "./conversation/DaySeparator";
import { buildThreadRows, threadRowKey, type ThreadRow } from "./conversation/groupMessagesByDay";
import { MeetupSheet } from "./conversation/MeetupSheet";
import { ComposerActionsSheet } from "./conversation/ComposerActionsSheet";
import { CounterOfferSheet } from "./conversation/CounterOfferSheet";
import { OfferSheet } from "@/screens/shared/listing-detail/OfferSheet";
import { ReportSheet } from "@/components/common/ReportSheet";
import { SafetyTipsSheet } from "@/components/common/SafetyTipsSheet";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useConversationCable } from "@/hooks/useConversationCable";
import { QuickReplies } from "@/components/common/QuickReplies";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { encodeMeetupBody, type MeetupCoords } from "./conversation/meetupBody";
import {
  buildReserveAfterAcceptPrompt,
  reserveAfterAccept,
  resolveReserveCurrency,
  type ReserveAfterAcceptPrompt,
} from "./conversation/reserveAfterAccept";
import { BuyerPickerSheet } from "@/components/common/BuyerPickerSheet";
import {
  canOfferInThread as canOfferInThreadPure,
  showUnavailableNotice as showUnavailableNoticePure,
  offerUnavailableStatus,
} from "./conversation/threadAvailability";

// ── Reanimated imports for search bar animation ───────────────────────────────
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from "react-native-reanimated";
import { usePulse, useReduceMotion } from "@/lib/animation";

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
  // TASK-O947 (cycle-4 design review): the one-tap reserve confirm shown
  // after a successful offer accept — the shared BuyerPickerSheet in its
  // "preselectedBuyer" confirm mode, never the full pick-a-buyer flow. `null`
  // means the sheet is closed; a non-null prompt (built by
  // `buildReserveAfterAcceptPrompt`) drives both its visibility and content.
  const [reserveConfirm, setReserveConfirm] = useState<ReserveAfterAcceptPrompt | null>(null);
  const [isReservingAfterAccept, setIsReservingAfterAccept] = useState(false);

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
  // The original offer message the counter is responding to
  const [counterOfferTarget, setCounterOfferTarget] = useState<Message | null>(null);
  const [isSendingCounter, setIsSendingCounter] = useState(false);

  // ── TASK-C381: make/counter an offer without leaving the thread ──────────
  // Reuses the existing OfferSheet (with its TASK-G083 quick-amount chips) —
  // the composer's "+" actions sheet (TASK-K487) opens it, prefilled from the
  // pinned listing.
  const [threadOfferSheetVisible, setThreadOfferSheetVisible] = useState(false);
  const [threadOfferAmount, setThreadOfferAmount] = useState("");
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
  // TASK-D428: the "unread messages" divider boundary, captured ONCE from the
  // first load's conversation.unreadCount — BEFORE markRead fires and zeroes
  // it server-side. `null` means "not captured yet"; once set it is never
  // overwritten, so silent refreshes of the same open thread (e.g. refocus
  // without unmounting) never make the divider reappear or move.
  const capturedUnreadCountRef = useRef<number | null>(null);

  // TASK-D428: day separators + a single "unread messages" divider, built
  // from `filteredMessages` so an active chat search recomputes day rows
  // from the filtered set — and the unread divider is suppressed entirely
  // while searching (search results are not a timeline). Outcome lookups
  // in renderItem below intentionally keep using the full `messages` array,
  // never `threadRows` / `filteredMessages`.
  const threadRows: ThreadRow[] = buildThreadRows(
    filteredMessages,
    searchVisible ? 0 : capturedUnreadCountRef.current ?? 0,
    currentUser?.id ?? null
  );

  const PAGE_SIZE = 30;

  // ── Load conversation + messages (page 1 = newest, backend returns DESC) ─
  // Returns the fetched Conversation (or null on failure) so callers that
  // need the pre-read state — namely the unread-divider capture below — can
  // read it before markRead runs.
  const load = useCallback(async (convId: number): Promise<Conversation | null> => {
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
      setMessages([...items].reverse());
      setPage(1);
      setTotalPages(pagination.totalPages);
      isNearBottomRef.current = true;
      // Snap to bottom on initial load with delay to ensure layout is ready
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }, 100);
      return conv;
    } catch {
      toast.error(t("chat.thread.loadFailed"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // ── TASK-O947 review fix (MUST-FIX, CACHE/DUPLICATION) ────────────────────
  // The single source of truth for "a listing lifecycle mutation just
  // succeeded from inside this screen" — invalidates every query surface that
  // needs to reflect the new status (this conversation, the listing detail,
  // the seller's My Listings feed + status-count chips) and reloads the local
  // conversation state so the pinned ListingHeader flips without a manual
  // refresh. Previously this exact five-key block lived ONLY inside
  // `handleReserveAfterAcceptConfirm`'s `onReserved`, while the pinned
  // ListingHeader's own `onLifecycleDone` (its manual "Reserve"/"Mark sold"
  // button) invalidated just `["conversation", id]` — so reserving via that
  // button left My Listings and the status-count chips stale until the
  // seller manually pulled to refresh. Both paths now call this one function.
  const invalidateListingLifecycleQueries = useCallback(
    (convId: number | null) => {
      if (convId) qc.invalidateQueries({ queryKey: ["conversation", convId] });
      // Bare (id-less) keys — deliberately broader than an exact
      // ["listing", id] match. ListingDetail.tsx and MyListingDetail.tsx key
      // their detail queries by the STRING route param while this handler
      // only has the numeric listingId; invalidating the whole
      // "listing"/"my-listing" namespace (React Query's default partial
      // match) refreshes both regardless of the id's type instead of
      // silently missing due to a string/number key mismatch.
      qc.invalidateQueries({ queryKey: ["listing"] });
      qc.invalidateQueries({ queryKey: ["my-listing"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["myListingStatusCounts"] });
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
      // Track whether user is near the bottom (latest messages)
      isNearBottomRef.current =
        contentSize.height - layoutMeasurement.height - contentOffset.y < 120;
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
  const markRead = useCallback(async (convId: number) => {
    try {
      await conversationsAPI.markMessagesRead(convId);
    } catch {
      // silent — non-critical
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (currentConversationId) {
        // TASK-D428: load MUST resolve before markRead fires — markRead
        // zeroes unread server-side, so calling it first (or in parallel,
        // as before) would race the unread-divider capture below.
        (async () => {
          const conv = await load(currentConversationId);
          if (capturedUnreadCountRef.current === null) {
            capturedUnreadCountRef.current = conv?.unreadCount ?? 0;
          }
          markRead(currentConversationId);
        })();
      } else {
        // Start-flow: no existing conversation yet
        setIsLoading(false);
      }
    }, [currentConversationId, load, markRead])
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
    isNearBottomRef.current = true;
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
      const amount = Number(inputAmount);
      if (!amount || amount <= 0) {
        toast.error(t("listing.detail.offerInvalid"));
        return;
      }
      const currency = conversation?.listing?.currency ?? "AFN";
      const listedPrice = conversation?.listing?.price ?? 0;
      const body = `${amount}|${currency}|${listedPrice}`;

      // Close the sheet immediately — mirrors handleSend clearing the
      // composer before the request resolves.
      setThreadOfferSheetVisible(false);
      setThreadOfferAmount("");
      setIsSendingThreadOffer(true);

      // Optimistic append — same pattern as handleSend / handleProposeMeetup.
      const optimistic: Message = {
        id: -Date.now(),
        body,
        kind: "offer",
        readAt: null,
        createdAt: new Date().toISOString(),
        sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
      };
      isNearBottomRef.current = true;
      setMessages((prev) => [...prev, optimistic]);

      try {
        const sent = await conversationsAPI.sendMessage(convId, body, "offer");
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
      } catch {
        // Rollback — remove the optimistic bubble; the buyer/seller can
        // retry from the composer's offer button again.
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(t("chat.thread.sendFailed"));
      } finally {
        setIsSendingThreadOffer(false);
      }
    },
    [currentConversationId, conversation, currentUser, t]
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
      isNearBottomRef.current = true;
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
      if (!convId || !proposal.body) return;
      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          proposal.body,
          accepted ? "meetup_accepted" : "meetup_declined",
          proposal.id
        );
        isNearBottomRef.current = true;
        setMessages((prev) => [...prev, sent]);
        toast.success(accepted ? t("chat.meetup.acceptedToast") : t("chat.meetup.declinedToast"));
      } catch {
        toast.error(t("chat.thread.meetupFailed"));
      }
    },
    [currentConversationId, t]
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
        isNearBottomRef.current = true;
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
          if (prompt) setReserveConfirm(prompt);
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
  const handleReserveAfterAcceptConfirm = useCallback(async () => {
    if (!reserveConfirm) return;
    const convId = currentConversationId;
    setIsReservingAfterAccept(true);
    const succeeded = await reserveAfterAccept(reserveConfirm, {
      t,
      onReserved: () => invalidateListingLifecycleQueries(convId),
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

  // ── Open counter-offer sheet (seller) ────────────────────────────────────
  const handleOpenCounterSheet = useCallback((offer: Message) => {
    if (!offer.body) return;
    setCounterOfferTarget(offer);
    // Pre-fill with the buyer's offer amount so the seller can edit from there
    const parts = offer.body.split("|");
    const buyerAmount = offer.offerAmount ?? Number(parts[0] ?? 0);
    setCounterOfferAmount(String(buyerAmount > 0 ? buyerAmount : ""));
    setCounterSheetVisible(true);
  }, []);

  // ── Send a counter-offer (seller) ─────────────────────────────────────────
  const handleSendCounter = useCallback(
    async (amountStr: string) => {
      const convId = currentConversationId;
      if (!convId || !counterOfferTarget?.body || !amountStr.trim()) return;
      setIsSendingCounter(true);

      const parts = counterOfferTarget.body.split("|");
      const currency = counterOfferTarget.offerCurrency ?? parts[1] ?? "AFN";
      const listedPrice = parts[2] ?? "0";
      const body = `${amountStr.trim()}|${currency}|${listedPrice}`;

      try {
        const sent = await conversationsAPI.sendMessage(
          convId,
          body,
          "offer_counter",
          counterOfferTarget.id
        );
        isNearBottomRef.current = true;
        setMessages((prev) => [...prev, sent]);
        setCounterSheetVisible(false);
        setCounterOfferTarget(null);
        setCounterOfferAmount("");
        toast.success(t("chat.offer.counterSentToast"));
      } catch {
        toast.error(t("chat.thread.sendFailed"));
      } finally {
        setIsSendingCounter(false);
      }
    },
    [currentConversationId, counterOfferTarget, t]
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
      isNearBottomRef.current = true;
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
      isNearBottomRef.current = true;
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
  const canSend = !isClosed && !!currentConversationId;
  const isStartMode = !currentConversationId && !!listingId;

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>

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
          // Review fix (MUST-FIX, CACHE/DUPLICATION) — same shared helper the
          // reserve-after-accept confirm uses below, so a manual Reserve/Mark
          // Sold tap from THIS header also refreshes My Listings and the
          // status-count chips instead of just this conversation.
          onLifecycleDone={() => invalidateListingLifecycleQueries(currentConversationId)}
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

      {/* Message list */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Platform audit (2026-06-18):
        //   iOS "padding" — adds padding at the bottom so the input bar lifts with
        //   the keyboard. Correct on all iOS versions.
        //   Android "height" — shrinks the KAV container height so the FlatList +
        //   input bar layout recalculates above the keyboard. Correct on all Android
        //   versions. Intentional: both branches have correct, tested fallbacks.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={88}
      >
        <FlatList
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

            // Outcome for THIS proposal/offer only — matched by the response's
            // link (responds_to_id), so one response never affects another.
            // Use the full messages array (not filtered) for outcome lookups so
            // accept/decline responses (which are filtered out) can still be found.
            let meetupOutcome: "accepted" | "declined" | null = null;
            let offerOutcome: "accepted" | "declined" | null = null;
            if (item.kind === "meetup_proposal") {
              const r = messages.find(
                (m) =>
                  (m.kind === "meetup_accepted" || m.kind === "meetup_declined") &&
                  m.respondsToId === item.id
              );
              if (r) meetupOutcome = r.kind === "meetup_accepted" ? "accepted" : "declined";
            } else if (item.kind === "offer") {
              // Check if a counter was sent in response to this offer; if so the
              // offer itself is "countered" — we do NOT show an outcome badge on
              // the offer (the counter card shows its own outcome). Only show the
              // direct accept/decline outcome if it points straight at this offer.
              const directResponse = messages.find(
                (m) =>
                  (m.kind === "offer_accepted" || m.kind === "offer_declined") &&
                  m.respondsToId === item.id
              );
              const hasCounter = messages.some(
                (m) => m.kind === "offer_counter" && m.respondsToId === item.id
              );
              if (directResponse) {
                offerOutcome = directResponse.kind === "offer_accepted" ? "accepted" : "declined";
              } else if (hasCounter) {
                // Offer has been countered — show "countered" state so the original
                // offer card no longer shows action buttons (the counter card does).
                offerOutcome = null; // null = no outcome badge; action buttons suppressed below
              }
            } else if (item.kind === "offer_counter") {
              const r = messages.find(
                (m) =>
                  (m.kind === "offer_accepted" || m.kind === "offer_declined") &&
                  m.respondsToId === item.id
              );
              if (r) offerOutcome = r.kind === "offer_accepted" ? "accepted" : "declined";
            }

            // Determine whether this offer has been countered (suppress action buttons)
            const isOfferCountered =
              item.kind === "offer" &&
              messages.some((m) => m.kind === "offer_counter" && m.respondsToId === item.id);

            // TASK-C381 review fix: a counter can itself be superseded by a
            // FURTHER counter-back (the whole point of allowing more than one
            // round). Mirrors `isOfferCountered` above for the original offer —
            // without this, after the recipient counters C1 with C2, C1 kept
            // showing Accept/Decline/Counter to them (it never got an
            // offer_accepted/offer_declined response, only a further counter),
            // letting them accept/decline/re-counter an already-superseded
            // counter and desync the negotiation from what was actually sent.
            const isCounterSuperseded =
              item.kind === "offer_counter" &&
              messages.some((m) => m.kind === "offer_counter" && m.respondsToId === item.id);

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
                offerOutcome={offerOutcome}
                onOfferRespond={
                  // Offer: the recipient can respond (not mine, not already countered)
                  (item.kind === "offer" && !isOfferCountered)
                    ? (accepted) => handleOfferRespond(item, accepted)
                    // Counter: the recipient can respond (not mine, not superseded
                    // by a further counter-back — TASK-C381 review fix).
                    : item.kind === "offer_counter" && !isCounterSuperseded
                    ? (accepted) => handleOfferRespond(item, accepted)
                    : undefined
                }
                onOfferCounter={
                  // Offer: TASK-C381 review fix — counter button is for
                  // whoever DIDN'T send this offer (not mine), not just the
                  // seller. A fresh "offer" can now come from either side (a
                  // seller opening one is a proactive discount, per this
                  // card's composer button), so the recipient — buyer or
                  // seller — must be able to counter it back, exactly like
                  // they can already Accept/Decline it via onOfferRespond
                  // above (which was never seller-only).
                  item.kind === "offer" && !isOfferCountered && !itemIsMine
                    ? () => handleOpenCounterSheet(item)
                    // Counter: TASK-C381 — the recipient of a counter (not
                    // mine) can counter back, as long as it hasn't been
                    // accepted/declined yet AND hasn't itself already been
                    // superseded by a further counter (isCounterSuperseded,
                    // review fix). Symmetric guard: works from either side,
                    // so a negotiation can run more than one round.
                    : item.kind === "offer_counter" && !itemIsMine && !offerOutcome && !isCounterSuperseded
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
          contentContainerStyle={styles.messageList}
          // Disable maintainVisibleContentPosition during search so the filtered
          // list doesn't jump when the query changes
          maintainVisibleContentPosition={searchVisible ? undefined : { minIndexForVisible: 0 }}
          scrollEventThrottle={200}
          onScroll={handleScroll}
          // Scroll to the true bottom AFTER the list re-measures (new bubble
          // rendered), but only when the user was already at the bottom and search
          // is not active (search may show older messages we don't want to jump past).
          onContentSizeChange={() => {
            if (isNearBottomRef.current && !searchVisible) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          ListHeaderComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 14, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
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

        {/* Input bar */}
        {isStartMode ? (
          // Start-conversation input
          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 8) + 12 },
            ]}
          >
            <Input
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t("chat.startConversation.placeholder")}
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
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 8) + 12 },
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
              { borderTopColor: colors.border, backgroundColor: colors.muted, paddingBottom: Math.max(insets.bottom, 12) + 12 },
            ]}
          >
            <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center" }}>
              {t("chat.thread.closedInput")}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* TASK-K487: the composer's single "+" actions sheet — Photo / File /
          Propose meetup / Make an offer (offer row gated by canOfferInThread,
          exactly like the Tag button it replaces). Only reachable via the "+"
          button, which only renders in the canSend branch above, so this
          never opens in isStartMode or on a closed conversation. */}
      <ComposerActionsSheet
        visible={actionsSheetVisible}
        onClose={() => setActionsSheetVisible(false)}
        onPhoto={handlePhotoAttachment}
        onFile={handleAttachment}
        onProposeMeetup={() => setMeetupSheetVisible(true)}
        onMakeOffer={() => setThreadOfferSheetVisible(true)}
        canMakeOffer={canOfferInThread}
        offerUnavailableReason={offerUnavailableReason}
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
          }}
          onSend={handleSendOfferInThread}
          offerAmount={threadOfferAmount}
          onChangeAmount={setThreadOfferAmount}
          currency={conversation.listing.currency ?? "AFN"}
          price={conversation.listing.price ?? 0}
          isBusy={isSendingThreadOffer}
        />
      )}

      {/* Counter-offer sheet — seller responds to buyer's offer with new price */}
      <CounterOfferSheet
        visible={counterSheetVisible}
        onClose={() => {
          setCounterSheetVisible(false);
          setCounterOfferTarget(null);
          setCounterOfferAmount("");
        }}
        onSend={handleSendCounter}
        counterAmount={counterOfferAmount}
        onChangeAmount={setCounterOfferAmount}
        currency={
          counterOfferTarget?.offerCurrency ??
          counterOfferTarget?.body?.split("|")[1] ??
          "AFN"
        }
        buyerOfferAmount={
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
          `onClose` — it never reserves and never touches the accept above. */}
      <BuyerPickerSheet
        visible={reserveConfirm !== null}
        onClose={() => setReserveConfirm(null)}
        listingId={reserveConfirm?.listingId ?? 0}
        price={reserveConfirm?.finalPrice ?? 0}
        currency={reserveConfirm?.currency ?? "AFN"}
        action="reserve"
        preselectedBuyer={reserveConfirm?.buyer ?? null}
        listingThumbnailUrl={conversation?.listing?.thumbnailUrl ?? null}
        listingTitle={conversation?.listing?.title ?? null}
        confirmTitle={reserveConfirm?.title}
        confirmBody={reserveConfirm?.body}
        cancelLabel={t("chat.offer.reserveAfterAcceptDismiss")}
        onConfirm={() => {
          void handleReserveAfterAcceptConfirm();
        }}
        isSubmitting={isReservingAfterAccept}
      />
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
