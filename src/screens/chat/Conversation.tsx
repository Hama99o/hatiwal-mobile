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
import { Send, Calendar, Paperclip, ShieldBan, Search, X, ImageIcon, Flag } from "lucide-react-native";
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
import { MessageBubble } from "./conversation/MessageBubble";
import { MeetupSheet } from "./conversation/MeetupSheet";
import { CounterOfferSheet } from "./conversation/CounterOfferSheet";
import { ReportSheet } from "@/components/common/ReportSheet";
import { SafetyTipsSheet } from "@/components/common/SafetyTipsSheet";
import { UserIdentity } from "@/components/common/UserIdentity";
import { useConversationCable } from "@/hooks/useConversationCable";
import { QuickReplies } from "@/components/common/QuickReplies";
import { useComposerDraft } from "@/hooks/useComposerDraft";
import { encodeMeetupBody, type MeetupCoords } from "./conversation/meetupBody";

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
  const { isRtl } = useLocalization();
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
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(conversationId);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  // Safety tips sheet is hoisted here (single instance) rather than owned by
  // MeetupSheet, so opening it never stacks a second native <Modal> on top of
  // the meetup sheet's. Tapping the link inside MeetupSheet hides the meetup
  // modal (without resetting its place/time fields — the component stays
  // mounted) and shows this one; closing it restores the meetup sheet.
  const [safetyTipsVisible, setSafetyTipsVisible] = useState(false);

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

  const PAGE_SIZE = 30;

  // ── Load conversation + messages (page 1 = newest, backend returns DESC) ─
  const load = useCallback(async (convId: number) => {
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
    } catch {
      toast.error(t("chat.thread.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
        load(currentConversationId);
        markRead(currentConversationId);
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
      if (!convId || !offer.body) return;
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
      } catch {
        toast.error(t("chat.thread.sendFailed"));
      }
    },
    [currentConversationId, t]
  );

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
  const handleAttachment = useCallback(async () => {
    const convId = currentConversationId;
    if (!convId) return;
    try {
      // Dynamic import so the app still works if expo-document-picker is not installed
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const sent = await conversationsAPI.sendFile(convId, file.uri, file.name ?? "file", file.mimeType ?? "application/octet-stream");
      setMessages((prev) => [...prev, sent]);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("Cannot find module")) {
        toast.error(t("chat.thread.filePickerNotAvailable"));
      } else {
        toast.error(t("chat.thread.sendFailed"));
      }
    }
  }, [currentConversationId, t]);

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
  // isOwner: true when the current user is the seller of the listing in this
  // conversation. Used to pick the seller vs buyer quick-reply phrase set.
  const isOwner =
    !!currentUser &&
    !!conversation?.seller &&
    Number(conversation.seller.id) === Number(currentUser.id);

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
          isOwner={
            !!currentUser &&
            !!conversation.seller &&
            Number(conversation.seller.id) === Number(currentUser.id)
          }
          onLifecycleDone={() => {
            // Invalidate the conversation so the listing's StatusBadge
            // and pinned header reflect the new status immediately.
            if (currentConversationId) {
              qc.invalidateQueries({ queryKey: ["conversation", currentConversationId] });
            }
            // Reload the conversation state in local state as well
            if (currentConversationId) {
              load(currentConversationId);
            }
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
          data={filteredMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
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

            const isSeller =
              !!currentUser &&
              !!conversation?.seller &&
              Number(currentUser.id) === Number(conversation.seller.id);

            return (
              <MessageBubble
                message={item}
                isMine={!!currentUser && Number(item.sender.id) === Number(currentUser.id)}
                meetupOutcome={meetupOutcome}
                onMeetupRespond={
                  item.kind === "meetup_proposal"
                    ? (accepted) => handleMeetupRespond(item, accepted)
                    : undefined
                }
                offerOutcome={offerOutcome}
                onOfferRespond={
                  // Offer: seller can respond (not mine, not already countered)
                  (item.kind === "offer" && !isOfferCountered)
                    ? (accepted) => handleOfferRespond(item, accepted)
                    // Counter: buyer can respond (not mine)
                    : item.kind === "offer_counter"
                    ? (accepted) => handleOfferRespond(item, accepted)
                    : undefined
                }
                onOfferCounter={
                  // Counter button only for seller on buyer's offer, before any response
                  item.kind === "offer" && !isOfferCountered && isSeller
                    ? () => handleOpenCounterSheet(item)
                    : undefined
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
            <Pressable
              onPress={() => setMeetupSheetVisible(true)}
              style={styles.meetupButton}
              hitSlop={8}
              accessibilityLabel={t("chat.proposeMeetup")}
            >
              <Calendar size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleAttachment}
              style={styles.meetupButton}
              hitSlop={8}
              accessibilityLabel={t("chat.attachFile")}
            >
              <Paperclip size={20} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={handlePhotoAttachment}
              disabled={isSendingPhoto}
              style={styles.meetupButton}
              hitSlop={8}
              accessibilityLabel={t("chat.attachPhoto")}
            >
              <ImageIcon size={20} color={isSendingPhoto ? colors.mutedForeground : colors.primary} />
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
  meetupButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
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
