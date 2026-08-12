/**
 * Unit tests for conversationPreviewText — the single source of truth for
 * a conversation's last-message preview, shared by ConversationRow (display)
 * and filterConversations (search, TASK-Z684 CR fix).
 */

import { conversationPreviewText, type FormatCurrency } from "../conversationPreviewText";
import type { Conversation } from "@/api/conversations";
import type { TFunction } from "i18next";

const fakeT = ((key: string, options?: Record<string, string>) => {
  if (key === "chat.preview.offer") {
    return `Offer: ${options?.price ?? ""}`;
  }
  if (key === "chat.preview.offerCounter") {
    return `Counter offer: ${options?.price ?? ""}`;
  }
  const dict: Record<string, string> = {
    "chat.message.deleted": "Message deleted",
    "chat.noMessages": "No messages yet",
    "chat.preview.meetup": "Meetup proposal",
    "chat.preview.meetupAccepted": "Meetup accepted",
    "chat.preview.meetupDeclined": "Meetup declined",
    "chat.preview.offerAccepted": "Offer accepted",
    "chat.preview.offerDeclined": "Offer declined",
    "chat.preview.photo": "Photo",
    "chat.preview.file": "File",
  };
  return dict[key] ?? key;
}) as unknown as TFunction;

// Mirrors `useLocalization().formatCurrency` closely enough to prove the
// preview interpolates a LOCALE-FORMATTED price (cycle-4 CR fix) — e.g.
// thousands-grouped — rather than the raw, un-formatted split-body number.
const fakeFormatCurrency: FormatCurrency = (amount, currency = "AFN") => {
  if (amount == null) return "";
  return `${new Intl.NumberFormat("en-US").format(amount)} ${currency}`;
};

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    status: "open",
    lastMessageAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    listing: { id: 10, title: "iPhone 13 Pro Max", thumbnailUrl: null, status: "active" },
    otherParticipant: { id: 2, name: "Ahmad Karimi", city: "Kabul" },
    lastMessageBody: "Is this still available?",
    unreadCount: 0,
    ...overrides,
  };
}

describe("conversationPreviewText", () => {
  it("returns the deleted-message text when lastMessageDeleted is true", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageDeleted: true, lastMessageBody: "some text" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Message deleted");
    expect(result.icon).toBeNull();
  });

  it("returns the no-messages placeholder when lastMessageBody is null", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageBody: null }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("No messages yet");
    expect(result.icon).toBeNull();
  });

  it("returns the raw body verbatim for a plain text message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageBody: "Can we meet tomorrow?", lastMessageKind: "text" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Can we meet tomorrow?");
  });

  it("returns a translated label (with an icon) for a meetup proposal", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "meetup_proposal", lastMessageBody: "Shahr-e-Naw|5pm" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Meetup proposal");
    expect(result.icon).not.toBeNull();
  });

  // CR fix (cycle-4 design review): the offer preview used to print the raw,
  // un-formatted split-body number verbatim (e.g. "Offer: 75000 AFN" — no
  // thousands separator). It must now route the amount through
  // `formatCurrency` before interpolating, exactly like every other price in
  // the app (PriceTag, CounterOfferSheet, OfferSheet, …).
  it("formats the amount via formatCurrency for an offer (not the raw split-body number)", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "offer", lastMessageBody: "75000|AFN" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Offer: 75,000 AFN");
    expect(result.icon).not.toBeNull();
  });

  it("passes the offer's currency through to formatCurrency, not a hardcoded one", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "offer", lastMessageBody: "500|USD" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Offer: 500 USD");
  });

  it("does not throw when the offer body has no parseable amount", () => {
    expect(() =>
      conversationPreviewText(
        makeConversation({ lastMessageKind: "offer", lastMessageBody: "|AFN" }),
        fakeT,
        fakeFormatCurrency
      )
    ).not.toThrow();
  });

  // TASK-Z684 review fix: `offer_counter` (Conversation.tsx's counter-offer
  // flow, `handleSendCounter`) used to fall through to `default` and render
  // the raw "amount|currency|listedPrice" metadata. It must render the same
  // locale-formatted `{{price}}` treatment as `offer`, via its own
  // `chat.preview.offerCounter` translation key.
  it("formats the amount via formatCurrency for a counter-offer, using its own translation key", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "offer_counter", lastMessageBody: "70000|AFN|85000" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Counter offer: 70,000 AFN");
    expect(result.icon).not.toBeNull();
  });

  it("ignores the third (listedPrice) segment of a counter-offer body", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "offer_counter", lastMessageBody: "500|USD|900" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Counter offer: 500 USD");
  });

  it("does not throw when the counter-offer body has no parseable amount", () => {
    expect(() =>
      conversationPreviewText(
        makeConversation({ lastMessageKind: "offer_counter", lastMessageBody: "|AFN|" }),
        fakeT,
        fakeFormatCurrency
      )
    ).not.toThrow();
  });

  it("returns the translated photo label for an image message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "image_message", lastMessageBody: "photo.jpg" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("Photo");
  });

  it("returns the translated file label for a document message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "document", lastMessageBody: "contract.pdf" }),
      fakeT,
      fakeFormatCurrency
    );
    expect(result.text).toBe("File");
  });
});
