/**
 * Unread message total for the chat tab badge.
 *
 * Sourced from `["me"]`, deliberately NOT from the inbox list.
 *
 * The badge used to read `chat.store`'s `unreadMessageTotal`, which is synced in
 * Conversations.tsx from page 1 of the unfiltered inbox. That sync is careful and
 * correct, but it only runs once the user has OPENED Chats — so the badge appeared
 * only after they had already found the messages, which is the one moment a badge is
 * no longer useful. `["me"]` carries `unreadMessageCount` and is fetched wherever the
 * tab bar lives, which is why the Profile screen's "Messages 7" was right while the
 * tab showed nothing.
 *
 * Shares the `["me"]` cache entry with Profile and EditProfile, so this adds no
 * request of its own — React Query dedupes by key.
 *
 * `refetchInterval` exists because the MVP ships without push delivery: nothing else
 * tells the app a message arrived while it sits open, and the QueryClient's 5-minute
 * staleTime would otherwise leave the badge behind. 60s is a compromise between a
 * badge that feels live and a request every few seconds on a phone that may be on
 * mobile data. Reads invalidate `["me"]` directly, so clearing the badge does not wait
 * for the interval.
 */
import { useQuery } from "@tanstack/react-query";

import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";

/** Poll cadence while the app is open. No push delivery in the MVP. */
export const UNREAD_POLL_MS = 60_000;

export function useUnreadMessageCount(): number {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: authAPI.me,
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? UNREAD_POLL_MS : false,
  });

  return data?.unreadMessageCount ?? 0;
}
