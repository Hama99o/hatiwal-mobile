/**
 * groupMessagesByDay — pure helpers for building the message-thread row list
 * consumed by Conversation.tsx's FlatList: day separators + a single
 * "unread messages" divider, interleaved with the raw message rows.
 *
 * No React, no I/O — safe to unit test in isolation (TASK-D428).
 *
 * Review fix (DR BLOCKER): the divider used to be re-derived on every call
 * from a live `unreadCount` + the CURRENT message list — "the Nth-from-last
 * incoming message" is a moving target once N is fixed but the list keeps
 * growing (a poll/refresh appending new incoming messages during a live
 * conversation shifts which message is "Nth from last"), so the divider
 * visibly slid down the thread while it was open. The fix splits the old
 * single function in two: `resolveUnreadBoundaryId` is called EXACTLY ONCE
 * per screen visit (by `Conversation.tsx`, right after the first load and
 * before `markRead`) to freeze a concrete message id; `buildThreadRows` is
 * called on every render but only ever looks for that already-resolved id,
 * so the divider can never move again for the rest of the visit.
 */
import type { Message } from "@/api/conversations";
import { isRenderableInThread } from "./MessageBubble";

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
 * Resolves the id of the message the "unread messages" divider must land
 * immediately above, given `unreadCount` (from the conversation payload
 * captured BEFORE `markRead` fires) and the messages loaded at that same
 * moment. Call this exactly ONCE per screen visit — the caller is
 * responsible for freezing the result (e.g. in state) and never calling
 * this again for the lifetime of that visit; see the module doc above.
 *
 * - Only messages `isRenderableInThread` counts as candidates — a hidden
 *   `offer_accepted`/`offer_declined`/`meetup_accepted`/`meetup_declined`
 *   response never anchors the divider (CR HIGH): it has no bubble of its
 *   own to sit above.
 * - "Incoming" means sent by someone other than `currentUserId`. When
 *   `currentUserId` is omitted, every renderable loaded message is treated
 *   as a candidate (safe default — the caller simply didn't need
 *   direction-awareness).
 * - The divider anchors before the Nth-from-last incoming message, where
 *   N = min(unreadCount, number of incoming messages loaded). If
 *   `unreadCount` exceeds the number of incoming messages loaded (older
 *   unread messages haven't been paged in yet), it anchors above the very
 *   first incoming message in the loaded page — the best available
 *   approximation.
 * - Returns `null` when `unreadCount` is 0 or negative, or when there is no
 *   incoming message to anchor to.
 */
export function resolveUnreadBoundaryId(
  messages: Message[],
  unreadCount: number,
  currentUserId?: number | null
): number | null {
  if (unreadCount <= 0) return null;

  const renderable = messages.filter(isRenderableInThread);
  const incoming =
    currentUserId != null
      ? renderable.filter((m) => Number(m.sender.id) !== Number(currentUserId))
      : renderable;
  if (incoming.length === 0) return null;

  const n = Math.min(unreadCount, incoming.length);
  return incoming[incoming.length - n].id;
}

/**
 * Builds the ordered list of rows the conversation thread renders.
 *
 * - `messages` must already be in ascending (oldest → newest) order — the
 *   same order `Conversation.tsx` keeps in its `messages` state. Messages
 *   for which `isRenderableInThread` is false (their outcome is folded into
 *   another bubble — see `MessageBubble.tsx`) are dropped entirely: they
 *   never produce a `{ type: "message" }` row, never count toward a day
 *   change, and can never anchor the unread row (CR HIGH).
 * - A `{ type: "day" }` row is inserted whenever the calendar day of a
 *   (renderable) message's `createdAt` differs from the previous
 *   renderable message's day (including before the very first one, so a
 *   single-day thread still gets exactly one day row).
 * - `unreadBoundaryId` is an already-resolved message id (from
 *   `resolveUnreadBoundaryId`, called ONCE elsewhere) or `null` for "no
 *   divider this visit" (unread was 0, or the caller is suppressing it,
 *   e.g. while chat search is active). A single `{ type: "unread" }` row is
 *   inserted immediately before the message with that id, if it is still
 *   present among the renderable messages passed in; if it isn't (e.g. it
 *   scrolled out of a filtered set), no row is emitted.
 */
export function buildThreadRows(messages: Message[], unreadBoundaryId: number | null): ThreadRow[] {
  const renderable = messages.filter(isRenderableInThread);
  if (renderable.length === 0) return [];

  const rows: ThreadRow[] = [];
  let previousDayKey: string | null = null;
  let unreadEmitted = false;

  for (const message of renderable) {
    const dayKey = calendarDayKey(message.createdAt);
    if (dayKey !== previousDayKey) {
      rows.push({ type: "day", iso: message.createdAt });
      previousDayKey = dayKey;
    }
    if (!unreadEmitted && unreadBoundaryId !== null && message.id === unreadBoundaryId) {
      rows.push({ type: "unread" });
      unreadEmitted = true; // emit exactly once
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
 *
 * Callers that keep a rendered label around across a real midnight rollover
 * (e.g. `DaySeparator` for a thread left open) must re-invoke this with a
 * fresh `now` rather than caching its result (CR LOW).
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
