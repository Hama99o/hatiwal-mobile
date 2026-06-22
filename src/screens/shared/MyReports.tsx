/**
 * MyReportsScreen — read-only list of the current user's own reports.
 *
 * Shows what they reported (reportableLabel), the reason, when it was submitted,
 * and the current status as a colored pill (ReportStatusBadge).
 *
 * The Stack header is registered in app/(main)/_layout.tsx (profile/my-reports),
 * so this screen uses safeArea={[]} and renders no custom header — same pattern
 * as BlockedUsers.
 *
 * Rules applied:
 *  - UniversalList with ReportRowSkeleton + EmptyState
 *  - useFocusEffect refreshKey refetch
 *  - All colors via useColors(); layout only via className
 *  - RTL-safe (isRtl)
 *  - t() for every string; all 3 locales have keys
 *  - No raw Alert, no hardcoded hex, no raw RN Text
 */

import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";
import { Flag } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import {
  UniversalList,
  type UniversalListConfig,
  type ListQuery,
  type ListFetchResult,
} from "@/components/common/UniversalList";
import { ReportStatusBadge } from "@/components/common/ReportStatusBadge";
import { ReportRowSkeleton } from "@/components/common/ReportRowSkeleton";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { reportsAPI, type Report } from "@/api/reports";

// ─── Report Row ───────────────────────────────────────────────────────────────

function ReportRow({ item }: { item: Report }) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRtl, formatDate } = useLocalization();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    12,
        borderWidth:     1,
        borderColor:     colors.border,
        padding:         14,
        marginBottom:    10,
      }}
    >
      {/* Row 1: reason + status badge */}
      <View
        style={{
          flexDirection:  isRtl ? "row-reverse" : "row",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   6,
        }}
      >
        <Text
          style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}
          numberOfLines={1}
        >
          {t(`report.reasons.${item.reason}`)}
        </Text>
        <ReportStatusBadge status={item.status} />
      </View>

      {/* Row 2: reportable label */}
      <Text
        style={{
          color:        colors.mutedForeground,
          fontSize:     13,
          textAlign:    isRtl ? "right" : "left",
          marginBottom: 4,
        }}
        numberOfLines={2}
      >
        {item.reportableLabel}
      </Text>

      {/* Row 3: date */}
      <Text
        style={{
          color:     colors.mutedForeground,
          fontSize:  11,
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {t("report.myReports.reportedOn", { date: formatDate(item.createdAt) })}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyReportsScreen() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const fetcher = useCallback(
    async (query: ListQuery): Promise<ListFetchResult<Report>> => {
      const result = await reportsAPI.getMyReports(query.page);
      return {
        items:       result.reports,
        totalCount:  result.pagination.totalCount,
        totalPages:  result.pagination.totalPages,
        currentPage: result.pagination.currentPage,
      };
    },
    []
  );

  const config: UniversalListConfig<Report> = {
    id:                  "my-reports",
    refreshKey,
    fetcher,
    keyExtractor:        (item) => String(item.id),
    renderItem:          ({ item }) => <ReportRow item={item} />,
    numColumns:          1,
    skeletonCount:       5,
    SkeletonComponent:   ReportRowSkeleton,
    emptyIcon:           Flag,
    emptyTitle:          t("report.myReports.empty"),
    perPage:             20,
    contentPaddingBottom: 80,
  };

  return (
    // safeArea={[]} — the Stack header registered in _layout.tsx already handles
    // the top inset; avoid double-inset at the top.
    <ScreenContainer scrollable={false} padded={false} safeArea={[]}>
      <UniversalList config={config} />
    </ScreenContainer>
  );
}
