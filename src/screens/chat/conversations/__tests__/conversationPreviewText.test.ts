/**
 * Unit tests for conversationPreviewText — the single source of truth for
 * a conversation's last-message preview, shared by ConversationRow (display)
 * and filterConversations (search, TASK-Z684 CR fix).
 */

import { conversationPreviewText } from "../conversationPreviewText";
import type { Conversation } from "@/api/conversations";
import type { TFunction } from "i18next";

const fakeT = ((key: string, options?: Record<string, string>) => {
  if (key === "chat.preview.offer") {
    return `Offer: ${options?.amount ?? ""} ${options?.currency ?? ""}`;
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
      fakeT
    );
    expect(result.text).toBe("Message deleted");
    expect(result.icon).toBeNull();
  });

  it("returns the no-messages placeholder when lastMessageBody is null", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageBody: null }),
      fakeT
    );
    expect(result.text).toBe("No messages yet");
    expect(result.icon).toBeNull();
  });

  it("returns the raw body verbatim for a plain text message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageBody: "Can we meet tomorrow?", lastMessageKind: "text" }),
      fakeT
    );
    expect(result.text).toBe("Can we meet tomorrow?");
  });

  it("returns a translated label (with an icon) for a meetup proposal", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "meetup_proposal", lastMessageBody: "Shahr-e-Naw|5pm" }),
      fakeT
    );
    expect(result.text).toBe("Meetup proposal");
    expect(result.icon).not.toBeNull();
  });

  it("interpolates amount and currency for an offer", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "offer", lastMessageBody: "75000|AFN" }),
      fakeT
    );
    expect(result.text).toBe("Offer: 75000 AFN");
    expect(result.icon).not.toBeNull();
  });

  it("returns the translated photo label for an image message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "image_message", lastMessageBody: "photo.jpg" }),
      fakeT
    );
    expect(result.text).toBe("Photo");
  });

  it("returns the translated file label for a document message", () => {
    const result = conversationPreviewText(
      makeConversation({ lastMessageKind: "document", lastMessageBody: "contract.pdf" }),
      fakeT
    );
    expect(result.text).toBe("File");
  });
});
