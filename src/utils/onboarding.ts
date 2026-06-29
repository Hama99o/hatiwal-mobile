/**
 * First-run onboarding flag.
 *
 * Persisted in AsyncStorage (not SecureStore — it's not sensitive) under the
 * key `hatiwal:onboarding-seen`. Splash reads this flag together with the
 * stored auth token to decide whether to show the onboarding carousel:
 *
 *   - No token AND flag not set  → show onboarding (true first run)
 *   - Token present              → skip onboarding (never shown to authed users)
 *   - Flag already set           → skip onboarding (already seen, any session)
 *
 * The flag is intentionally never cleared on logout — once a device has seen
 * onboarding, it has seen it for good; logging out again should land the
 * guest on Browse, not replay the carousel.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_SEEN_KEY = "hatiwal:onboarding-seen";

/** Whether this device has already completed or skipped onboarding. */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
    return value === "true";
  } catch {
    // Storage read failed — fail safe by treating onboarding as already seen
    // so a storage glitch never traps a returning user in the carousel.
    return true;
  }
}

/** Mark onboarding as seen (finished or skipped) so it never shows again. */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
  } catch {
    // Ignore persistence errors — worst case the carousel reappears once more.
  }
}
