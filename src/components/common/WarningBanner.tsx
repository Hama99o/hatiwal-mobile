import { View } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";

export interface WarningBannerItem {
  reason: string;
  category: string;
  expiresAt: string;
}

interface WarningBannerProps {
  activeCount: number;
  threshold: number;
  // Active warnings to list (reasons). Optional — the count alone still renders.
  warnings?: WarningBannerItem[];
}

// The ONE place the "you have warnings" treatment lives. A warning-toned card
// telling the user how many active strikes they have, how many remain before a
// block, and the reasons. Renders nothing when the user has no active warnings,
// so it is safe to drop at the top of any account screen. RTL-aware.
export function WarningBanner({ activeCount, threshold, warnings = [] }: WarningBannerProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatNumber } = useLocalization();

  if (activeCount <= 0) return null;

  const remaining = Math.max(threshold - activeCount, 0);

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.warningAlpha,
        borderColor: colors.warning,
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: isRtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={18} color={colors.warning} />
        <Text
          style={{ color: colors.warning, fontWeight: "700", fontSize: 14, flex: 1, textAlign: isRtl ? "right" : "left" }}
        >
          {t("warning.title", { count: formatNumber(activeCount), total: formatNumber(threshold) })}
        </Text>
      </View>

      <Text style={{ color: colors.foreground, fontSize: 13, textAlign: isRtl ? "right" : "left" }}>
        {remaining > 0
          ? t("warning.remaining", { count: formatNumber(remaining) })
          : t("warning.atLimit")}
      </Text>

      {warnings.length > 0 && (
        <View style={{ gap: 6, marginTop: 2 }}>
          {warnings.map((w, i) => (
            <View key={i} style={{ flexDirection: isRtl ? "row-reverse" : "row", gap: 6 }}>
              <Text style={{ color: colors.warning, fontSize: 12 }}>•</Text>
              <Text
                style={{ color: colors.mutedForeground, fontSize: 12, flex: 1, textAlign: isRtl ? "right" : "left" }}
              >
                {w.reason}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
