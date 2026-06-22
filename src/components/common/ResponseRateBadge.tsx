/**
 * ResponseRateBadge — trust signal shown on seller profile and listing detail.
 *
 * Renders: Clock icon + "XX% reply rate · Usually responds within <label>"
 *
 * Guard rule: renders null unless BOTH conditions are true:
 *   - responseRatePercent is non-null AND > 0 (a 0%-rate seller sends a false
 *     trust signal — suppress the badge entirely)
 *   - responseTimeLabel is non-null
 *
 * RTL: row direction flips via isRtl.
 * Dark mode: colors via useColors().
 * Typography: fontSize 12 / text-xs to stay secondary metadata.
 */

import { View } from "react-native";
import { Clock } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export type ResponseTimeLabel = "within_one_hour" | "within_a_day" | "within_a_few_days";

export interface ResponseRateBadgeProps {
  responseRatePercent: number | null | undefined;
  responseTimeLabel: ResponseTimeLabel | null | undefined;
}

export function ResponseRateBadge({ responseRatePercent, responseTimeLabel }: ResponseRateBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl } = useLocalization();

  // Suppress if either field is absent OR rate is 0 (no false positive trust signal)
  if (!responseRatePercent || !responseTimeLabel) return null;

  const ratePart = t("profile.sellerProfile.responseRate", { percent: responseRatePercent });
  const timePart = t(`profile.sellerProfile.responseTime.${responseTimeLabel}`);
  const label = `${ratePart} · ${timePart}`;

  return (
    <View
      style={{
        flexDirection: isRtl ? "row-reverse" : "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
      }}
    >
      <Clock size={12} color={colors.mutedForeground} />
      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}
