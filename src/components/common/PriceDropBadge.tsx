/**
 * PriceDropBadge — a compact badge that signals a recent price reduction.
 *
 * Two variants:
 *   'detail'  — shown beside the PriceTag on the ListingDetail screen.
 *               Displays: TrendingDown icon + "15% price drop"
 *   'card'    — tiny corner overlay on a ListingCard thumbnail.
 *               Displays: "↓15%" text pill (no icon, very small)
 *
 * Design rules (from TASK-N804):
 *   - Subtlety is key: must not overshadow the price.
 *   - text-xs font, tinted background pill.
 *   - RTL: badge text direction respects isRtl.
 *   - Dark mode: colors via useColors().
 */

import { View } from "react-native";
import { TrendingDown } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface PriceDropBadgeProps {
  /** Integer percent price drop, e.g. 15 for 15% off. */
  percent: number;
  /**
   * 'detail' — full pill with icon, shown beside the PriceTag on ListingDetail.
   * 'card'   — compact "-15%" overlay on the ListingCard thumbnail.
   */
  variant?: "detail" | "card";
}

export function PriceDropBadge({ percent, variant = "detail" }: PriceDropBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  if (percent <= 0) return null;

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
