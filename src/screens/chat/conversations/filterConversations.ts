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
 *
 * CR fix (TASK-Z684 review): the offer preview interpolates a
 * `formatCurrency`-formatted amount (cycle-4 CR fix), which renders
 * Eastern-Arabic digits (٠-٩ / ۰-۹) in the `ps`/`fa` locales
 * (`useLocalization` maps ps → `fa-AF`, fa → `fa-IR`). A search term typed on
 * a LATIN-digit keyboard (or pasted) used to get zero matches against that
 * preview even though the amount is right there on screen — a regression
 * from the pre-formatCurrency behaviour, where the raw split-body number was
 * always Latin. Both the needle and the haystack are run through
 * `normalizeDigits` (Persian/Pashto + Arabic-Indic digits → ASCII 0-9) before
 * comparing, so a search matches regardless of which numeral system either
 * side happens to be in.
 */

import type { TFunction } from "i18next";
import type { Conversation } from "@/api/conversations";
import { normalizeDigits } from "@/utils/normalizeDigits";
import { conversationPreviewText, type FormatCurrency } from "./conversationPreviewText";

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
 * @param formatCurrency - `useLocalization().formatCurrency`, forwarded to
 *   `conversationPreviewText` so an "offer" preview is matched against the
 *   same locale-formatted price string `ConversationRow` renders (cycle-4 CR
 *   fix), not the raw, un-formatted `amount|currency` split.
 */
export function filterConversations(
  conversations: Conversation[],
  term: string,
  t: TFunction,
  formatCurrency: FormatCurrency
): Conversation[] {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) return conversations;
  // Normalized so a Latin-digit search term still matches a preview whose
  // amount was rendered with Eastern-Arabic digits (ps/fa), and vice versa.
  const needle = normalizeDigits(trimmed);

  return conversations.filter((conversation) => {
    const name = normalizeDigits(counterpartName(conversation).toLowerCase());
    const title = normalizeDigits((conversation.listing?.title ?? "").toLowerCase());
    const preview = normalizeDigits(
      conversationPreviewText(conversation, t, formatCurrency).text.toLowerCase()
    );

    return (
      name.includes(needle) ||
      title.includes(needle) ||
      preview.includes(needle)
    );
  });
}
