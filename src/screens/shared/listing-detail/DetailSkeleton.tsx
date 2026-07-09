/**
 * DetailSkeleton — loading placeholder for the ListingDetail screen.
 * Mirrors the real layout (gallery + info + sticky bar) to prevent layout shift.
 */

import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Skeleton } from "@/components/reusables/skeleton";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "@/lib/animation";

const { width: SW } = Dimensions.get("window");

export function DetailSkeleton() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  // When Reduce Motion is on, return undefined so Reanimated skips the entering transition.
  const e = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(300);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Photo area — same 4:3 aspect as the real gallery */}
      <Skeleton
        style={{
          width: SW,
          aspectRatio: 4 / 3,
          borderRadius: 0,
          backgroundColor: colors.muted,
        }}
      />

      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* Price — widest block, tallest height, matches "lg" PriceTag */}
        <Animated.View entering={e(60)}>
          <Skeleton
            style={{
              width: 150,
              height: 28,
              backgroundColor: colors.muted,
              borderRadius: 6,
            }}
          />
        </Animated.View>

        {/* Title — two lines */}
        <Animated.View entering={e(120)} style={{ gap: 8 }}>
          <Skeleton style={{ width: "92%", height: 18, backgroundColor: colors.muted, borderRadius: 6 }} />
          <Skeleton style={{ width: "65%", height: 18, backgroundColor: colors.muted, borderRadius: 6 }} />
        </Animated.View>

        {/* Category + condition chips */}
        <Animated.View entering={e(160)} style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton style={{ width: 88, height: 26, backgroundColor: colors.muted, borderRadius: 999 }} />
          <Skeleton style={{ width: 72, height: 26, backgroundColor: colors.muted, borderRadius: 999 }} />
        </Animated.View>

        {/* Meta row: location + views */}
        <Animated.View entering={e(200)} style={{ flexDirection: "row", gap: 12 }}>
          <Skeleton style={{ width: 80, height: 13, backgroundColor: colors.muted, borderRadius: 4 }} />
          <Skeleton style={{ width: 60, height: 13, backgroundColor: colors.muted, borderRadius: 4 }} />
        </Animated.View>

        {/* Description lines */}
        <Animated.View entering={e(260)} style={{ gap: 8, marginTop: 8 }}>
          <Skeleton style={{ width: "100%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }} />
          <Skeleton style={{ width: "100%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }} />
          <Skeleton style={{ width: "78%", height: 14, backgroundColor: colors.muted, borderRadius: 4 }} />
        </Animated.View>

        {/* Seller row */}
        <Animated.View
          entering={e(340)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}
        >
          <Skeleton
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              flexShrink: 0,
              backgroundColor: colors.muted,
            }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton style={{ width: 120, height: 14, backgroundColor: colors.muted, borderRadius: 4 }} />
            <Skeleton style={{ width: 80, height: 12, backgroundColor: colors.muted, borderRadius: 4 }} />
          </View>
        </Animated.View>
      </View>

      {/* Sticky action bar skeleton — same height as the real bar */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
      >
        <Skeleton
          style={{
            flex: 2,
            height: 50,
            borderRadius: 8,
            backgroundColor: colors.muted,
          }}
        />
        <Skeleton
          style={{
            flex: 3,
            height: 50,
            borderRadius: 8,
            backgroundColor: colors.muted,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
});
