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
 */
export function getStatusAccent(
  status: ListingStatus,
  colors: ReturnType<typeof useColors>
): { bg: string; text: string } {
  switch (status) {
    case "active":
      return { bg: colors.successAlpha, text: colors.success };
    case "reserved":
      return { bg: colors.warningAlpha, text: colors.warning };
    case "sold":
      return { bg: colors.secondary, text: colors.secondaryForeground };
    default:
      return { bg: colors.muted, text: colors.mutedForeground };
  }
}
