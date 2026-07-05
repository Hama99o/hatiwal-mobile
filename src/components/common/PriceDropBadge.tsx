/**
 * PriceDropBadge — a compact badge that signals a price reduction.
 *
 * Three variants:
 *   'detail'  — shown beside the PriceTag on the ListingDetail screen.
 *               Displays: TrendingDown icon + "15% price drop"
 *               Data source: the LISTING's own price history (TASK-N804).
 *   'card'    — tiny corner overlay on a ListingCard thumbnail.
 *               Displays: "↓15%" text pill (no icon, very small)
 *               Data source: same as 'detail' (listing's own history).
 *   'saved'   — per-buyer "price dropped since you saved it" badge on the
 *               Saved screen (TASK-Y316). Displays: the price at the moment
 *               THIS buyer saved the listing struck through, followed by an
 *               arrow (mirrored in RTL) and the current lower price emphasized.
 *               Pass `compact` for narrow surfaces (the Saved grid card) —
 *               drops the label text and the duplicated current price (the
 *               card's PriceTag hero already shows it), leaving just the
 *               struck-through old price + drop amount on one line.
 *               Data source: SavedListing#price_at_save vs. the listing's
 *               current price — NOT the listing's own price-history percent,
 *               and NOT the same signal as 'detail'/'card' above.
 *
 * Design rules:
 *   - Subtlety is key: must not overshadow the price.
 *   - text-xs font, tinted background pill.
 *   - RTL: text direction + arrow mirroring respect isRtl.
 *   - Dark mode: colors via useColors().
 *   - Composes PriceTag's currency formatting (useLocalization().formatCurrency)
 *     for the 'saved' variant instead of forking PriceTag itself.
 */

import { View } from "react-native";
import { TrendingDown, ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface PriceDropBadgeProps {
  /** Integer percent price drop, e.g. 15 for 15% off. Required for 'detail' | 'card'. */
  percent?: number;
  /**
   * 'detail' — full pill with icon, shown beside the PriceTag on ListingDetail.
   * 'card'   — compact "-15%" overlay on the ListingCard thumbnail.
   * 'saved'  — per-buyer price-at-save vs. current-price comparison (Saved screen).
   */
  variant?: "detail" | "card" | "saved";
  /** 'saved' variant only — the price at the moment the buyer saved this listing. */
  oldPrice?: number;
  /** 'saved' variant only — the listing's current (lower) price. */
  newPrice?: number;
  /** 'saved' variant only — currency code for formatCurrency. Defaults to 'AFN'. */
  currency?: string;
  /**
   * 'saved' variant only — condensed one-line form for narrow surfaces (the
   * 2-column Saved grid card): drops the "Price dropped" label text and the
   * duplicated current-price figure (the ListingCard's PriceTag hero already
   * shows the current price), keeping just the struck-through old price and
   * the drop amount. Full label + old→new form is used when false (e.g. the
   * wider list-row variant). Defaults to false.
   */
  compact?: boolean;
}

export function PriceDropBadge({
  percent,
  variant = "detail",
  oldPrice,
  newPrice,
  currency = "AFN",
  compact = false,
}: PriceDropBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatCurrency } = useLocalization();

  if (variant === "saved") {
    // No badge when we don't have both prices, or the price didn't actually drop
    // (unchanged/increased) — matches the backend's price_dropped guard.
    if (oldPrice == null || newPrice == null || newPrice >= oldPrice) return null;

    const formattedOldPrice = formatCurrency(oldPrice, currency);
    const formattedNewPrice = formatCurrency(newPrice, currency);
    // Accessibility: the pill collapses to a single node (accessibilityRole="text"),
    // so build the label FROM the actual values — otherwise a screen reader would
    // only hear the generic "Price dropped" label and never learn the two prices.
    const a11yLabel = compact
      ? t("listing.priceDrop.savedBadgeCompactA11y", {
          oldPrice: formattedOldPrice,
          dropAmount: formatCurrency(oldPrice - newPrice, currency),
        })
      : t("listing.priceDrop.savedBadgeA11y", {
          oldPrice: formattedOldPrice,
          newPrice: formattedNewPrice,
        });

    if (compact) {
      // Condensed: icon + struck-through old price + drop amount. No label text,
      // no repeated current price — the card's PriceTag hero already shows it.
      return (
        <View
          testID="price-drop-badge-saved"
          accessibilityRole="text"
          accessibilityLabel={a11yLabel}
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.successAlpha,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: colors.success,
            alignSelf: isRtl ? "flex-end" : "flex-start",
          }}
        >
          <TrendingDown size={12} color={colors.success} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              textDecorationLine: "line-through",
            }}
          >
            {formattedOldPrice}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>
            -{formatCurrency(oldPrice - newPrice, currency)}
          </Text>
        </View>
      );
    }

    return (
      <View
        testID="price-drop-badge-saved"
        accessibilityRole="text"
        accessibilityLabel={a11yLabel}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          backgroundColor: colors.successAlpha,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colors.success,
          alignSelf: isRtl ? "flex-end" : "flex-start",
        }}
      >
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 3 }}>
          <TrendingDown size={12} color={colors.success} strokeWidth={2.5} />
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>
            {t("listing.priceDrop.savedBadge")}
          </Text>
        </View>
        <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              textDecorationLine: "line-through",
            }}
          >
            {formattedOldPrice}
          </Text>
          <View style={isRtl ? { transform: [{ scaleX: -1 }] } : undefined}>
            <ArrowRight size={11} color={colors.mutedForeground} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>
            {formattedNewPrice}
          </Text>
        </View>
      </View>
    );
  }

  if (percent == null || percent <= 0) return null;

  if (variant === "card") {
    // Compact corner overlay — solid opaque pill so the badge is always legible
    // on busy/bright/green photos.  Every other on-photo element (StatusBadge,
    // seenBadge, heart scrim) uses an opaque or near-opaque fill for the same
    // reason.  successAlpha (~12 % opacity) is intentionally NOT used here —
    // it is fine for the detail variant which sits on the solid card body, but
    // over a photo it can disappear against matching-hue or bright backgrounds.
    return (
      <View
        style={{
          backgroundColor: colors.success,
          borderRadius: 999,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: colors.successForeground,
          }}
        >
          {t("listing.priceDrop.badgeCardShort", { percent })}
        </Text>
      </View>
    );
  }

  // Detail variant — full pill with TrendingDown icon
  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: colors.successAlpha,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.success,
        // Hug the start edge so the badge stays visually attached to the price
        // it annotates — which is the right edge in RTL (ps/fa), left in LTR.
        alignSelf: isRtl ? "flex-end" : "flex-start",
      }}
    >
      <TrendingDown size={12} color={colors.success} strokeWidth={2.5} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: colors.success,
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {t("listing.priceDrop.badge", { percent })}
      </Text>
    </View>
  );
}
