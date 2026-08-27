/**
 * StockBadge — "12 in stock" / "5 of 15 left" for a multi-unit listing, plus
 * the SF-M4 "held" clause (docs/SELL_FLOW_REDESIGN.md §4.2.2/§4.5) appended
 * when there's an open hold — "13 available · 2 held" (buyer) / "13
 * available · 2 held for Ahmad" (owner, when the buyer's name is known).
 *
 * One component, two audiences, because they differ in exactly TWO decisions and
 * nothing else:
 *
 *   audience="buyer" — progress only once stock is running out. To a buyer "5 of 15 left"
 *                      is urgency; before that the total is noise. The held clause never
 *                      carries a name (the public payload never returns one).
 *   audience="owner" — progress as soon as anything has sold, because that is the
 *                      seller's answer to "how far through the batch am I?".
 *                      "15 of 15 left" before the first sale says nothing (QA run-017).
 *                      The held clause names the buyer when `heldBuyerName` is passed.
 *
 * Extracted so this is the ONE place the rule lives. This used to be three inline
 * copies (ListingDetail, MyListingDetail, and this component) that had already
 * drifted apart — this component's own held clause was missing while both detail
 * screens had hand-rolled their own. Consolidated: both detail screens now render
 * this component instead of re-implementing it.
 *
 * Renders nothing for a single-item listing, so those screens stay byte-identical.
 */
import { View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/reusables/badge";
import { useLocalization } from "@/hooks/useLocalization";
import {
  availableUnitsOf,
  hasSoldSome,
  hasStockToShow,
  heldUnitsOf,
  isLowStock,
  totalUnitsOf,
  type StockFields,
} from "@/utils/stock";

export interface StockBadgeProps {
  listing: StockFields | null | undefined;
  /** Who is reading it — see the note above; this is the only behavioural difference. */
  audience: "buyer" | "owner";
  /**
   * Owner-only — the open hold's buyer name (typically `listing.sale?.buyer?.name`,
   * only ever populated on the `owner_detailed` view). Ignored when
   * `audience="buyer"`: the public payload never carries this identity, so passing
   * it there would leak nothing (there's nothing to leak, `listing.sale` isn't on
   * that payload) but is still the wrong contract to rely on.
   */
  heldBuyerName?: string | null;
  /** Handle for flows and unit queries. Each site keeps its own. */
  testID?: string;
  style?: ViewStyle;
}

export function StockBadge({ listing, audience, heldBuyerName, testID, style }: StockBadgeProps) {
  const { t } = useTranslation();
  const { formatNumber } = useLocalization();

  if (!hasStockToShow(listing)) return null;

  const available = availableUnitsOf(listing);
  const total = totalUnitsOf(listing);
  const lowStock = isLowStock(available, total);
  const held = heldUnitsOf(listing);

  const showProgress = audience === "owner" ? hasSoldSome(listing) : lowStock;

  const baseLabel = showProgress
    ? t("listing.stock.leftOfTotal", {
        available: formatNumber(available),
        total: formatNumber(total),
      })
    : t("listing.stock.inStock", { count: formatNumber(available) });

  const heldClause =
    held > 0
      ? ` · ${
          audience === "owner" && heldBuyerName
            ? t("listing.stock.heldForBuyer", { count: formatNumber(held), name: heldBuyerName })
            : t("listing.stock.held", { count: formatNumber(held) })
        }`
      : "";

  return (
    <View testID={testID} style={style}>
      <Badge
        label={baseLabel + heldClause}
        // Amber only when it is genuinely running out — the same token StatusBadge
        // already uses for "reserved", never a new colour.
        variant={lowStock ? "warning" : "muted"}
      />
    </View>
  );
}
