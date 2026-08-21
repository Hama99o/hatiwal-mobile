import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export type PriceTagSize = "lg" | "md" | "sm";

/**
 * TASK-C381 (review fix, DR): every price on screen must go through this
 * component (CLAUDE.md: "Same for PriceTag/StatusBadge... Extend the shared
 * component, don't fork it") — but `MessageBubble`'s offer/counter amount
 * used to hand-roll its own colored `<Text>` instead, because the default
 * `colors.foreground` tone couldn't express the "mine" bubble's warning
 * accent. `tone` closes that gap: `"default"` (unchanged — every existing
 * call site omits it) or `"warning"` / `"muted"` for the two colors chat's
 * offer bubbles actually need.
 */
export type PriceTagTone = "default" | "warning" | "muted";

interface PriceTagProps {
  price: number | null | undefined;
  currency?: string;
  size?: PriceTagSize;
  tone?: PriceTagTone;
  className?: string;
  /**
   * Append "each" — for a listing with more than one unit.
   *
   * Lives HERE and not at the call sites on purpose. A bare "AFN 14,000" on a
   * 15-unit listing is genuinely dangerous: buyer and seller can both agree to
   * "40,000" meaning different things and only discover it at the meetup, with
   * no payment system to arbitrate and no delivery to reverse. Every surface
   * that renders this listing's price passes the same flag, so none of them can
   * drift out of sync — see docs/SPIKE_LISTING_QUANTITY.md §0c.
   *
   * The number's own size, weight and colour are untouched: this disambiguates
   * the price, it does not compete with it.
   */
  perUnit?: boolean;
}

// lg: hero price on Listing Detail (24sp — most prominent text after the photo)
// md: price in Browse card (17sp — dominant within card body)
// sm: secondary surfaces (chat header, similar listings)
const fontSize: Record<PriceTagSize, number> = { lg: 24, md: 17, sm: 13 };
const fontWeight: Record<PriceTagSize, "700" | "600"> = { lg: "700", md: "700", sm: "600" };

export function PriceTag({
  price,
  currency = "AFN",
  size = "md",
  tone = "default",
  perUnit = false,
}: PriceTagProps) {
  const { formatCurrency, isRtl } = useLocalization();
  const { t } = useTranslation();
  const colors = useColors();

  if (price == null) return null;

  const color =
    tone === "warning" ? colors.warning : tone === "muted" ? colors.mutedForeground : colors.foreground;

  const amount = (
    <Text
      style={{ color, fontSize: fontSize[size], fontWeight: fontWeight[size] }}
      numberOfLines={1}
      accessibilityRole="text"
    >
      {formatCurrency(price, currency)}
    </Text>
  );

  if (!perUnit) return amount;

  // Row, not string concatenation: "each" is smaller and muted so it reads as a
  // qualifier rather than part of the figure, and RTL mirrors it for free.
  return (
    <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "baseline", gap: 4 }}>
      {amount}
      <Text
        style={{ color: colors.mutedForeground, fontSize: Math.max(11, fontSize[size] - 5) }}
        numberOfLines={1}
      >
        {t("listing.stock.each")}
      </Text>
    </View>
  );
}
