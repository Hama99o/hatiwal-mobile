// src/stores/auth.bootstrap.ts
//
// Idempotent app-startup auth hydration.
//
// The auth store is in-memory, so `isAuthenticated` resets to false on every
// (web) reload. It MUST be re-hydrated from the stored DeviseTokenAuth token on
// startup — and on EVERY route, not just the splash screen. On web a user can
// reload directly onto a deep route (e.g. /browse) which never mounts Splash;
// without this global hydration the token is still attached to API requests
// (so data loads and the user *looks* logged in) but `isAuthenticated` stays
// false, so the account-only tabs (Profile/Saved/Chat) bounce them to login.
//
// Rules (a logged-in user must NEVER see the login screen until the session is
// actually removed):
//   1. If a token is stored, mark the session authenticated IMMEDIATELY — no
//      waiting on the network — so there is zero login flash on reload.
//   2. Validate the token in the background. Only a real 401 (token revoked /
//      expired) logs the user out. A network/server blip keeps the session.
//
// Call `bootstrapAuth()` from the root layout (covers deep-route reloads) and
// from Splash (which then routes). The work runs once — the promise is memoized.

import { authAPI } from "@/api/auth";
import { secureStorage } from "@/utils/secure-storage";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser } from "@/i18n";

let pending: Promise<void> | null = null;

/**
 * Restore the auth session from the stored token. Resolves as soon as the
 * optimistic state is set (fast — no network), so the UI can render with the
 * correct `isAuthenticated` without a login flash. Server validation continues
 * in the background. Safe to call multiple times — only the first does the work.
 */
export function bootstrapAuth(): Promise<void> {
  if (pending) return pending;

  pending = (async () => {
    try {
      const headers = await secureStorage.getAuthHeaders();

      // No stored token — genuine guest.
      if (!headers) {
        useAuthStore.getState().clearUser();
        return;
      }

      // Token present → optimistically authenticated so a logged-in user never
      // sees the login screen on reload. Profile/Saved/Chat fetch their own data.
      useAuthStore.getState().setAuthenticated(true);

      // Validate in the background; do NOT block render on it.
      authAPI
        .validateToken()
        .then((user) => {
          useAuthStore.getState().setUser(user);
          useModeStore.getState().hydrateFromUser(user.sellerMode);
          applyThemeFromUser(user.preferredTheme);
          applyLanguageFromUser(user.preferredLanguage);
        })
        .catch((err) => {
          // Only a definitive 401 means the token is dead — then truly log out.
          // Network errors / 5xx keep the optimistic session intact.
          if (err?.response?.status === 401) {
            useAuthStore.getState().clearUser();
            secureStorage.clearAuthHeaders();
          }
        });
    } catch {
      // Storage read failed — fall back to guest rather than crashing startup.
      useAuthStore.getState().clearUser();
    }
  })();

  return pending;
}
