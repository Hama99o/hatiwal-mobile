/**
 * ReportStatusBadge — thin wrapper mapping report status → semantic color tokens.
 *
 * Reuses the same visual grammar as StatusBadge (listing status), adapted for the
 * report status enum: pending | reviewed | resolved | dismissed.
 *
 * Token mapping:
 *   pending   → muted / mutedForeground  (neutral — awaiting review)
 *   reviewed  → primary alpha / primary  (info — in progress)
 *   resolved  → successAlpha / success   (green — action taken)
 *   dismissed → muted / mutedForeground  (dimmed — no action)
 */

import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import type { ReportStatus } from "@/api/reports";

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const bg: Record<ReportStatus, string> = {
    pending:   colors.muted,
    reviewed:  colors.primaryAlpha,
    resolved:  colors.successAlpha,
    dismissed: colors.muted,
  };

  const textColor: Record<ReportStatus, string> = {
    pending:   colors.mutedForeground,
    reviewed:  colors.primary,
    resolved:  colors.success,
    dismissed: colors.mutedForeground,
  };

  return (
    <View
      style={{
        backgroundColor:   bg[status],
        borderRadius:       999,
        paddingHorizontal: 8,
        paddingVertical:   2,
        alignSelf:         "flex-start",
      }}
      accessibilityRole="text"
    >
      <Text
        style={{ color: textColor[status], fontSize: 11, fontWeight: "600" }}
        numberOfLines={1}
      >
        {t(`report.status.${status}`)}
      </Text>
    </View>
  );
}
