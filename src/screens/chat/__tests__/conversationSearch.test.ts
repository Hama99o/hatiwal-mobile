/**
 * Unit tests for the conversation search feature:
 *   - filterMessages: filters a message list by keyword (client-side, text kind only)
 *   - splitHighlight: splits a string into matched / unmatched segments for rendering
 *
 * These functions are pure utilities extracted from the search logic inside
 * Conversation.tsx and MessageBubble.tsx so they can be tested without a React
 * renderer or any RN mocks.
 */

import type { Message } from "@/api/conversations";

// ── Pure helpers (mirrors the logic in Conversation.tsx / MessageBubble.tsx) ──

/**
 * Returns only text messages whose body contains `query` (case-insensitive).
 * Non-text kinds (meetup_proposal, offer, system, document …) are excluded from
 * search results but kept in the full list for outcome lookups.
 */
function filterMessages(messages: Message[], query: string): Message[] {
  const q = query.trim().toLowerCase();
  if (!q) return messages;
  return messages.filter(
    (m) => m.kind === "text" && m.body.toLowerCase().includes(q)
  );
}

/**
 * Splits `text` into alternating non-match / match segments.
 * Each segment is `{ text: string; isMatch: boolean }`.
 * Used to render highlighted spans in MessageBubble.
 */
function splitHighlight(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  // Trim first so that leading/trailing whitespace in the query never causes a
  // mismatch between what filterMessages selected (uses .trim()) and what we
  // highlight here.  Mirrors the production fix in MessageBubble.tsx.
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [{ text, isMatch: false }];

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === trimmedQuery.toLowerCase(),
    }));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMessage(
  id: number,
  body: string,
  kind: Message["kind"] = "text"
): Message {
  return {
    id,
    body,
    kind,
    readAt: null,
    createdAt: new Date().toISOString(),
    sender: { id: 1, name: "Alice" },
  };
}

const MESSAGES: Message[] = [
  makeMessage(1, "Hi, is this still available?"),
  makeMessage(2, "Yes, it is! The price is 5000 AFN."),
  makeMessage(3, "Can we meet at the bazaar tomorrow?"),
  makeMessage(4, "Sure, how about 3pm at Shahr-e-Naw market?"),
  makeMessage(5, "Meetup Proposal", "meetup_proposal"),
  makeMessage(6, "5000 AFN offer", "offer"),
  makeMessage(7, "System: conversation started", "system"),
  makeMessage(8, "file.pdf", "document"),
];

// ── filterMessages ────────────────────────────────────────────────────────────

describe("filterMessages", () => {
  it("returns all messages when query is empty string", () => {
    expect(filterMessages(MESSAGES, "")).toHaveLength(MESSAGES.length);
  });

  it("returns all messages when query is only whitespace", () => {
    expect(filterMessages(MESSAGES, "   ")).toHaveLength(MESSAGES.length);
  });

  it("filters by exact substring (case-insensitive)", () => {
    const results = filterMessages(MESSAGES, "AFN");
    // Only text messages whose body contains "AFN" — message 2 matches
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(2);
  });

  it("is case-insensitive", () => {
    const lower = filterMessages(MESSAGES, "afn");
    const upper = filterMessages(MESSAGES, "AFN");
    expect(lower).toEqual(upper);
  });

  it("matches multiple messages", () => {
    const results = filterMessages(MESSAGES, "at");
    // "Can we meet AT the bazaar" and "...at Shahr-e-Naw market"
    const ids = results.map((m) => m.id);
    expect(ids).toContain(3);
    expect(ids).toContain(4);
  });

  it("excludes non-text message kinds from results", () => {
    // meetup_proposal, offer, system, document — none should appear even if body matches
    const results = filterMessages(MESSAGES, "meetup");
    expect(results).toHaveLength(0);

    const offerResults = filterMessages(MESSAGES, "offer");
    expect(offerResults).toHaveLength(0);

    const systemResults = filterMessages(MESSAGES, "system");
    expect(systemResults).toHaveLength(0);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterMessages(MESSAGES, "xyz_no_match_xyz")).toHaveLength(0);
  });

  it("handles an empty message list", () => {
    expect(filterMessages([], "price")).toHaveLength(0);
  });

  it("matches partial word", () => {
    const results = filterMessages(MESSAGES, "avail");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
  });
});

// ── splitHighlight ────────────────────────────────────────────────────────────

