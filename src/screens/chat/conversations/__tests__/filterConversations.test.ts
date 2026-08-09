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
 */

import { filterConversations } from "../filterConversations";
import type { Conversation } from "@/api/conversations";

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
    expect(filterConversations(list, "ahmad")).toHaveLength(1);
  });

  it("does not match an unrelated name", () => {
    const list = [makeConversation({ otherParticipant: { id: 2, name: "Ahmad Karimi", city: null } })];
    expect(filterConversations(list, "Zainab")).toHaveLength(0);
  });

  it("falls back to buyer.name when otherParticipant is absent", () => {
    const list = [
      makeConversation({
        otherParticipant: undefined,
        buyer: { id: 3, name: "Fatima Noori", city: null },
      }),
    ];
    expect(filterConversations(list, "fatima")).toHaveLength(1);
  });

  it("falls back to seller.name when otherParticipant and buyer are both absent", () => {
    const list = [
      makeConversation({
        otherParticipant: undefined,
        buyer: undefined,
        seller: { id: 4, name: "Rahim Wali", city: null },
      }),
    ];
    expect(filterConversations(list, "rahim")).toHaveLength(1);
  });
});

describe("filterConversations — listing title match", () => {
  it("matches by listing title", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "iPhone")).toHaveLength(1);
  });

  it("matches a partial listing title", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "Pro Max")).toHaveLength(1);
  });
});

describe("filterConversations — last message match", () => {
  it("matches by lastMessageBody", () => {
    const list = [makeConversation({ lastMessageBody: "Can we meet tomorrow at 5?" })];
    expect(filterConversations(list, "tomorrow")).toHaveLength(1);
  });
});

describe("filterConversations — case-insensitivity", () => {
  it("matches regardless of the term's case", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "IPHONE")).toHaveLength(1);
    expect(filterConversations(list, "iphone")).toHaveLength(1);
    expect(filterConversations(list, "IpHoNe")).toHaveLength(1);
  });

  it("matches regardless of the stored data's case", () => {
    const list = [makeConversation({ otherParticipant: { id: 2, name: "AHMAD KARIMI", city: null } })];
    expect(filterConversations(list, "ahmad")).toHaveLength(1);
  });
});

describe("filterConversations — blank term", () => {
  it("returns the full list unchanged for an empty string", () => {
    const list = [makeConversation(), makeConversation({ id: 2 })];
    expect(filterConversations(list, "")).toHaveLength(2);
  });

  it("returns the full list unchanged for a whitespace-only term", () => {
    const list = [makeConversation(), makeConversation({ id: 2 })];
    expect(filterConversations(list, "   ")).toHaveLength(2);
  });

  it("trims the term before matching (leading/trailing spaces ignored)", () => {
    const list = [makeConversation()];
    expect(filterConversations(list, "  iphone  ")).toHaveLength(1);
  });
});

describe("filterConversations — null-safety", () => {
  it("does not throw and excludes the row when listing is null and the term doesn't match the name/message", () => {
    const list = [
      makeConversation({ listing: null, lastMessageBody: null }),
    ];
    expect(() => filterConversations(list, "iphone")).not.toThrow();
    expect(filterConversations(list, "iphone")).toHaveLength(0);
  });

  it("still matches by name when listing and lastMessageBody are both null", () => {
    const list = [
      makeConversation({
        listing: null,
        lastMessageBody: null,
        otherParticipant: { id: 2, name: "Ahmad Karimi", city: null },
      }),
    ];
    expect(filterConversations(list, "ahmad")).toHaveLength(1);
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
    expect(() => filterConversations(list, "anything")).not.toThrow();
    expect(filterConversations(list, "anything")).toHaveLength(0);
  });

  it("returns an empty array (not throw) when given an empty conversations array", () => {
    expect(filterConversations([], "term")).toEqual([]);
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
    const result = filterConversations(list, "ahmad");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
