import { http, BASE_URL } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";
import { secureStorage } from "@/utils/secure-storage";

export interface Message {
  id: number;
  body: string | null;
  kind:
    | "text"
    | "meetup_proposal"
    | "meetup_accepted"
    | "meetup_declined"
    | "system"
    | "offer"
    | "offer_accepted"
    | "offer_declined"
    | "offer_counter"
    | "document"
    | "image_message";
  readAt: string | null;
  createdAt: string;
  sender: { id: number; name: string };
  attachmentUrl?: string | null;
  /** For a meetup accept/decline: the proposal message id it answers. */
  respondsToId?: number | null;
  /**
   * Pre-parsed offer amount — populated by the serializer for `offer` and
   * `offer_counter` kinds.  Use this instead of splitting `body` manually.
   */
  offerAmount?: number | null;
  /** Currency code (e.g. "AFN") — populated for `offer` and `offer_counter` kinds. */
  offerCurrency?: string | null;
  /**
   * True when the message has been soft-deleted by its author.
   * Body, attachment_url, offer_amount and offer_currency are null when deleted.
   */
  deleted?: boolean;
  deletedAt?: string | null;
}

export interface Conversation {
  id: number;
  status: "open" | "closed";
  lastMessageAt: string | null;
  createdAt: string;
  /** True when the associated listing has been removed or deleted. */
  listingDeleted?: boolean;
  listing: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    price?: number;
    currency?: string;
    location?: string;
    /**
     * Whether the seller accepts price offers for this listing.
     * true (default) — offer affordance is shown in the conversation.
     * false — "Firm price" notice shown; offer entry point hidden.
     */
    negotiable?: boolean;
    /**
     * TASK-K729 — the listing's category, so the buyer-facing reserved/sold
     * recovery notice can offer a "Browse similar in {category}" CTA
     * (pre-filters Browse by category id) instead of a dead end.
     */
    category?: {
      id: number;
      nameEn: string;
      namePs?: string | null;
      nameFa?: string | null;
      slug?: string;
    } | null;
  } | null;
  buyer?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  seller?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  otherParticipant?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  blockedWithParticipant?: boolean;
  lastMessageBody?: string | null;
  lastMessageKind?: Message["kind"] | null;
  /** True when the last message was retracted (soft-deleted) by its author. */
  lastMessageDeleted?: boolean;
  unreadCount?: number;
  /**
   * Which side of this thread the current viewer is on — "buyer" when the
   * viewer started the conversation, "seller" when it's about their own
   * listing. `undefined` only for callers that don't pass a current_user
   * (never expected from the mobile app, which is always authenticated).
   */
  viewerRole?: "buyer" | "seller";
}