describe("splitHighlight", () => {
  it("returns single non-match segment when query is empty", () => {
    const parts = splitHighlight("Hello world", "");
    expect(parts).toEqual([{ text: "Hello world", isMatch: false }]);
  });

  it("returns single non-match segment when query is whitespace only", () => {
    const parts = splitHighlight("Hello world", "   ");
    expect(parts).toEqual([{ text: "Hello world", isMatch: false }]);
  });

  // Regression: untrimmed query (leading/trailing whitespace) must still highlight.
  // Before the fix, the regex was built from the un-trimmed string so "  price  "
  // never matched "price" inside a sentence.
  it("highlights correctly when query has leading and trailing whitespace", () => {
    const parts = splitHighlight("The price is fair", "  price  ");
    const matchPart = parts.find((p) => p.isMatch);
    expect(matchPart).toBeDefined();
    expect(matchPart?.text.toLowerCase()).toBe("price");
    // Non-match segments must not be tagged as matches
    parts
      .filter((p) => !p.isMatch)
      .forEach((p) => {
        expect(p.text.toLowerCase()).not.toBe("price");
      });
  });

  it("marks a match at the start of the string", () => {
    const parts = splitHighlight("price is 5000 AFN", "price");
    expect(parts[0]).toEqual({ text: "price", isMatch: true });
    expect(parts[1]).toEqual({ text: " is 5000 AFN", isMatch: false });
  });

  it("marks a match in the middle of the string", () => {
    const parts = splitHighlight("The price is fair", "price");
    expect(parts).toContainEqual({ text: "price", isMatch: true });
    expect(parts).toContainEqual({ text: "The ", isMatch: false });
    expect(parts).toContainEqual({ text: " is fair", isMatch: false });
  });

  it("marks a match at the end of the string", () => {
    const parts = splitHighlight("Total is 5000 AFN", "AFN");
    const last = parts[parts.length - 1];
    expect(last).toEqual({ text: "AFN", isMatch: true });
  });

  it("is case-insensitive — preserves original case in match segment", () => {
    const parts = splitHighlight("Available NOW", "now");
    const match = parts.find((p) => p.isMatch);
    // Original casing is preserved even though query was lowercase
    expect(match).toEqual({ text: "NOW", isMatch: true });
  });

  it("handles multiple occurrences", () => {
    const parts = splitHighlight("buy buy buy", "buy");
    const matches = parts.filter((p) => p.isMatch);
    expect(matches).toHaveLength(3);
  });

  it("handles regex special characters in query without throwing", () => {
    // Period, asterisk, brackets — must be escaped so no regex error
    expect(() => splitHighlight("price is 5.000 AFN", "5.000")).not.toThrow();
    const parts = splitHighlight("price is 5.000 AFN", "5.000");
    expect(parts).toContainEqual({ text: "5.000", isMatch: true });
  });

  it("returns no matches when query is not found", () => {
    const parts = splitHighlight("Hello world", "xyz");
    expect(parts).toEqual([{ text: "Hello world", isMatch: false }]);
  });

  it("handles an empty input string", () => {
    const parts = splitHighlight("", "query");
    expect(parts).toEqual([]);
  });

  it("handles query equal to entire string", () => {
    const parts = splitHighlight("exact", "exact");
    expect(parts).toEqual([{ text: "exact", isMatch: true }]);
  });
});

// ── Integration: filter then highlight ───────────────────────────────────────

describe("filter + highlight integration", () => {
  it("filtered messages can all be highlighted without error", () => {
    const query = "price";
    const filtered = filterMessages(MESSAGES, query);
    // Every filtered message body must produce at least one matching highlight segment
    filtered.forEach((msg) => {
      const parts = splitHighlight(msg.body, query);
      const hasMatch = parts.some((p) => p.isMatch);
      expect(hasMatch).toBe(true);
    });
  });

  it("match count equals number of filtered text messages", () => {
    const query = "market";
    const filtered = filterMessages(MESSAGES, query);
    // matchCount shown in the search bar suffix = filtered.length
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((m) => {
      expect(m.kind).toBe("text");
    });
  });

  // Regression: when the user types "  price  " (with padding) filterMessages
  // trims and returns results, then splitHighlight must also trim so that those
  // results actually render highlights.
  it("untrimmed query: filter finds messages AND highlight marks them correctly", () => {
    const paddedQuery = "  price  ";
    const filtered = filterMessages(MESSAGES, paddedQuery);
    // filterMessages trims internally — should still find message 2
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach((msg) => {
      const parts = splitHighlight(msg.body, paddedQuery);
      const hasMatch = parts.some((p) => p.isMatch);
      expect(hasMatch).toBe(true);
    });
  });
});
