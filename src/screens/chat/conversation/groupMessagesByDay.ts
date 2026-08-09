/**
 * groupMessagesByDay — pure helpers for building the message-thread row list
 * consumed by Conversation.tsx's FlatList: day separators + a single
 * "unread messages" divider, interleaved with the raw message rows.
 *
 * No React, no I/O — safe to unit test in isolation (TASK-D428).
 */
import type { Message } from "@/api/conversations";

export type ThreadRow =
  | { type: "message"; message: Message }
  | { type: "day"; iso: string }
  | { type: "unread" };

/**
 * Key identifying the LOCAL calendar day (device timezone) of `dateStr` —
 * used only to detect a day *change* between consecutive messages, never
 * shown to the user directly.
 */
function calendarDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Builds the ordered list of rows the conversation thread renders.
 *
 * - `messages` must already be in ascending (oldest → newest) order — the
 *   same order `Conversation.tsx` keeps in its `messages` state.
 * - A `{ type: "day" }` row is inserted whenever the calendar day of a
 *   message's `createdAt` differs from the previous message's day
 *   (including before the very first message, so a single-day thread still
 *   gets exactly one day row).
 * - When `unreadCount > 0`, a single `{ type: "unread" }` row is inserted
 *   immediately before the Nth-from-last incoming message, where
 *   N = min(unreadCount, number of incoming messages loaded). "Incoming"
 *   means sent by someone other than `currentUserId`. When `currentUserId`
 *   is omitted, every loaded message is treated as a candidate (safe
 *   default — the caller simply didn't need direction-awareness).
 * - If `unreadCount` is 0 (or negative) or there are no incoming messages
 *   to anchor to, no unread row is emitted.
 * - If `unreadCount` exceeds the number of incoming messages loaded (older
 *   unread messages haven't been paged in yet), the divider lands above
 *   the very first incoming message in the loaded page — the best
 *   available approximation.
 */
export function buildThreadRows(
  messages: Message[],
  unreadCount: number,
  currentUserId?: number | null
): ThreadRow[] {
  if (messages.length === 0) return [];

  // Find the message id the unread divider must precede, if any.
  let unreadBoundaryId: number | null = null;
  if (unreadCount > 0) {
    const incoming =
      currentUserId != null
        ? messages.filter((m) => Number(m.sender.id) !== Number(currentUserId))
        : messages;
    if (incoming.length > 0) {
      const n = Math.min(unreadCount, incoming.length);
      unreadBoundaryId = incoming[incoming.length - n].id;
    }
  }

  const rows: ThreadRow[] = [];
  let previousDayKey: string | null = null;

  for (const message of messages) {
    const dayKey = calendarDayKey(message.createdAt);
    if (dayKey !== previousDayKey) {
      rows.push({ type: "day", iso: message.createdAt });
      previousDayKey = dayKey;
    }
    if (unreadBoundaryId !== null && message.id === unreadBoundaryId) {
      rows.push({ type: "unread" });
      unreadBoundaryId = null; // emit exactly once
    }
    rows.push({ type: "message", message });
  }

  return rows;
}

/**
 * Classifies a day-row's ISO timestamp relative to `now` for DaySeparator's
 * label: "today" / "yesterday" / "older" (caller falls back to a
 * locale-formatted date for "older" via useLocalization().formatDate).
 * Pure — `now` is injectable for tests, defaults to `new Date()`.
 */
export function classifyDay(iso: string, now: Date = new Date()): "today" | "yesterday" | "older" {
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return "older";
}

/**
 * Stable FlatList key for a ThreadRow — `msg-<id>` / `day-<iso>` / `unread`.
 */
export function threadRowKey(row: ThreadRow): string {
  if (row.type === "message") return `msg-${row.message.id}`;
  if (row.type === "day") return `day-${row.iso}`;
  return "unread";
}
