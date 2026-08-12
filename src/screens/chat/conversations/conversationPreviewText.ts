/**
 * conversationPreviewText — the single source of truth for "what does this
 * conversation's last message look like", shared by:
 *   - `ConversationRow` (renders the preview line + its leading icon)
 *   - `filterConversations` (TASK-Z684 list-level search predicate)
 *
 * CR fix (cycle-3 review): `filterConversations` used to match against the
 * RAW `lastMessageBody` (e.g. `"75000|AFN"` for an offer, or nothing at all
 * for a meetup proposal, whose body is metadata, not display text), while
 * `ConversationRow` displayed a translated, human string (e.g.
 * `"Offer: 75,000 AFN"` / `"Meetup proposed"`). A user searching for text
 * they could actually SEE on screen (e.g. "offer") would get zero results,
 * because search was matching something the user never saw. Both call sites
 * must derive the preview from the exact same function so "what you see is
 * what you can search for".
 *
 * CR fix (cycle-4 design review): the "offer" preview used to build
 * `t("chat.preview.offer", { amount, currency })` straight from the raw,
 * un-formatted split of `lastMessageBody` (e.g. literally "Offer: 75000
 * AFN") — no thousands separator, no locale-aware digits/currency symbol,
 * same as every OTHER price on screen (`PriceTag`, `CounterOfferSheet`,
 * `OfferSheet`, …) gets via `useLocalization().formatCurrency`. This now
 * takes `formatCurrency` as a parameter (this file is a plain function, not
 * a hook, so it cannot call `useLocalization()` itself) and pre-formats the
 * amount before interpolating a single `{{price}}` placeholder — the same
 * pattern every other price string in the app already uses.
 *
 * CR fix (TASK-Z684 review): the switch had no `offer_counter` case, so a
 * conversation whose last message is a counter-offer fell through to
 * `default` and rendered the RAW `"amount|currency|listedPrice"` metadata —
 * both on screen and to search (re-breaking "what you see is what you can
 * search for" for exactly the counter-offer flow, Conversation.tsx's
 * `handleSendCounter`, which sends `kind: "offer_counter"`). `offer_counter`
 * shares the same `amount|currency` prefix as `offer` (the third segment,
 * `listedPrice`, is irrelevant to the preview), so it reuses the identical
 * parse/format path and only swaps the translation key.
 */

import type { ComponentType } from "react";
import type { TFunction } from "i18next";
import { MapPin, Tag, Camera, FileText } from "lucide-react-native";
import type { Conversation } from "@/api/conversations";

/** Matches the shape of `useLocalization().formatCurrency`. */
export type FormatCurrency = (amount: number | null | undefined, currency?: string) => string;

interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}
type IconComponent = ComponentType<LucideIconProps>;

export interface ConversationPreview {
  /** The exact text rendered in the row AND matched against by search. */
  text: string;
  /** Leading icon shown next to the preview text, if any. */
  icon: IconComponent | null;
}

/**
 * Computes the last-message preview for a conversation row.
 *
 * - Deleted last message → "Message deleted"
 * - No last message at all → "No messages yet"
 * - Special `lastMessageKind`s (meetup/offer/offer_counter/photo/document) →
 *   a translated, human-readable label (never the raw metadata body)
 * - Plain text messages → the raw `lastMessageBody` as-is
 *
 * @param formatCurrency - `useLocalization().formatCurrency`, used to render
 *   the offer amount with locale-aware digits/grouping/currency symbol
 *   instead of the raw split-body number.
 */
export function conversationPreviewText(
  item: Conversation,
  t: TFunction,
  formatCurrency: FormatCurrency
): ConversationPreview {
  if (item.lastMessageDeleted) {
    return { text: t("chat.message.deleted"), icon: null };
  }

  if (!item.lastMessageBody) {
    return { text: t("chat.noMessages"), icon: null };
  }

  switch (item.lastMessageKind) {
    case "meetup_proposal":
      return { text: t("chat.preview.meetup"), icon: MapPin };
    case "meetup_accepted":
      return { text: t("chat.preview.meetupAccepted"), icon: MapPin };
    case "meetup_declined":
      return { text: t("chat.preview.meetupDeclined"), icon: MapPin };
    case "offer":
    case "offer_counter": {
      const [amountRaw, currency] = item.lastMessageBody.split("|");
      const amount = Number(amountRaw);
      const price = formatCurrency(
        Number.isFinite(amount) ? amount : null,
        currency || undefined
      );
      const translationKey =
        item.lastMessageKind === "offer_counter" ? "chat.preview.offerCounter" : "chat.preview.offer";
      return {
        text: t(translationKey, { price }),
        icon: Tag,
      };
    }
    case "offer_accepted":
      return { text: t("chat.preview.offerAccepted"), icon: Tag };
    case "offer_declined":
      return { text: t("chat.preview.offerDeclined"), icon: Tag };
    case "image_message":
      return { text: t("chat.preview.photo"), icon: Camera };
    case "document":
      return { text: t("chat.preview.file"), icon: FileText };
    default:
      return { text: item.lastMessageBody, icon: null };
  }
}