export interface ConversationsResponse {
  items: Conversation[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Aggregates the total number of unread messages across all conversations.
 *
 * - Sums each conversation's `unreadCount` (treats undefined as 0).
 * - Returns 0 for an empty list or when every conversation has no unread messages.
 * - Caps the returned value at 99; render sites that display this value should
 *   show "99+" when the returned value equals 99 (i.e. `count >= 99 ? "99+" : count`).
 */
export function getUnreadTotal(conversations: Pick<Conversation, "unreadCount">[]): number {
  const total = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  return Math.min(total, 99);
}

export const conversationsAPI = {
  getConversations: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    listingId?: number;
    /** When true, returns archived conversations instead of the active inbox. */
    archived?: boolean;
    /**
     * Server-side role scope — "buying" returns only threads where the
     * current user is the buyer, "selling" only threads where they're the
     * seller. Omit for the default mixed inbox.
     */
    role?: "buying" | "selling";
  }): Promise<ConversationsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.listingId)  query.append("listing_id",   String(params.listingId));
    if (params?.archived !== undefined) query.append("archived", String(params.archived));
    if (params?.role)       query.append("role", params.role);

    const response = await http.get(`/conversations?${query}`);
    return {
      items: (response.data.conversations ?? []).map(
        (c: Record<string, unknown>) => convertKeysToCamel(c) as Conversation
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ConversationsResponse["pagination"],
    };
  },

  getConversation: async (id: number): Promise<Conversation> => {
    const response = await http.get(`/conversations/${id}`);
    return convertKeysToCamel(response.data.conversation) as Conversation;
  },

  startConversation: async (
    listingId: number,
    message: string
  ): Promise<Conversation> => {
    const response = await http.post(`/listings/${listingId}/conversations`, {
      message,
    });
    return convertKeysToCamel(response.data.conversation) as Conversation;
  },

  getMessages: async (
    conversationId: number,
    params?: { pageNumber?: number; pageSize?: number }
  ): Promise<{ items: Message[]; pagination: ConversationsResponse["pagination"] }> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));

    const response = await http.get(`/conversations/${conversationId}/messages?${query}`);
    return {
      items: (response.data.messages ?? []).map(
        (m: Record<string, unknown>) => convertKeysToCamel(m) as Message
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ConversationsResponse["pagination"],
    };
  },

  sendMessage: async (
    conversationId: number,
    body: string,
    kind:
      | "text"
      | "meetup_proposal"
      | "meetup_accepted"
      | "meetup_declined"
      | "offer"
      | "offer_accepted"
      | "offer_declined"
      | "offer_counter" = "text",
    respondsToId?: number
  ): Promise<Message> => {
    const response = await http.post(
      `/conversations/${conversationId}/messages`,
      convertKeysToSnake({ body, kind, respondsToId })
    );
    return convertKeysToCamel(response.data.message) as Message;
  },

  markMessagesRead: async (conversationId: number): Promise<void> => {
    await http.put(`/conversations/${conversationId}/messages/mark_read`);
  },

  /**
   * Mark all inbound messages in a conversation as read (unread badge → 0).
   * PUT /conversations/:id/mark_read
   */
  markRead: async (id: number): Promise<void> => {
    await http.put(`/conversations/${id}/mark_read`);
  },

  /**
   * Restore the most recent inbound message to unread so the row re-shows
   * the unread badge.
   * PUT /conversations/:id/mark_unread
   */
  markUnread: async (id: number): Promise<void> => {
    await http.put(`/conversations/${id}/mark_unread`);
  },

  deleteConversation: async (id: number): Promise<void> => {
    await http.delete(`/conversations/${id}`);
  },

  /**
   * Archive a conversation for the current user.
   * The conversation moves out of the default inbox but the history is preserved.
   * PUT /conversations/:id/archive
   */
  archiveConversation: async (id: number): Promise<void> => {
    await http.put(`/conversations/${id}/archive`);
  },

  /**
   * Unarchive a conversation — restores it to the default inbox.
   * PUT /conversations/:id/unarchive
   */
  unarchiveConversation: async (id: number): Promise<void> => {
    await http.put(`/conversations/${id}/unarchive`);
  },

  /**
   * Soft-delete a message you sent.
   * DELETE /conversations/:conversationId/messages/:messageId
   * Only the author may call this — returns 403 for other participants.
   */
  deleteMessage: async (
    conversationId: number,
    messageId: number
  ): Promise<Message> => {
    const response = await http.delete(
      `/conversations/${conversationId}/messages/${messageId}`
    );
    return convertKeysToCamel(response.data.message) as Message;
  },

  sendFile: async (
    conversationId: number,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<Message> => {
    return conversationsAPI._sendMultipart(conversationId, "document", fileUri, fileName, mimeType);
  },

  sendImage: async (
    conversationId: number,
    imageUri: string,
    fileName: string,
    mimeType: string
  ): Promise<Message> => {
    return conversationsAPI._sendMultipart(conversationId, "image_message", imageUri, fileName, mimeType);
  },

  /** @internal Shared multipart upload helper used by sendFile and sendImage. */
  _sendMultipart: async (
    conversationId: number,
    kind: "document" | "image_message",
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<Message> => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("body", fileName);
    (form as any).append("attachment", { uri: fileUri, name: fileName, type: mimeType });

    const accessToken = await secureStorage.getItem("access-token");
    const client      = await secureStorage.getItem("client");
    const uid         = await secureStorage.getItem("uid");

    const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
      method: "POST",
      body: form,
      headers: {
        "access-token": accessToken ?? "",
        client:         client ?? "",
        uid:            uid ?? "",
        "token-type":   "Bearer",
      },
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return convertKeysToCamel(json.message) as Message;
  },
};
