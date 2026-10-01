/**
 * Push token registration utility.
 *
 * Requests Expo push notification permissions from the user, retrieves the
 * Expo push token, and stores it on the backend via PUT /users/me so the
 * server can deliver notifications later without a new app release.
 *
 * Rules:
 * - Only registers once per login: the token is cached in AsyncStorage.
 * - If permission is denied, the function returns null silently — no error,
 *   no toast, no crash.
 * - If the token matches the cached value it is NOT re-sent to the backend.
 * - A FAILURE to get or store the token never blocks login, but it is never
 *   silent either: it is reported via `reportPushRegistrationFailure` with the
 *   underlying message intact. Swallowing it hid, for months, that Android
 *   could not register at all — "Default FirebaseApp is not initialized" was
 *   thrown on every Android login and nobody saw it (docs/PUSH_NOTIFICATIONS.md
 *   in hatiwal-api). Permission denied is the user's choice, not a failure,
 *   and is not reported.
 */

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { authAPI } from "@/api/auth";

const PUSH_TOKEN_STORAGE_KEY = "hatiwal_push_token";

export type PushRegistrationStage = "token" | "backend" | "unexpected";

/**
 * Where a push-registration failure goes. The app has no crash/error service,
 * so this is the device log: `console.warn` reaches logcat (`ReactNativeJS`)
 * and the iOS device console in RELEASE builds too, under a stable `[push]`
 * prefix you can grep. One function so a real sink can replace it in one
 * place. Never throws.
 */
export function reportPushRegistrationFailure(stage: PushRegistrationStage, error: unknown): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[push] registration failed at ${stage} (${Platform.OS}): ${message}`);
  } catch {
    // reporting must never be the thing that breaks login
  }
}

/**
 * Request push notification permission, get the Expo push token, and register
 * it on the backend. Idempotent: if the stored token has not changed, the PUT
 * call is skipped.
 *
 * @returns The Expo push token string, or null when permission was denied or
 *   the token could not be retrieved (e.g. simulator, no projectId).
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Android requires a notification channel to be configured before
    // requesting permissions; set a sensible default channel here.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Ask the user for permission. If already granted this resolves
    // immediately without a system dialog.
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    // Retrieve the Expo push token. This requires a projectId — read it from
    // the app config (populated by EAS / app.json extra.eas.projectId).
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    let token: string;
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenResponse.data;
    } catch (error) {
      // Throws when the platform cannot issue a token — no projectId, a
      // simulator, or (Android) Firebase not configured in the build.
      reportPushRegistrationFailure("token", error);
      return null;
    }

    // Compare against the cached token to avoid a redundant network call.
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (cached === token) {
      return token;
    }

    // Persist the new token to the backend.
    try {
      await authAPI.updateMe({ pushToken: token });
    } catch (error) {
      reportPushRegistrationFailure("backend", error);
      return null;
    }

    // Cache it locally so subsequent logins skip the PUT.
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    return token;
  } catch (error) {
    // Any unexpected error (channel setup, AsyncStorage, etc.) must not crash
    // the app or block the auth flow — report it and return null.
    reportPushRegistrationFailure("unexpected", error);
    return null;
  }
}

/**
 * Clear the locally cached push token. Call this on logout so the next login
 * always re-registers (in case the device token rotated while logged out).
 */
export async function clearCachedPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    // swallow — non-critical
  }
}
