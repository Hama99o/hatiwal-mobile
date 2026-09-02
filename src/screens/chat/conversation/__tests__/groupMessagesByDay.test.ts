/**
 * groupMessagesByDay — Jest unit tests (TASK-D428).
 *
 * Covers `resolveUnreadBoundaryId` + `buildThreadRows` (the DR-BLOCKER split
 * of the old single-function API): empty list, single day, day change,
 * unread larger than the loaded page, unread 0, non-renderable (response)
 * kinds being excluded from day/unread bookkeeping, and the divider staying
 * fixed on its resolved id even as the message list grows — plus
 * `classifyDay` and `threadRowKey`.
 *
 * NOTE: all fixture timestamps deliberately omit a "Z"/offset suffix so they
 * parse as LOCAL time (per the Date Time String spec) — the same local zone
 * `buildThreadRows`'s calendar-day bucketing uses internally. This keeps the
 * tests deterministic across CI runners in any timezone; a "Z"-suffixed UTC
 * timestamp near a local midnight could otherwise flip which calendar day it
 * lands on depending on the runner's TZ.
 */
import {
  buildThreadRows,
  classifyDay,
  resolveUnreadBoundaryId,
  threadRowKey,
  type ThreadRow,
} from "../groupMessagesByDay";
import type { Message } from "@/api/conversations";

function makeMsg(overrides: Partial<Message>): Message {
  return {
    id: 1,
    body: "Hello",
    kind: "text",
    readAt: null,
    createdAt: "2026-06-15T09:00:00.000",
    sender: { id: 2, name: "Seller" },
    ...overrides,
  };
}

describe("buildThreadRows — empty list", () => {
  it("returns an empty array for no messages", () => {
    expect(buildThreadRows([], null)).toEqual([]);
  });

  it("returns an empty array for no messages even with a boundary id set", () => {
    expect(buildThreadRows([], 5)).toEqual([]);
  });
});

describe("buildThreadRows — single day", () => {
  it("emits exactly one day row before the first message, no more", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000" }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000" }),
      makeMsg({ id: 3, createdAt: "2026-06-15T18:30:00.000" }),
    ];
    const rows = buildThreadRows(messages, null);
    expect(rows).toEqual([
      { type: "day", iso: "2026-06-15T09:00:00.000" },
      { type: "message", message: messages[0] },
      { type: "message", message: messages[1] },
      { type: "message", message: messages[2] },
    ]);
  });
});

describe("buildThreadRows — day change", () => {
  it("emits a new day row whenever the calendar day changes", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-14T09:00:00.000" }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000" }),
      makeMsg({ id: 3, createdAt: "2026-06-15T18:30:00.000" }),
      makeMsg({ id: 4, createdAt: "2026-06-17T08:00:00.000" }),
    ];
    const rows = buildThreadRows(messages, null);
    const dayRows = rows.filter((r): r is { type: "day"; iso: string } => r.type === "day");
    expect(dayRows).toHaveLength(3);
    expect(rows.map((r) => r.type)).toEqual([
      "day", "message",
      "day", "message", "message",
      "day", "message",
    ]);
  });

  it("does not emit a day row for messages within the same local calendar day, even hours apart", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T00:05:00.000" }),
      makeMsg({ id: 2, createdAt: "2026-06-15T23:55:00.000" }),
    ];
    const rows = buildThreadRows(messages, null);
    expect(rows.filter((r) => r.type === "day")).toHaveLength(1);
  });
});

describe("buildThreadRows — non-renderable (response) kinds are excluded", () => {
  it("never emits a row for meetup_accepted/meetup_declined/offer_accepted/offer_declined", () => {
    const messages = [
      makeMsg({ id: 1, kind: "meetup_proposal", createdAt: "2026-06-15T09:00:00.000" }),
      makeMsg({ id: 2, kind: "meetup_accepted", createdAt: "2026-06-15T09:05:00.000", respondsToId: 1 }),
      makeMsg({ id: 3, kind: "offer", createdAt: "2026-06-15T09:10:00.000" }),
      makeMsg({ id: 4, kind: "offer_declined", createdAt: "2026-06-15T09:15:00.000", respondsToId: 3 }),
    ];
    const rows = buildThreadRows(messages, null);
    const messageRows = rows.filter((r): r is { type: "message"; message: Message } => r.type === "message");
    expect(messageRows.map((r) => r.message.id)).toEqual([1, 3]);
  });

  it("does not let an invisible response message on a later day conjure an extra day separator", () => {
    const messages = [
      makeMsg({ id: 1, kind: "offer", createdAt: "2026-06-15T09:00:00.000" }),
      // Invisible response, one calendar day later — must not produce its own
      // day row (there is no visible bubble under it to anchor one).
      makeMsg({ id: 2, kind: "offer_accepted", createdAt: "2026-06-16T09:00:00.000", respondsToId: 1 }),
    ];
    const rows = buildThreadRows(messages, null);
    expect(rows).toEqual([
      { type: "day", iso: "2026-06-15T09:00:00.000" },
      { type: "message", message: messages[0] },
    ]);
  });
});

