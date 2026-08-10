/**
 * filterConversations — the list-level search predicate for Conversations.tsx
 * (TASK-Z684). Mobile already ships in-thread message search (TASK-N803);
 * this is the missing "find the thread" half.
 *
 * Case-insensitive, trimmed match against:
 *   - the counterpart's name: `otherParticipant?.name`, falling back to
 *     `buyer?.name` / `seller?.name` when `otherParticipant` isn't populated
 *   - the listing title: `listing?.title`
 *   - the last-message preview — via the SAME `conversationPreviewText`
 *     helper `ConversationRow` renders, so search only ever matches text the
 *     user can actually see on screen (a translated "Meetup proposed" /
 *     "Offer: 75,000 AFN", never the raw un-translated message metadata).
 *
 * A blank/whitespace-only term is treated as "no filter" — the full list
 * passes through unchanged.
 */

import type { TFunction } from "i18next";
import type { Conversation } from "@/api/conversations";
import { conversationPreviewText } from "./conversationPreviewText";

/** Extracts the display name to search against for a conversation's counterpart. */
function counterpartName(conversation: Conversation): string {
  return (
    conversation.otherParticipant?.name ??
    conversation.buyer?.name ??
    conversation.seller?.name ??
    ""
  );
}

/**
 * Filters `conversations` down to the ones whose counterpart name, listing
 * title, or last-message preview contains `term` (case-insensitive).
 *
 * @param conversations - the unfiltered list (already scoped to the current
 *   tab/read-filter — this function only applies the search term on top).
 * @param term - the raw search input; trimmed and lower-cased internally.
 * @param t - the i18next translate function, used (via `conversationPreviewText`)
 *   to compute the exact same human-readable preview text `ConversationRow`
 *   renders for special message kinds (meetup/offer/photo/document).
 */
export function filterConversations(
  conversations: Conversation[],
  term: string,
  t: TFunction
): Conversation[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return conversations;

  return conversations.filter((conversation) => {
    const name = counterpartName(conversation).toLowerCase();
    const title = (conversation.listing?.title ?? "").toLowerCase();
    const preview = conversationPreviewText(conversation, t).text.toLowerCase();

    return (
      name.includes(needle) ||
      title.includes(needle) ||
      preview.includes(needle)
    );
  });
}
