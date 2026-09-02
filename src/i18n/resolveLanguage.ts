/**
 * Who wins when the locally chosen language and the backend's stored
 * `preferredLanguage` disagree?
 *
 * The local choice does. Extracted as a pure function because getting this
 * backwards produced the owner's report of 2026-09-02: "when I change the lang
 * it reload like 2 time or 3 time sometime and it stay in same lang… when I do
 * again then it work".
 *
 * The old sequence:
 *   1. setLanguage() persisted the new language locally, fired
 *      `updateMe({ preferredLanguage })` WITHOUT awaiting it, and restarted the
 *      app immediately — killing the in-flight request, so the server kept the
 *      OLD value.
 *   2. On the next launch auth.bootstrap validated the token and called
 *      applyLanguageFromUser(user.preferredLanguage) — the stale OLD value —
 *      which overwrote local storage with it.
 *   3. Because the direction flipped again, that triggered ANOTHER restart, and
 *      the user landed back in the language they had just left.
 *
 * That is also why it hit Pashto and Dari hardest: only an LTR<->RTL change
 * forces the extra restart, so on English the revert was quieter.
 *
 * The rule below makes the round trip safe even with no network at all: an
 * explicit local choice is never overwritten by the server, and the server is
 * corrected toward it instead.
 */
export type ResolvedLanguage<T extends string = string> = {
  /** Language to apply now, or null to leave the current one alone. */
  apply: T | null;
  /** Language to PATCH back to the server, or null if it is already in step. */
  pushToBackend: T | null;
};

export function resolveLanguageFromUser<T extends string>(
  stored: T | null | undefined,
  fromUser: T | null | undefined
): ResolvedLanguage<T> {
  // A local choice exists: it wins, always.
  if (stored) {
    // The server disagrees — correct the SERVER, not the user.
    if (fromUser && fromUser !== stored) return { apply: null, pushToBackend: stored };
    return { apply: null, pushToBackend: null };
  }
  // No local choice (fresh install, or just after logout cleared it): the
  // server's preference is the best seed available.
  if (fromUser) return { apply: fromUser, pushToBackend: null };
  return { apply: null, pushToBackend: null };
}
