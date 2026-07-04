/**
 * Centralized runtime-permission denial handling (photos, camera, location).
 *
 * Q3 platform audit (2026-07-03): before this helper existed, each call site
 * (PhotosSection, Profile avatar picker, Conversation photo attachment,
 * LocationRangePicker / Browse "nearest" sort) rolled its own denied-permission
 * copy and none of them offered a way out of the dead end — the user would deny
 * once and then have no obvious way to grant access later. This module is the
 * single place that:
 *   1. Resolves the localized copy for a denied permission kind.
 *   2. Always routes through `confirmAlert` (never raw `Alert.alert` — see
 *      mobile.prompt.md §11; `Alert.alert` is unreliable outside native).
 *   3. Offers a "Open Settings" action via `Linking.openSettings()` so the
 *      user can actually recover, instead of a silent no-op or a toast that
 *      disappears with no next step.
 *
 * iOS vs Android: `Linking.openSettings()` opens the per-app Settings screen
 * on both platforms — no Platform.OS branch is needed here.
 */

import { Linking } from "react-native";
import type { TFunction } from "i18next";
import { confirmAlert } from "@/utils/alert";

export type DeniedPermissionKind = "photos" | "camera" | "location";

const DENIED_MESSAGE_KEY: Record<DeniedPermissionKind, string> = {
  photos: "permissions.photosDenied",
  camera: "permissions.cameraDenied",
  location: "permissions.locationDenied",
};

/**
 * Show a clear, localized, actionable alert for a denied permission.
 * Pass the `t` from the caller's own `useTranslation()` — this module does
 * not hold its own i18n instance so it stays a plain, testable function.
 */
export function showPermissionDeniedAlert(kind: DeniedPermissionKind, t: TFunction): void {
  confirmAlert(t("permissions.permissionNeededTitle"), t(DENIED_MESSAGE_KEY[kind]), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("permissions.openSettings"), onPress: () => Linking.openSettings() },
  ]);
}

/**
 * Informational (non-blocking) notice for iOS 14+ / Android 14+ "limited"
 * photo-library access. The picker still works with the allowed subset, so
 * this never blocks the flow — it just explains why some photos are missing
 * and gives an Open Settings shortcut to grant full access.
 */
export function showLimitedPhotoAccessAlert(t: TFunction): void {
  confirmAlert(t("permissions.permissionNeededTitle"), t("permissions.photosLimited"), [
    { text: t("common.cancel"), style: "cancel" },
    { text: t("permissions.openSettings"), onPress: () => Linking.openSettings() },
  ]);
}
