import type { useColors } from "@/hooks/useColors";
import type { ListingStatus } from "./StatusBadge";

/**
 * getStatusAccent — TASK-K729 dedup fix.
 *
 * The single source of truth for "status -> {background, text} colour pair"
 * used to render a listing's lifecycle state as an accent (an icon bubble, a
 * filled banner, a pill). Before this, `StatusBadge`, `SaleBuyerCard` and
 * `ListingUnavailableNotice` each hand-rolled their own status->colour
 * ternary, and they had drifted apart — `SaleBuyerCard`/the old
 * `ListingUnavailableNotice` used `muted`/`mutedForeground` for `sold` while
 * `StatusBadge` (the documented mapping, DESIGN_SYSTEM.md §2) uses
 * `secondary`/`secondaryForeground`. Every caller now reads this one map.
 *
 * Mapping (mirrors StatusBadge's non-overlay pill exactly):
 *   draft    -> muted / mutedForeground   (grey — not yet published)
 *   active   -> successAlpha / success    (green — live)
 *   reserved -> warningAlpha / warning    (amber — held for a buyer)
 *   sold     -> secondary / secondaryForeground (grey — archived)
 *
 * TASK-K729 (review fix, MEDIUM — dark mode / status hierarchy): `edge` is a
 * THIRD, separate field for `ListingStatusBanner`'s leading accent border
 * only — it must NOT reuse `text`. `text` is tuned for legibility as a LABEL
 * colour (StatusBadge's pill text, SaleBuyerCard's headline), so for `sold`
 * it resolves to `secondaryForeground` — near-black in light, near-WHITE in
 * dark. Reusing that as a 4px card-edge border made the archived/dimmed
 * `sold` state the single loudest, highest-contrast element on the whole
 * notice (louder than the primary CTA), while the amber `reserved` edge —
 * the state that's actually still awaiting buyer action — read as quieter.
 * `edge` is tuned instead for "how loud should this state's accent BAR be":
 *   draft    -> border            (quiet — not yet published, no signal needed)
 *   active   -> success           (green — live, matches the pill text)
 *   reserved -> warning           (amber attention state — matches the pill text)
 *   sold     -> mutedForeground   (grey — archived/dimmed, per DESIGN_SYSTEM.md §2,
 *                                  identical in both themes, never near-white)
 */
export function getStatusAccent(
  status: ListingStatus,
  colors: ReturnType<typeof useColors>
): { bg: string; text: string; edge: string } {
  switch (status) {
    case "active":
      return { bg: colors.successAlpha, text: colors.success, edge: colors.success };
    case "reserved":
      return { bg: colors.warningAlpha, text: colors.warning, edge: colors.warning };
    case "sold":
      return { bg: colors.secondary, text: colors.secondaryForeground, edge: colors.mutedForeground };
    default:
      return { bg: colors.muted, text: colors.mutedForeground, edge: colors.border };
  }
}
