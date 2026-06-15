/**
 * ViewsSparkline — hand-drawn 7-bar chart showing daily view counts.
 *
 * Built from plain Views (no extra charting library). Bar heights are
 * proportional to the maximum count in the dataset. The today bar is
 * rendered slightly darker using an alpha overlay. Day labels use
 * useLocalization() for locale-aware weekday abbreviations. Layout
 * is RTL-safe: when isRtl=true, bars are rendered in reverse order so
 * the oldest day starts on the right.
 *
 * States:
 *   - loading  → 7 skeleton bars (Skeleton from RNR)
 *   - all zero → null (caller decides whether to show EmptyState)
 *   - data     → bar chart
 */

import React from "react";
import { View } from "react-native";

import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import type { ListingAnalyticsEntry } from "@/api/listings";

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_MAX_HEIGHT = 56;  // px — tallest possible bar
const BAR_MIN_HEIGHT = 3;   // px — a hairline so even zero-count shows a floor
const CHART_HEIGHT = BAR_MAX_HEIGHT + 24; // bar area + x-axis label row

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViewsSparklineProps {
  entries: ListingAnalyticsEntry[];
  loading?: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Short weekday abbreviation in the current locale. */
function dayLabel(dateStr: string, lang: string): string {
  const localeMap: Record<string, string> = { ps: "fa-AF", fa: "fa-IR", en: "en-US" };
  const locale = localeMap[lang] ?? "en-US";
  return new Date(dateStr + "T12:00:00").toLocaleDateString(locale, { weekday: "short" });
}

/** Whether a date string (YYYY-MM-DD) matches today. */
function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${d}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SparklineSkeleton() {
  const colors = useColors();
  // Varied heights give the skeleton a natural bar-chart silhouette.
  const heights = [32, 48, 24, 40, 16, 36, 48];

  return (
    <View
      style={{
        height: CHART_HEIGHT,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 4,
        paddingBottom: 20,
      }}
      testID="sparkline-skeleton"
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: h,
            borderRadius: 4,
            backgroundColor: colors.muted,
            opacity: 0.7,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ViewsSparkline({ entries, loading = false }: ViewsSparklineProps) {
  const colors = useColors();
  const { isRtl, lang } = useLocalization();

  if (loading) return <SparklineSkeleton />;
  if (!entries || entries.length === 0) return null;

  const maxCount = Math.max(...entries.map((e) => e.count));

  // RTL: reverse bar order so newest day appears on the left (reading start)
  const ordered = isRtl ? [...entries].reverse() : entries;

  return (
    <View
      style={{ height: CHART_HEIGHT, flexDirection: "row", gap: 4 }}
      testID="views-sparkline"
    >
      {ordered.map((entry) => {
        const today = isToday(entry.date);
        const barHeight =
          maxCount === 0
            ? BAR_MIN_HEIGHT
            : Math.max(BAR_MIN_HEIGHT, (entry.count / maxCount) * BAR_MAX_HEIGHT);

        // Today bar is primary color with stronger opacity; past days are lighter
        const barColor = today ? colors.primary : colors.primary;
        const barOpacity = today ? 1 : 0.45;

        return (
          <View
            key={entry.date}
            style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
          >
            {/* The bar */}
            <View
              style={{
                height: barHeight,
                width: "100%",
                borderRadius: 3,
                backgroundColor: barColor,
                opacity: barOpacity,
                marginBottom: 4,
              }}
              testID={today ? "sparkline-bar-today" : "sparkline-bar"}
            />
            {/* X-axis label */}
            <Text
              style={{
                fontSize: 9,
                color: today ? colors.primary : colors.mutedForeground,
                fontWeight: today ? "700" : "400",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {dayLabel(entry.date, lang)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
