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
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Send, Calendar } from "lucide-react-native";
import { toast } from "sonner-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Skeleton } from "@/components/reusables/skeleton";
import { conversationsAPI, type Conversation, type Message } from "@/api/conversations";
import { useAuthStore } from "@/stores/auth.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

import { ListingHeader } from "./conversation/ListingHeader";
import { MessageBubble } from "./conversation/MessageBubble";
import { MeetupSheet } from "./conversation/MeetupSheet";

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
  const currentUser = useAuthStore((s) => s.user);

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

  const flatListRef = useRef<FlatList>(null);

  // ── Load conversation + messages ─────────────────────────────────────────
  const load = useCallback(async (convId: number) => {
    try {
      const [conv, msgs] = await Promise.all([
        conversationsAPI.getConversation(convId),
        conversationsAPI.getMessages(convId, { pageSize: 100 }),
      ]);
      setConversation(conv);
      setMessages(msgs.items);
    } catch {
      toast.error(t("chat.thread.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

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

    // Optimistic append
    const optimistic: Message = {
      id: -Date.now(),
      body: text,
      kind: "text",
      readAt: null,
      createdAt: new Date().toISOString(),
      sender: { id: currentUser?.id ?? 0, name: currentUser?.fullName ?? "" },
    };
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
      setMessages((prev) => [...prev, sent]);
      setMeetupSheetVisible(false);
      toast.success(t("chat.thread.meetupSent"));
    } catch {
      toast.error(t("chat.thread.meetupFailed"));
    }
  }, [currentConversationId, t]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const isClosed = conversation?.status === "closed";
  const canSend = !isClosed && !!currentConversationId;
  const isStartMode = !currentConversationId && !!listingId;

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header skeleton */}
        <Skeleton className="h-20 w-full rounded-none" />
        <View style={styles.skeletonBody}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.skeletonRow,
                { justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" },
              ]}
            >
              <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
            </View>
          ))}
        </View>
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
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.sender.id === currentUser?.id}
            />
          )}
          contentContainerStyle={styles.messageList}
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
  skeletonBody: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: "row",
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
