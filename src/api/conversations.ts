import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export interface Message {
  id: number;
  body: string;
  kind:
    | "text"
    | "meetup_proposal"
    | "meetup_accepted"
    | "meetup_declined"
    | "system"
    | "offer"
    | "offer_accepted"
    | "offer_declined"
    | "document"
    | "image_message";
  readAt: string | null;
  createdAt: string;
  sender: { id: number; name: string };
  attachmentUrl?: string | null;
  /** For a meetup accept/decline: the proposal message id it answers. */
  respondsToId?: number | null;
}

export interface Conversation {
  id: number;
  status: "open" | "closed";
  lastMessageAt: string | null;
  createdAt: string;
  listing: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    price?: number;
    currency?: string;
    location?: string;
  };
  buyer?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  seller?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  otherParticipant?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  lastMessageBody?: string | null;
  lastMessageKind?: Message["kind"] | null;
  unreadCount?: number;
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
 * - Caps the returned value at 99; conversations with a combined total above 99
 *   return 99 so callers can display a "99+" badge label if desired.
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
  }): Promise<ConversationsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.listingId)  query.append("listing_id",   String(params.listingId));

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
      | "offer_declined" = "text",
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

  deleteConversation: async (id: number): Promise<void> => {
    await http.delete(`/conversations/${id}`);
  },

  sendFile: async (
    conversationId: number,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<Message> => {
    const form = new FormData();
    form.append("kind", "document");
    form.append("body", fileName);
    (form as any).append("attachment", { uri: fileUri, name: fileName, type: mimeType });

    const { secureStorage } = await import("@/utils/secure-storage");
    const accessToken = await secureStorage.getItem("access-token");
    const client      = await secureStorage.getItem("client");
    const uid         = await secureStorage.getItem("uid");
    const { BASE_URL } = await import("./http");

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
    const { convertKeysToCamel } = await import("@/utils/case-styles");
    return convertKeysToCamel(json.message) as Message;
  },
};
