/**
 * Unit tests for filterConversations (TASK-Z684) — the list-level search
 * predicate for Conversations.tsx.
 *
 * Coverage:
 *  1. Matches by counterpart name (otherParticipant.name)
 *  2. Falls back to buyer.name / seller.name when otherParticipant is absent
 *  3. Matches by listing title
 *  4. Matches by last-message preview
 *  5. Case-insensitivity
 *  6. Whitespace-only / empty term => no filtering (full list passes through)
 *  7. Null listing / null lastMessageBody are handled safely (no throw, no match)
 *  8. Trims the term before matching
 *  9. Matches the TRANSLATED preview text for special message kinds (meetup/
 *     offer/photo/document) — the same text ConversationRow renders — never
 *     the raw, un-translated `lastMessageBody` metadata (CR fix, cycle-3).
 */

import { filterConversations } from "../filterConversations";
import type { Conversation } from "@/api/conversations";
import type { TFunction } from "i18next";

// A tiny stand-in for i18next's TFunction that mirrors the real English
// copy for the keys `conversationPreviewText` uses, so these tests exercise
// the exact same interpolation path production code does (e.g. "offer"'s
// `{{amount}} {{currency}}` substitution) without needing the full i18n setup.
const PREVIEW_STRINGS: Record<string, string> = {
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

const fakeT = ((key: string, options?: Record<string, string>) => {
  if (key === "chat.preview.offer") {
    return `Offer: ${options?.amount ?? ""} ${options?.currency ?? ""}`;
  }
  return PREVIEW_STRINGS[key] ?? key;
}) as unknown as TFunction;

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    status: "open",
    lastMessageAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    listing: {
      id: 10,
      title: "iPhone 13 Pro Max",
      thumbnailUrl: null,
      status: "active",
    },
    otherParticipant: { id: 2, name: "Ahmad Karimi", city: "Kabul" },
    lastMessageBody: "Is this still available?",
    unreadCount: 0,
    ...overrides,
  };
}

describe("filterConversations — name match", () => {
  it("matches by otherParticipant.name", () => {
    const list = [makeConversation({ otherParticipant: { id: 2, name: "Ahmad Karimi", city: null } })];
    expect(filterConversations(list, "ahmad", fakeT)).toHaveLength(1);
  });

  it("does not match an unrelated name", () => {
    const list = [makeConversation({ otherParticipant: { id: 2, name: "Ahmad Karimi", city: null } })];
    expect(filterConversations(list, "Zainab", fakeT)).toHaveLength(0);
  });

  it("falls back to buyer.name when otherParticipant is absent", () => {
    const list = [
      makeConversation({
        otherParticipant: undefined,
        buyer: { id: 3, name: "Fatima Noori", city: null },
      }),
    ];
    expect(filterConversations(list, "fatima", fakeT)).toHaveLength(1);
  });

  it("falls back to seller.name when otherParticipant and buyer are both absent", () => {
    const list = [
      makeConversation({
        otherParticipant: undefined,
        buyer: undefined,
        seller: { id: 4, name: "Rahim Wali", city: null },
      }),
    ];
    expect(filterConversations(list, "rahim", fakeT)).toHaveLength(1);
  });
});

describe("filterConversations — listing title match", () => {
  it("matches by listing title", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "iPhone", fakeT)).toHaveLength(1);
  });

  it("matches a partial listing title", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "Pro Max", fakeT)).toHaveLength(1);
  });
});

describe("filterConversations — last message match", () => {
  it("matches by lastMessageBody for a plain text message", () => {
    const list = [makeConversation({ lastMessageBody: "Can we meet tomorrow at 5?" })];
    expect(filterConversations(list, "tomorrow", fakeT)).toHaveLength(1);
  });
});

