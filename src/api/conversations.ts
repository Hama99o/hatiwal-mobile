import { http, BASE_URL } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";
import { secureStorage } from "@/utils/secure-storage";
import type { EmbeddedCategory } from "./categories";

/**
 * The listing's category as embedded on a conversation payload.
 * TASK-K729 (review fix, MEDIUM): re-exported alias — the actual shape is the
 * shared `EmbeddedCategory` (see ./categories.ts), reused verbatim by
 * ListingUnavailableNotice.tsx instead of each declaring its own identical
 * type.
 */
export type ConversationListingCategory = EmbeddedCategory;

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
   * SF-M11 — how many units this offer is for, on a multi-unit listing.
   *
   * A real column server-side, NOT a 4th segment of `body`'s pipe encoding:
   * mobile, web and the API all already parse that string, so widening it
   * would have changed a field every one of them reads. This is additive, so
   * an older client simply ignores it.
   *
   * `null` means UNSPECIFIED, not one — it is null for every non-offer kind,
   * every offer on a single-item listing, every offer whose sender named no
   * quantity, and every offer sent before SF-B11 shipped. Read it with
   * `offerUnits()` (`@/screens/shared/listing-detail/offerQuantity`), which
   * applies the "absence means a single unit" rule in ONE place rather than
   * leaving each call site to remember it.
   */
  offerQuantity?: number | null;
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
    /**
     * TASK-J471: present on BOTH the `:list` view (GET /conversations, the
     * inbox) and the `:detailed` view (GET /conversations/:id) — see
     * `conversation_serializer.rb`. Both columns are `NOT NULL` at the DB
     * level (`listings.price`/`listings.currency`), so in practice this is
     * always populated whenever `listing` itself is non-null. `?` here is
     * defensive typing only, not a signal that either view can omit it.
     */
    price?: number;
    currency?: string;
    /**
     * Multi-quantity (docs/SPIKE_LISTING_QUANTITY.md). Present on BOTH views —
     * ConversationSerializer hand-rolls its own listing hash rather than reusing
     * ListingSerializer, so these had to be added to it explicitly. `multiUnit`
     * gates the "each" suffix on the price; without it a buyer reads a per-unit
     * figure as the price of the whole batch in the one place the deal is struck.
     */
    multiUnit?: boolean;
    availableUnits?: number;
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
    category?: ConversationListingCategory | null;
    /**
     * TASK-K729 (review fix, HIGH) — boolean-only, viewer-scoped: true when
     * THIS conversation's buyer is the buyer the seller committed to for the
     * CURRENT reservation/sale (`Listing#current_sale`). Never leaks WHO the
     * buyer is when it's someone else — that identity stays owner-scoped on
     * `Listing.sale` (my/listings), never here. Drives
     * ListingUnavailableNotice's viewer-scoped "Reserved for you" / "You
     * bought this item" copy instead of the generic recovery copy, which
     * would be FALSE (and actively harmful) for the buyer who actually won
     * the deal. `undefined` on a legacy buyer-less reserve/sold (no
     * Transaction row at all) — treat as false.
     */
    viewerIsSaleBuyer?: boolean;
    /**
     * TASK-K729 (review fix, HIGH follow-up) — the viewer's OWN transaction
     * id, populated ONLY when `viewerIsSaleBuyer` is true (never leaks
     * another buyer's transaction id). Lets the "You bought this item"
     * notice open the REV2 `ReviewPromptSheet` with a real transactionId
     * instead of the positive close having no next step.
     */
    viewerSaleTransactionId?: number | null;
    /**
     * Whether the viewer has already left their review on this sale — only
     * meaningful when `viewerIsSaleBuyer` is true. Lets the client hide the
     * "Rate the seller" CTA once done instead of re-offering a review the
     * server would 422 on as a duplicate.
     */
    viewerHasReviewedSale?: boolean | null;
  } | null;
  buyer?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  seller?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  otherParticipant?: { id: number; name: string; city: string | null; verified?: boolean; avatarUrl?: string | null };
  /**
   * A block exists in EITHER direction, so messaging is impossible. Named for
   * the fact, not for who did it — the API computes it as
   * `current_user.blocked?(other) || other.blocked?(current_user)`.
   * Use it to gate sending, never to label an "unblock" control.
   */
  blockedWithParticipant?: boolean;
  /**
   * I am the blocker, so I can undo it. The distinction matters: unblocking is
   * only MY block to remove (BlocksController#destroy deletes
   * `current_user.blocked_users` and nothing else), so offering "unblock" off
   * the OR above produced a button that deleted nothing, answered 204, briefly
   * re-enabled the composer and then lost it again on the next load (card 312).
   *
   * Optional because the field is newer than the clients that read this type;
   * fall back to `blockedWithParticipant` when it is absent.
   */
  blockedByMe?: boolean;
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
    /** Server-side search across the whole inbox, not just the loaded page. */
    search?: string;
  }): Promise<ConversationsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.listingId)  query.append("listing_id",   String(params.listingId));
    if (params?.archived !== undefined) query.append("archived", String(params.archived));
    if (params?.role)       query.append("role", params.role);
    // Server-side inbox search (owner report, 2026-09-02: "it's not connected
    // with backend, it's not search in db"). Matches the other party's name, the
    // listing title, and any message body — see Conversation.matching.
    if (params?.search)     query.append("search", params.search);

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
    respondsToId?: number,
    /**
     * SF-M11 — units this offer is for. Omit (or pass undefined) for every
     * non-offer message and for a single-item listing; the server DISCARDS a
     * value that cannot mean anything rather than rejecting it, so a stale
     * client can never invent a 422 on a flow that works today. Sent only
     * when set, which keeps every pre-existing call site byte-identical on
     * the wire.
     */
    offerQuantity?: number
  ): Promise<Message> => {
    const response = await http.post(
      `/conversations/${conversationId}/messages`,
      convertKeysToSnake(
        offerQuantity == null
          ? { body, kind, respondsToId }
          : { body, kind, respondsToId, offerQuantity }
      )
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
