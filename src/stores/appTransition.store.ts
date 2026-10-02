import { create } from "zustand";

/**
 * App-wide changes (language, theme, …) go through ONE path so they all feel
 * the same: the tap is acknowledged at once by a full-screen overlay, the work
 * runs behind it, and a second tap cannot start a second change.
 *
 * Before (owner report, 2026-10-02): a language or theme tap showed nothing
 * while the app persisted, synced the server and restarted, so the user tapped
 * again, and the app then restarted under them. The grid/list toggle had the
 * same "dead tap" problem and is fixed in ListingFeed (no work in the tap).
 *
 * Rendered by <AppTransitionOverlay /> in app/_layout.tsx.
 */
interface AppTransitionState {
  /** Message on the overlay; null when no change is running. */
  message: string | null;
}

export const useAppTransitionStore = create<AppTransitionState>(() => ({ message: null }));

/** Lets the overlay paint before heavy work (or a restart) begins. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 30));
  });
}

/**
 * Show `message`, run `work`, hide again. Returns false (and does nothing) if a
 * change is already running. When `work` restarts the app the overlay simply
 * stays until the new JS context replaces it; when it does not (Expo Go, or a
 * change that applies live) it is hidden after `work` settles.
 */
export async function runAppTransition(
  message: string,
  work: () => Promise<unknown> | unknown
): Promise<boolean> {
  if (useAppTransitionStore.getState().message !== null) return false;
  useAppTransitionStore.setState({ message });
  try {
    await nextPaint();
    await work();
  } finally {
    useAppTransitionStore.setState({ message: null });
  }
  return true;
}
