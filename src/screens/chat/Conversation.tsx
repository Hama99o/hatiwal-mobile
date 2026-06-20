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
} from "react-native";
import { confirmAlert } from "@/utils/alert";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Calendar, Paperclip, ShieldBan, User, Search, X } from "lucide-react-native";
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
import { useQuery, useMutation } from "@tanstack/react-query";

import { BackButton } from "@/components/common/BackButton";
import { ListingHeader } from "./conversation/ListingHeader";
import { MessageBubble } from "./conversation/MessageBubble";
import { MeetupSheet } from "./conversation/MeetupSheet";
import { useConversationCable } from "@/hooks/useConversationCable";

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
  const [messageText, setMessageText] = useState(initialMessage);
  const [meetupSheetVisible, setMeetupSheetVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(conversationId);
  const [isBlocked, setIsBlocked] = useState(false);
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
        m.body.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages;

  // Number of text messages that match (used for the counter badge)
  const matchCount = searchVisible && searchQuery.trim()
    ? filteredMessages.length
    : 0;

  const flatListRef = useRef<FlatList>(null);
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
    setMessageText("");
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
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageText(text);
      toast.error(t("chat.thread.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }, [currentConversationId, messageText, isSending, currentUser, t]);

  // ── Send meetup proposal ─────────────────────────────────────────────────
  const handleProposeMeetup = useCallback(async (place: string, time: string) => {
    const convId = currentConversationId;
    if (!convId) return;
    const body = `${place} | ${time}`;

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
      if (!convId) return;
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
      if (!convId) return;
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

  // ── Live updates via ActionCable ─────────────────────────────────────────
  useConversationCable(currentConversationId, useCallback((incoming: Message) => {
    // Skip messages from the current user — they're already handled by
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
        <Pressable
          onPress={
            otherParticipant
              ? () => router.push(`/(main)/seller/${otherParticipant.id}` as never)
              : undefined
          }
          style={[styles.navCenter, { flexDirection: isRtl ? "row-reverse" : "row" }]}
        >
          {otherParticipant ? (
            <>
              <User size={14} color={colors.mutedForeground} />
              <Text
                style={[styles.navTitle, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
                numberOfLines={1}
              >
                {otherParticipant.name}
              </Text>
            </>
          ) : (
            <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
              {conversation?.listing?.title ?? t("chat.title")}
            </Text>
          )}
        </Pressable>

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
          >
            <ShieldBan size={18} color={isBlocked ? colors.destructive : colors.mutedForeground} />
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

      {/* Pinned listing header */}
      {conversation?.listing && (
        <ListingHeader
          listing={conversation.listing}
          onPress={() => router.push(`/(main)/listing/${conversation.listing.id}` as never)}
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
              const r = messages.find(
                (m) =>
                  (m.kind === "offer_accepted" || m.kind === "offer_declined") &&
                  m.respondsToId === item.id
              );
              if (r) offerOutcome = r.kind === "offer_accepted" ? "accepted" : "declined";
            }
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
                  item.kind === "offer" ? (accepted) => handleOfferRespond(item, accepted) : undefined
                }
                searchQuery={searchVisible ? searchQuery.trim() : undefined}
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
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <Input
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
          // Normal send input with meetup button
          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 8) },
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
            <Input
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
        ) : (
          // Closed notice in input area
          <View
            style={[
              styles.closedInput,
              { borderTopColor: colors.border, backgroundColor: colors.muted, paddingBottom: Math.max(insets.bottom, 12) },
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
