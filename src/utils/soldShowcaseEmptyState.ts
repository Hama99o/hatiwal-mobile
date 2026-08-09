/**
 * soldShowcaseEmptyState — resolves the empty-state copy for the public seller
 * profile's "Sold" showcase tab (TASK-F742) when it returns zero listings.
 *
 * TASK-TX02 review fix (MAJOR): the showcase tab only lists CURRENTLY VISIBLE
 * sold listings (`.sold.not_removed` on the backend), while the trust-dossier
 * `TransactionStatsBadge` above it shows `soldCount` — a lifetime count
 * sourced from the `transactions` table that is NEVER decremented (by design;
 * see Transaction#bump_trust_counters!), even after the seller later deletes
 * one of those sold listings. A seller can legitimately have `soldCount > 0`
 * while the showcase is empty (every sold listing was since removed) — in
 * that case the generic "No sold items yet" copy directly CONTRADICTS the
 * badge above it on the very same screen ("3 sold" ... "No sold items yet").
 *
 * This resolves the contradiction with honest copy: when soldCount > 0 we
 * acknowledge the seller has a sales history but nothing is currently
 * showcased, instead of implying they have never sold anything.
 */

export interface SoldShowcaseEmptyStateCopy {
  title: string;
  description: string;
}

/**
 * @param soldCount - The seller's lifetime `soldCount` from the public profile
 *                     payload (transactions-table trust stat). null/undefined
 *                     treated as 0.
 * @param t         - The `t` function from `useTranslation()`.
 */
export function getSoldShowcaseEmptyState(
  soldCount: number | null | undefined,
  t: (key: string) => string
): SoldShowcaseEmptyStateCopy {
  if ((soldCount ?? 0) > 0) {
    return {
      title: t("profile.userProfile.sold.emptyTitleHidden"),
      description: t("profile.userProfile.sold.emptyDescriptionHidden"),
    };
  }

  return {
    title: t("profile.userProfile.sold.emptyTitle"),
    description: t("profile.userProfile.sold.emptyDescription"),
  };
}
