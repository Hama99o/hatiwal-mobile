/**
 * StockBadge — "12 in stock" / "5 of 15 left" for a multi-unit listing.
 *
 * One component, two audiences, because they differ in exactly ONE decision and nothing
 * else: when the progress phrasing replaces the bare count.
 *
 *   audience="buyer" — progress only once stock is running out. To a buyer "5 of 15 left"
 *                      is urgency; before that the total is noise.
 *   audience="owner" — progress as soon as anything has sold, because that is the
 *                      seller's answer to "how far through the batch am I?".
 *                      "15 of 15 left" before the first sale says nothing (QA run-017).
 *
 * Extracted rather than copied a third time. The rule lived inline in ListingDetail and
 * MyListingDetail, and the seller's LIST page — the one screen where stock is checked
 * most often, and where a seller reported "the count did not change" because there was
 * no count at all — needed it too. Three inline copies of a rule this fiddly is how the
 * two drift apart.
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
  isLowStock,
  totalUnitsOf,
  type StockFields,
} from "@/utils/stock";

export interface StockBadgeProps {
  listing: StockFields | null | undefined;
  /** Who is reading it — see the note above; this is the only behavioural difference. */
  audience: "buyer" | "owner";
  /** Handle for flows and unit queries. Each site keeps its own. */
  testID?: string;
  style?: ViewStyle;
}

export function StockBadge({ listing, audience, testID, style }: StockBadgeProps) {
  const { t } = useTranslation();
  const { formatNumber } = useLocalization();

  if (!hasStockToShow(listing)) return null;

  const available = availableUnitsOf(listing);
  const total = totalUnitsOf(listing);
  const lowStock = isLowStock(available, total);

  const showProgress = audience === "owner" ? hasSoldSome(listing) : lowStock;

  return (
    <View testID={testID} style={style}>
      <Badge
        label={
          showProgress
            ? t("listing.stock.leftOfTotal", {
                available: formatNumber(available),
                total: formatNumber(total),
              })
            : t("listing.stock.inStock", { count: available })
        }
        // Amber only when it is genuinely running out — the same token StatusBadge
        // already uses for "reserved", never a new colour.
        variant={lowStock ? "warning" : "muted"}
      />
    </View>
  );
}
