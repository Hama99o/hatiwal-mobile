import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Remember where the user was, so a forced restart puts them back.
 *
 * WHY. Switching between an LTR and an RTL language has to restart the app:
 * `I18nManager.forceRTL()` only takes effect on the next launch, on iOS as much
 * as on Android. A restart cold-starts at the initial route, so the user was
 * dropped back to the feed from wherever they had been — reported as "it should
 * not leave the page, only the language should change".
 *
 * The restart itself cannot be avoided without dropping native RTL for manual
 * mirroring app-wide. Coming back to the same screen can, and that is what this
 * does: the current path is kept in memory as the user navigates, written to
 * storage just before the restart, and consumed once on the way back up.
 */
const STORAGE_KEY = "restore-route";

/** Only routes inside the app shell. A saved auth route would fight bootstrap. */
const RESTORABLE = /^\/\(main\)/;

let current: string | null = null;

/** Called as the user navigates; cheap, in-memory only. */
export function rememberRoute(path: string | null): void {
  if (path) current = path;
}

/**
 * Persist the current route for the restart that is about to happen.
 *
 * Awaited by the caller BEFORE restarting — a fire-and-forget write races the
 * process going away, and losing it silently is exactly the bug this fixes.
 */
export async function saveRouteForRestart(): Promise<void> {
  if (!current || !RESTORABLE.test(current)) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, current);
  } catch {
    // Not fatal: the app still restarts, it just lands on the default route.
  }
}

/**
 * Read and CLEAR the saved route. Cleared even on a failed restore, so a stale
 * entry cannot hijack a later, unrelated launch.
 */
export async function consumeSavedRoute(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) await AsyncStorage.removeItem(STORAGE_KEY);
    return saved && RESTORABLE.test(saved) ? saved : null;
  } catch {
    return null;
  }
}