describe("resolveUnreadBoundaryId — placement", () => {
  it("resolves the id of the Nth-from-last incoming message", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 3, createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    // unreadCount = 2 → boundary is the 2nd-from-last incoming message (id 2)
    expect(resolveUnreadBoundaryId(messages, 2, 1 /* currentUserId */)).toBe(2);
  });

  it("skips the viewer's own outgoing messages when locating the incoming boundary", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 1, name: "Me" } }), // mine
      makeMsg({ id: 3, createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }), // incoming
      makeMsg({ id: 4, createdAt: "2026-06-15T09:15:00.000", sender: { id: 2, name: "Seller" } }), // incoming
    ];
    // 1 unread incoming message → boundary is the last incoming message (id 4)
    expect(resolveUnreadBoundaryId(messages, 1, 1)).toBe(4);
  });

  it("ignores non-renderable response kinds as boundary candidates", () => {
    const messages = [
      makeMsg({ id: 1, kind: "offer", createdAt: "2026-06-15T09:00:00.000", sender: { id: 1, name: "Me" } }),
      // Incoming but invisible — must never be picked as the boundary, since
      // it renders no bubble to anchor a divider above.
      makeMsg({ id: 2, kind: "offer_accepted", createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" }, respondsToId: 1 }),
      makeMsg({ id: 3, kind: "text", createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    expect(resolveUnreadBoundaryId(messages, 1, 1)).toBe(3);
  });
});

describe("resolveUnreadBoundaryId + buildThreadRows — divider stays fixed as the thread grows", () => {
  it("does not move the divider when new incoming messages arrive after the boundary was resolved", () => {
    const initialMessages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    // Resolved ONCE, e.g. right after the initial load, before markRead.
    const boundaryId = resolveUnreadBoundaryId(initialMessages, 1, 1);
    expect(boundaryId).toBe(2);

    // A live conversation keeps growing — a new incoming message arrives
    // (e.g. a poll/refresh) while the thread stays open.
    const grownMessages = [
      ...initialMessages,
      makeMsg({ id: 3, createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }),
    ];

    // DR BLOCKER regression guard: re-deriving the boundary from the OLD
    // count-based API against the grown list would have picked message 3
    // instead of 2 — the divider would have visibly slid down. Passing the
    // already-resolved id keeps it pinned to message 2.
    const rows = buildThreadRows(grownMessages, boundaryId);
    const unreadIndex = rows.findIndex((r) => r.type === "unread");
    expect(rows[unreadIndex + 1]).toEqual({ type: "message", message: grownMessages[1] });
  });
});

describe("resolveUnreadBoundaryId — unread larger than the loaded page", () => {
  it("clamps to the first incoming message in the loaded page when unreadCount exceeds it", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    // Backend says 50 unread, but only 2 incoming messages are loaded.
    const boundaryId = resolveUnreadBoundaryId(messages, 50, 1);
    expect(boundaryId).toBe(1);

    const rows = buildThreadRows(messages, boundaryId);
    expect(rows[0]).toEqual({ type: "day", iso: "2026-06-15T09:00:00.000" });
    expect(rows[1]).toEqual({ type: "unread" });
    expect(rows[2]).toEqual({ type: "message", message: messages[0] });
  });

  it("without a currentUserId, treats all loaded messages as candidates and clamps the same way", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000" }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000" }),
    ];
    const boundaryId = resolveUnreadBoundaryId(messages, 999);
    const rows = buildThreadRows(messages, boundaryId);
    expect(rows.filter((r) => r.type === "unread")).toHaveLength(1);
    const unreadIndex = rows.findIndex((r) => r.type === "unread");
    expect(rows[unreadIndex + 1]).toEqual({ type: "message", message: messages[0] });
  });
});

