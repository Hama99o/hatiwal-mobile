/**
 * activeLabelUtil — maps the privacy-safe last_active_label bucket coming from
 * the Rails :public UserSerializer (and the :detailed ListingSerializer seller
 * block) to a localized display string.
 *
 * Keeping the mapping here prevents drift if a fourth bucket is ever added —
 * only this file needs updating.
 *
 * Usage:
 *   import { getActiveLabelText } from '@/utils/activeLabelUtil';
 *   const text = getActiveLabelText(label, t);  // null when label is falsy
 */

export type ActiveLabelBucket = "today" | "this_week" | "this_month";

/**
 * Converts an `lastActiveLabel` bucket value to a localized UI string.
 *
 * @param label  - The bucket string from the API, or null/undefined.
 * @param t      - The `t` function from `useTranslation()`.
 * @returns      - Localized string, or null if the label is absent/unknown.
 */
export function getActiveLabelText(
  label: ActiveLabelBucket | null | undefined,
  t: (key: string) => string
): string | null {
  if (!label) return null;
  if (label === "today") return t("profile.userProfile.activeToday");
  if (label === "this_week") return t("profile.userProfile.activeThisWeek");
  if (label === "this_month") return t("profile.userProfile.activeThisMonth");
  return null;
}
