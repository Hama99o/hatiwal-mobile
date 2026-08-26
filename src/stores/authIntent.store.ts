/**
 * authIntent — the thing a guest was trying to do before we sent them to login.
 *
 * `useRequireAuth` used to redirect with only a `returnTo`, which restores the
 * ROUTE and nothing else: a guest tapped the heart, signed in, landed back on the
 * listing, and it was not saved. Nothing told them their tap had been dropped
 * (UI-044). Same for "Make an Offer" and "Contact seller", where the intent
 * carries more weight than a save.
 *
 * A KEY is stored, never a callback. The screen that raised the intent unmounts
 * during the login trip, so any captured closure would reference dead state; the
 * screen re-declares its handlers on the way back and looks its intent up by key.
 *
 * Deliberately in memory only — no persistence. A pending intent should not
 * survive an app restart and fire at a moment the user has forgotten about, which
 * is exactly the surprise the `returnTo` param already risks on a reload.
 *
 * `consume` is single-shot: it clears as it reads, so a re-render, a remount or a
 * second screen listening on the same route cannot replay the action twice. That
 * matters most for `save`, which is a toggle — replaying it twice would UNDO it.
 */
import { create } from "zustand";

export interface PendingAuthIntent {
  /** Route the guest was on, e.g. `/(main)/listing/42`. Must match to replay. */
  returnTo: string;
  /** What they were trying to do. Screens map this to their own handler. */
  key: string;
}

interface AuthIntentState {
  pending: PendingAuthIntent | null;
  /** Remember an intent while the guest goes to log in. */
  remember: (intent: PendingAuthIntent) => void;
  /**
   * Take the intent for `returnTo` if there is one, clearing it in the same call.
   * Returns the key, or null when nothing was pending for this route.
   */
  consume: (returnTo: string) => string | null;
  /** Drop anything pending — call on logout so it cannot fire for the next user. */
  clear: () => void;
}

export const useAuthIntentStore = create<AuthIntentState>((set, get) => ({
  pending: null,

  remember: (intent) => set({ pending: intent }),

  consume: (returnTo) => {
    const pending = get().pending;
    if (!pending || pending.returnTo !== returnTo) return null;
    set({ pending: null });
    return pending.key;
  },

  clear: () => set({ pending: null }),
}));

/** Intent keys used by listing detail. Kept here so screen and test agree. */
export const AUTH_INTENT = {
  save: "listing:save",
  offer: "listing:offer",
  message: "listing:message",
  report: "listing:report",
  revealPhone: "listing:revealPhone",
} as const;
