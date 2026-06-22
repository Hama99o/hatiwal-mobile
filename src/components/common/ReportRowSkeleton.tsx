/**
 * ReportRowSkeleton — loading placeholder that mirrors a report row in MyReports.
 */

import { View } from "react-native";
import { Skeleton } from "@/components/reusables/skeleton";
import { useColors } from "@/hooks/useColors";

export function ReportRowSkeleton() {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    12,
        borderWidth:     1,
        borderColor:     colors.border,
        padding:         14,
        gap:             10,
      }}
    >
      {/* Row 1: reason + status badge */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton style={{ width: 120, height: 14, borderRadius: 6 }} />
        <Skeleton style={{ width: 70, height: 20, borderRadius: 999 }} />
      </View>
      {/* Row 2: target label */}
      <Skeleton style={{ width: "70%", height: 13, borderRadius: 6 }} />
      {/* Row 3: date */}
      <Skeleton style={{ width: 100, height: 12, borderRadius: 6 }} />
    </View>
  );
}
