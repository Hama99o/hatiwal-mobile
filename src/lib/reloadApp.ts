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
 * No-op in Expo Go — the native restart module isn't available there (and the
 * app is only ever run from real builds in production anyway).
 */
export function reloadApp(): void {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  try {
    RNRestart.restart();
  } catch {
    // Nothing else we can do — the change will apply on the next launch.
  }
}
