// src/hooks/useRequireAuth.ts
// Auth gate for guest browsing. Logged-out users can browse the feed and view
// listings, but actions that need an account (save, contact, offer, opening a
// gated tab) are wrapped with `requireAuth`: if signed in it runs immediately,
// otherwise the guest is sent to the login screen with a `returnTo` so they
// land back where they were after logging in.
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthIntentStore } from "@/stores/authIntent.store";

export function useRequireAuth() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  /**
   * Run `action` when signed in. Otherwise navigate to login, passing
   * `returnTo` (a route path) so the user returns there after authenticating.
   * Returns `true` when the action ran, `false` when the guest was redirected.
   */
  /**
   * Run `action` when signed in. Otherwise navigate to login, passing `returnTo`
   * (a route path) so the user returns there after authenticating.
   *
   * `intent` is what they were trying to DO. Without it `returnTo` restores the
   * route and drops the action, so a guest who tapped save landed back on the
   * listing with an unfilled heart and nothing to explain it (UI-044). Pass an
   * intent key and the destination screen replays it once on arrival.
   *
   * Only pass an intent for something safe to repeat unprompted. Opening a sheet
   * or toggling a save qualifies; anything that spends money or sends a message
   * on its own does not.
   *
   * Returns `true` when the action ran, `false` when the guest was redirected.
   */
  function requireAuth(
    action: () => void,
    returnTo?: string,
    intent?: string
  ): boolean {
    if (isAuthenticated) {
      action();
      return true;
    }
    if (returnTo && intent) {
      useAuthIntentStore.getState().remember({ returnTo, key: intent });
    }
    router.push({
      pathname: "/(auth)/login",
      params: returnTo ? { returnTo } : {},
    });
    return false;
  }

  return { requireAuth, isAuthenticated };
}