describe("resolveUnreadBoundaryId — unread 0", () => {
  it("returns null when unreadCount is 0, and buildThreadRows emits no unread row", () => {
    const messages = [makeMsg({ id: 1 }), makeMsg({ id: 2 })];
    const boundaryId = resolveUnreadBoundaryId(messages, 0, 1);
    expect(boundaryId).toBeNull();
    expect(buildThreadRows(messages, boundaryId).some((r) => r.type === "unread")).toBe(false);
  });

  it("returns null when unreadCount is negative", () => {
    const messages = [makeMsg({ id: 1 })];
    expect(resolveUnreadBoundaryId(messages, -3, 1)).toBeNull();
  });

  it("returns null when every message was sent by the current user (no incoming candidates)", () => {
    const messages = [
      makeMsg({ id: 1, sender: { id: 1, name: "Me" } }),
      makeMsg({ id: 2, sender: { id: 1, name: "Me" } }),
    ];
    expect(resolveUnreadBoundaryId(messages, 3, 1)).toBeNull();
  });

  it("buildThreadRows emits no unread row when unreadBoundaryId is null", () => {
    const messages = [makeMsg({ id: 1 }), makeMsg({ id: 2 })];
    expect(buildThreadRows(messages, null).some((r) => r.type === "unread")).toBe(false);
  });
});

describe("buildThreadRows — unread boundary across a day change", () => {
  it("emits only a single unread row even across a day boundary", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-14T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    const boundaryId = resolveUnreadBoundaryId(messages, 5, 1);
    const rows = buildThreadRows(messages, boundaryId);
    expect(rows.filter((r) => r.type === "unread")).toHaveLength(1);
  });
});

describe("classifyDay", () => {
  const now = new Date("2026-06-15T12:00:00.000");

  it("classifies the same calendar day as 'today'", () => {
    expect(classifyDay("2026-06-15T00:05:00.000", now)).toBe("today");
  });

  it("classifies the previous calendar day as 'yesterday'", () => {
    expect(classifyDay("2026-06-14T23:55:00.000", now)).toBe("yesterday");
  });

  it("classifies anything older as 'older'", () => {
    expect(classifyDay("2026-06-01T09:00:00.000", now)).toBe("older");
  });
});

describe("threadRowKey", () => {
  it("returns 'msg-<id>' for a message row", () => {
    const row: ThreadRow = { type: "message", message: makeMsg({ id: 42 }) };
    expect(threadRowKey(row)).toBe("msg-42");
  });

  it("returns 'day-<iso>' for a day row", () => {
    const row: ThreadRow = { type: "day", iso: "2026-06-15T09:00:00.000" };
    expect(threadRowKey(row)).toBe("day-2026-06-15T09:00:00.000");
  });

  it("returns 'unread' for an unread row", () => {
    expect(threadRowKey({ type: "unread" })).toBe("unread");
  });
});

// ── The re-entry case (device finding, 2026-09-02) ────────────────────────
//
// chat/mark_read_end_to_end opens a thread, goes back, marks it unread, then
// re-enters — and saw NO divider. The resolver was never the problem (these
// cases prove it), so the bug was upstream: Conversation.tsx captured the
// boundary once per component LIFETIME, and expo-router keeps the screen
// mounted, so the re-entry reused the first visit's answer (nothing unread).
// The capture now re-arms when the screen loses focus.
describe("resolveUnreadBoundaryId — a single trailing unread message", () => {
  const mk = (id: number, senderId: number) => ({
    id,
    kind: "text" as const,
    body: `m${id}`,
    sender: { id: senderId },
    createdAt: new Date(2026, 0, 1, 10, id).toISOString(),
  });

  it("marks the LAST message when it is the only unread one", () => {
    // The exact seeded shape: one outbound, then one inbound left unread.
    const messages = [mk(1, 7), mk(2, 9)] as never[];
    expect(resolveUnreadBoundaryId(messages, 1, 7)).toBe(2);
  });

  it("returns null when nothing is unread, however the thread looks", () => {
    const messages = [mk(1, 7), mk(2, 9)] as never[];
    expect(resolveUnreadBoundaryId(messages, 0, 7)).toBeNull();
  });

  it("ignores the viewer's OWN messages when counting back", () => {
    // 3 unread but only 2 incoming — must not run off the start of the list.
    const messages = [mk(1, 9), mk(2, 7), mk(3, 9)] as never[];
    expect(resolveUnreadBoundaryId(messages, 3, 7)).toBe(1);
  });
});
