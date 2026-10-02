import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

// Lucide's BadgeCheck geometry, drawn FILLED: a solid brand-blue rosette with
// a white check — the pattern people already read as "verified" (X, Instagram,
// Mobbin check 2026-10-02). The old outline was a thin line that disappeared
// next to a bold name. `primary` is a saturated blue in BOTH themes and its
// foreground is white in both, so the same pair holds in light and dark.
const ROSETTE =
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z";

function FilledBadge({ size, fill, check, label }: { size: number; fill: string; check: string; label?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={label} accessible={!!label}>
      <Path d={ROSETTE} fill={fill} stroke={fill} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="m8.6 12.2 2.3 2.3 4.6-4.8" fill="none" stroke={check} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Trust badge for a verified seller. Icon-only by default; pass `withLabel`
 * to render the "Verified" text beside it (e.g. on the profile header).
 * Pass `accessibilityLabel` to override the default "Verified" screen-reader label
 * (e.g. the card context uses "listing.card.verifiedSeller" for more specificity).
 */
export function VerifiedBadge({
  size = 16,
  withLabel = false,
  accessibilityLabel: accessibilityLabelProp,
}: {
  size?: number;
  withLabel?: boolean;
  /** Overrides the default "Verified" screen-reader label. */
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRtl } = useLocalization();

  if (!withLabel) {
    return (
      <FilledBadge
        size={size}
        fill={colors.primary}
        check={colors.primaryForeground}
        label={accessibilityLabelProp ?? t("common.verified")}
      />
    );
  }

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primaryAlpha,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <FilledBadge size={size} fill={colors.primary} check={colors.primaryForeground} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
        {t("common.verified")}
      </Text>
    </View>
  );
}