describe("filterConversations — matches the TRANSLATED preview, not raw metadata (CR fix)", () => {
  it("matches the translated meetup preview text, not the raw body", () => {
    const list = [
      makeConversation({ lastMessageKind: "meetup_proposal", lastMessageBody: "Shahr-e-Naw|5pm" }),
    ];
    // "meetup" appears in the translated preview ("Meetup proposal") but NOT
    // in the raw body ("Shahr-e-Naw|5pm") — proves search uses the preview.
    expect(filterConversations(list, "meetup", fakeT)).toHaveLength(1);
  });

  it("matches the translated offer label even though the raw body has no such word", () => {
    const list = [
      makeConversation({ lastMessageKind: "offer", lastMessageBody: "75000|AFN" }),
    ];
    // The raw body has no word "offer" in it, but the rendered preview
    // ("Offer: 75000 AFN") does.
    expect(filterConversations(list, "offer", fakeT)).toHaveLength(1);
  });

  it("matches the interpolated offer amount in the translated preview", () => {
    const list = [
      makeConversation({ lastMessageKind: "offer", lastMessageBody: "75000|AFN" }),
    ];
    expect(filterConversations(list, "75000", fakeT)).toHaveLength(1);
  });

  it("matches the translated photo preview label", () => {
    const list = [
      makeConversation({ lastMessageKind: "image_message", lastMessageBody: "photo.jpg" }),
    ];
    expect(filterConversations(list, "photo", fakeT)).toHaveLength(1);
  });

  it("matches the translated document preview label, not the filename", () => {
    const list = [
      makeConversation({ lastMessageKind: "document", lastMessageBody: "contract.pdf" }),
    ];
    expect(filterConversations(list, "file", fakeT)).toHaveLength(1);
    expect(filterConversations(list, "contract", fakeT)).toHaveLength(0);
  });
});

describe("filterConversations — case-insensitivity", () => {
  it("matches regardless of the term's case", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "IPHONE", fakeT)).toHaveLength(1);
    expect(filterConversations(list, "iphone", fakeT)).toHaveLength(1);
    expect(filterConversations(list, "IpHoNe", fakeT)).toHaveLength(1);
  });

  it("matches regardless of the stored data's case", () => {
    const list = [makeConversation({ otherParticipant: { id: 2, name: "AHMAD KARIMI", city: null } })];
    expect(filterConversations(list, "ahmad", fakeT)).toHaveLength(1);
  });
});

describe("filterConversations — blank term", () => {
  it("returns the full list unchanged for an empty string", () => {
    const list = [makeConversation(), makeConversation({ id: 2 })];
    expect(filterConversations(list, "", fakeT)).toHaveLength(2);
  });

  it("returns the full list unchanged for a whitespace-only term", () => {
    const list = [makeConversation(), makeConversation({ id: 2 })];
    expect(filterConversations(list, "   ", fakeT)).toHaveLength(2);
  });

  it("trims the term before matching (leading/trailing spaces ignored)", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "  iphone  ", fakeT)).toHaveLength(1);
  });
});

describe("filterConversations — null-safety", () => {
  it("does not throw and excludes the row when listing is null and the term doesn't match the name/message", () => {
    const list = [
      makeConversation({ listing: null, lastMessageBody: null }),
    ];
    expect(() => filterConversations(list, "iphone", fakeT)).not.toThrow();
    expect(filterConversations(list, "iphone", fakeT)).toHaveLength(0);
  });

  it("still matches by name when listing and lastMessageBody are both null", () => {
    const list = [
      makeConversation({
        listing: null,
        lastMessageBody: null,
        otherParticipant: { id: 2, name: "Ahmad Karimi", city: null },
      }),
    ];
    expect(filterConversations(list, "ahmad", fakeT)).toHaveLength(1);
  });

  it("handles a conversation with no name, no listing, and no last message at all", () => {
    const list = [
      makeConversation({
        listing: null,
        lastMessageBody: null,
        otherParticipant: undefined,
        buyer: undefined,
        seller: undefined,
      }),
    ];
    expect(() => filterConversations(list, "anything", fakeT)).not.toThrow();
    expect(filterConversations(list, "anything", fakeT)).toHaveLength(0);
  });

  it("returns an empty array (not throw) when given an empty conversations array", () => {
    expect(filterConversations([], "term", fakeT)).toEqual([]);
  });
});

describe("filterConversations — multiple items", () => {
  it("filters down to only the matching conversations", () => {
    const list = [
      makeConversation({ id: 1, otherParticipant: { id: 2, name: "Ahmad Karimi", city: null } }),
      makeConversation({ id: 2, otherParticipant: { id: 3, name: "Zainab Hashimi", city: null } }),
      makeConversation({
        id: 3,
        otherParticipant: { id: 4, name: "Rahim Wali", city: null },
        listing: { id: 11, title: "Toyota Corolla", thumbnailUrl: null, status: "active" },
      }),
    ];
    const result = filterConversations(list, "ahmad", fakeT);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
