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
  Alert,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Send, Calendar, Paperclip, ShieldBan, User } from "lucide-react-native";
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

import { ListingHeader } from "./conversation/ListingHeader";
import { MessageBubble } from "./conversation/MessageBubble";
import { MeetupSheet } from "./conversation/MeetupSheet";
import { useConversationCable } from "@/hooks/useConversationCable";

// ── Inline skeleton (no NativeWind className) ─────────────────────────────────
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";

function PulseLine({ w, h = 14, colors }: { w: number | string; h?: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const opacity = useSharedValue(1);
  useEffect(() => { opacity.value = withRepeat(withTiming(0.35, { duration: 850 }), -1, true); }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ backgroundColor: colors.muted, borderRadius: 8, height: h, width: w }, anim]} />;
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
    setMessages((prev) => [...prev, optimistic]);
    isNearBottomRef.current = true;
    // Wait for FlatList to render the new message before scrolling
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      // Scroll again after a longer delay to ensure it reaches the bottom on slow devices
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    }, 100);

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
        setMessages((prev) => [...prev, sent]);
        toast.success(accepted ? t("chat.meetup.acceptedToast") : t("chat.meetup.declinedToast"));
      } catch {
        toast.error(t("chat.thread.meetupFailed"));
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
      Alert.alert(
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
    // Only auto-scroll if user is already reading the latest messages
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [currentUser]));

  // ── Derived ──────────────────────────────────────────────────────────────
  const isClosed = conversation?.status === "closed";
  const canSend = !isClosed && !!currentConversationId;
  const isStartMode = !currentConversationId && !!listingId;

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header skeleton */}
        <ChatSkeleton colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Pinned listing header */}
      {conversation?.listing && (
        <ListingHeader
          listing={conversation.listing}
          onPress={() => router.push(`/(main)/listing/${conversation.listing.id}` as never)}
        />
      )}

      {/* Other participant bar with block action */}
      {otherParticipant && (
        <View
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push(`/(main)/seller/${otherParticipant.id}` as never)}
            style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 6, flex: 1 }}
            activeOpacity={0.7}
          >
            <User size={14} color={colors.mutedForeground} />
            <Text style={{ fontSize: 13, color: colors.mutedForeground, fontWeight: "500" }}>
              {otherParticipant.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBlockToggle}
            disabled={blockMutation.isPending || unblockMutation.isPending}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <ShieldBan size={18} color={isBlocked ? colors.destructive : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={88}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => {
            // Outcome for THIS proposal only — matched by the response's link
            // (responds_to_id), so declining one proposal never affects another.
            let meetupOutcome: "accepted" | "declined" | null = null;
            if (item.kind === "meetup_proposal") {
              const response = messages.find(
                (m) =>
                  (m.kind === "meetup_accepted" || m.kind === "meetup_declined") &&
                  m.respondsToId === item.id
              );
              if (response) {
                meetupOutcome = response.kind === "meetup_accepted" ? "accepted" : "declined";
              }
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
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          scrollEventThrottle={200}
          onScroll={handleScroll}
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
                {t("chat.thread.emptyTitle")}
              </Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: 4 }}>
                {t("chat.thread.emptyDescription")}
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
              { borderTopColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Input
              value={messageText}
              onChangeText={setMessageText}
              placeholder={t("chat.startConversation.placeholder")}
              multiline
              style={[
                styles.textInput,
                { textAlign: isRtl ? "right" : "left" },
              ]}
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
              { borderTopColor: colors.border, backgroundColor: colors.card },
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
              style={[
                styles.textInput,
                { textAlign: isRtl ? "right" : "left" },
              ]}
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
              { borderTopColor: colors.border, backgroundColor: colors.muted },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
