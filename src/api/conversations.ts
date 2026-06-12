import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export interface Message {
  id: number;
  body: string;
  kind: "text" | "meetup_proposal" | "system";
  readAt: string | null;
  createdAt: string;
  sender: { id: number; name: string };
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
  buyer?: { id: number; name: string; city: string | null };
  seller?: { id: number; name: string; city: string | null };
  otherParticipant?: { id: number; name: string; city: string | null };
  lastMessageBody?: string | null;
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

export const conversationsAPI = {
  getConversations: async (params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<ConversationsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));

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
    kind: "text" | "meetup_proposal" = "text"
  ): Promise<Message> => {
    const response = await http.post(
      `/conversations/${conversationId}/messages`,
      convertKeysToSnake({ body, kind })
    );
    return convertKeysToCamel(response.data.message) as Message;
  },
};
