/**
 * groupMessagesByDay — Jest unit tests (TASK-D428).
 *
 * Covers buildThreadRows: empty list, single day, day change, unread larger
 * than the loaded page, and unread 0 — plus classifyDay and threadRowKey.
 *
 * NOTE: all fixture timestamps deliberately omit a "Z"/offset suffix so they
 * parse as LOCAL time (per the Date Time String spec) — the same local zone
 * `buildThreadRows`'s calendar-day bucketing uses internally. This keeps the
 * tests deterministic across CI runners in any timezone; a "Z"-suffixed UTC
 * timestamp near a local midnight could otherwise flip which calendar day it
 * lands on depending on the runner's TZ.
 */
import { buildThreadRows, classifyDay, threadRowKey, type ThreadRow } from "../groupMessagesByDay";
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
    expect(buildThreadRows([], 0)).toEqual([]);
  });

  it("returns an empty array for no messages even when unreadCount > 0", () => {
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
    const rows = buildThreadRows(messages, 0);
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
    const rows = buildThreadRows(messages, 0);
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
    const rows = buildThreadRows(messages, 0);
    expect(rows.filter((r) => r.type === "day")).toHaveLength(1);
  });
});

describe("buildThreadRows — unread divider placement", () => {
  it("inserts the unread row before the Nth-from-last incoming message", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 3, createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    // unreadCount = 2 → divider goes before the 2nd-from-last incoming message (id 2)
    const rows = buildThreadRows(messages, 2, 1 /* currentUserId */);
    expect(rows).toEqual([
      { type: "day", iso: "2026-06-15T09:00:00.000" },
      { type: "message", message: messages[0] },
      { type: "unread" },
      { type: "message", message: messages[1] },
      { type: "message", message: messages[2] },
    ]);
  });

  it("skips the viewer's own outgoing messages when locating the incoming boundary", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 1, name: "Me" } }), // mine
      makeMsg({ id: 3, createdAt: "2026-06-15T09:10:00.000", sender: { id: 2, name: "Seller" } }), // incoming
      makeMsg({ id: 4, createdAt: "2026-06-15T09:15:00.000", sender: { id: 2, name: "Seller" } }), // incoming
    ];
    // 1 unread incoming message → divider precedes the last incoming message (id 4)
    const rows = buildThreadRows(messages, 1, 1);
    const unreadIndex = rows.findIndex((r) => r.type === "unread");
    const nextRow = rows[unreadIndex + 1];
    expect(nextRow).toEqual({ type: "message", message: messages[3] });
  });

  it("emits only a single unread row even across a day boundary", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-14T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    const rows = buildThreadRows(messages, 5, 1);
    expect(rows.filter((r) => r.type === "unread")).toHaveLength(1);
  });
});

describe("buildThreadRows — unread larger than the loaded page", () => {
  it("clamps to the first incoming message in the loaded page when unreadCount exceeds it", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000", sender: { id: 2, name: "Seller" } }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000", sender: { id: 2, name: "Seller" } }),
    ];
    // Backend says 50 unread, but only 2 incoming messages are loaded.
    const rows = buildThreadRows(messages, 50, 1);
    expect(rows[0]).toEqual({ type: "day", iso: "2026-06-15T09:00:00.000" });
    expect(rows[1]).toEqual({ type: "unread" });
    expect(rows[2]).toEqual({ type: "message", message: messages[0] });
  });

  it("without a currentUserId, treats all loaded messages as candidates and clamps the same way", () => {
    const messages = [
      makeMsg({ id: 1, createdAt: "2026-06-15T09:00:00.000" }),
      makeMsg({ id: 2, createdAt: "2026-06-15T09:05:00.000" }),
    ];
    const rows = buildThreadRows(messages, 999);
    expect(rows.filter((r) => r.type === "unread")).toHaveLength(1);
    const unreadIndex = rows.findIndex((r) => r.type === "unread");
    expect(rows[unreadIndex + 1]).toEqual({ type: "message", message: messages[0] });
  });
});

describe("buildThreadRows — unread 0", () => {
  it("never emits an unread row when unreadCount is 0", () => {
    const messages = [makeMsg({ id: 1 }), makeMsg({ id: 2 })];
    const rows = buildThreadRows(messages, 0, 1);
    expect(rows.some((r) => r.type === "unread")).toBe(false);
  });

  it("never emits an unread row when unreadCount is negative", () => {
    const messages = [makeMsg({ id: 1 })];
    const rows = buildThreadRows(messages, -3, 1);
    expect(rows.some((r) => r.type === "unread")).toBe(false);
  });

  it("emits no unread row when every message was sent by the current user (no incoming candidates)", () => {
    const messages = [
      makeMsg({ id: 1, sender: { id: 1, name: "Me" } }),
      makeMsg({ id: 2, sender: { id: 1, name: "Me" } }),
    ];
    const rows = buildThreadRows(messages, 3, 1);
    expect(rows.some((r) => r.type === "unread")).toBe(false);
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
