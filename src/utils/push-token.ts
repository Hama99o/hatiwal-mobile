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
 * - Physical device only: the Expo push token is unavailable in simulators
 *   without a projectId; we catch and swallow that error gracefully.
 */

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { authAPI } from "@/api/auth";

const PUSH_TOKEN_STORAGE_KEY = "hatiwal_push_token";

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
    } catch {
      // getExpoPushTokenAsync throws in simulators / when projectId is absent.
      // This is expected in development — fail silently.
      return null;
    }

    // Compare against the cached token to avoid a redundant network call.
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (cached === token) {
      return token;
    }

    // Persist the new token to the backend.
    await authAPI.updateMe({ pushToken: token });

    // Cache it locally so subsequent logins skip the PUT.
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

    return token;
  } catch {
    // Any unexpected error (network, AsyncStorage, etc.) must not crash the
    // app or block the auth flow — just return null.
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
