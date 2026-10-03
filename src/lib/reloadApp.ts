import { reloadAppAsync } from "expo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import RNRestart from "react-native-restart";

/**
 * Fully restart the JS app.
 *
 * Used for changes React Native can't reliably hot-swap on device:
 *   • LTR↔RTL direction flips (I18nManager.forceRTL only applies after a restart)
 *   • language + theme changes — the live update is janky/partial on Android
 *     (labels/layout sometimes don't refresh), so we reload for a clean apply.
 *
 * Through EXPO's reload, not react-native-restart's. Found by QA 2026-10-03:
 * after RNRestart on Android (New Architecture), every Expo module that launches
 * an Activity for a result was left with an UNREGISTERED launcher, so after any
 * language or theme change "Gallery" on Create Listing did nothing at all —
 * ExponentImagePicker rejected with "Attempting to launch an unregistered
 * ActivityResultLauncher" — until the app was killed. A listing cannot be
 * published without a photo. Expo's own reload rebuilds the React host the way
 * its modules expect, so their launchers are registered again.
 * RNRestart stays only as the fallback if Expo's reload is unavailable.
 *
 * No-op in Expo Go — the native restart module isn't available there (and the
 * app is only ever run from real builds in production anyway).
 */
export function reloadApp(): void {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  reloadAppAsync("language or theme change").catch(() => {
    try {
      RNRestart.restart();
    } catch {
      // Nothing else we can do — the change will apply on the next launch.
    }
  });
}
