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
 */

import type { ComponentType } from "react";
import type { TFunction } from "i18next";
import { MapPin, Tag, Camera, FileText } from "lucide-react-native";
import type { Conversation } from "@/api/conversations";

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
 * - Special `lastMessageKind`s (meetup/offer/photo/document) → a translated,
 *   human-readable label (never the raw metadata body)
 * - Plain text messages → the raw `lastMessageBody` as-is
 */
export function conversationPreviewText(
  item: Conversation,
  t: TFunction
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
    case "offer": {
      const [amount, currency] = item.lastMessageBody.split("|");
      return {
        text: t("chat.preview.offer", { amount: amount ?? "", currency: currency ?? "" }),
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
