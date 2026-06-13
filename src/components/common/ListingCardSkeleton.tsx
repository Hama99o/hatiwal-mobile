import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useColors } from "@/hooks/useColors";

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width?: number | string;
  height?: number | string;
  style?: object;
}) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 850 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.muted,
          borderRadius: 6,
          width: width ?? "100%",
          height: height ?? 16,
        },
        style,
        animStyle,
      ]}
    />
  );
}

export function ListingCardSkeleton() {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Photo placeholder — 4:3 ratio */}
      <SkeletonBlock style={{ aspectRatio: 4 / 3, borderRadius: 0 }} />

      <View style={{ padding: 12, gap: 8 }}>
        {/* Price */}
        <SkeletonBlock width={88} height={20} />
        {/* Title line 1 */}
        <SkeletonBlock height={14} />
        {/* Title line 2 — shorter */}
        <SkeletonBlock width="72%" height={14} />
        {/* Meta row */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
          <SkeletonBlock width={56} height={12} />
          <SkeletonBlock width={72} height={12} />
        </View>
      </View>
    </View>
  );
}

export function ListingCardSkeletonGrid({ count = 6 }: { count?: number }) {
  const pairs: number[][] = [];
  for (let i = 0; i < count; i += 2) {
    pairs.push([i, i + 1].filter((j) => j < count));
  }

  return (
    <View style={{ padding: 12, gap: 10 }}>
      {pairs.map((pair, pi) => (
        <View key={pi} style={{ flexDirection: "row", gap: 10 }}>
          {pair.map((i) => (
            <View key={i} style={{ flex: 1 }}>
              <ListingCardSkeleton />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ConversationRowSkeleton() {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      {/* Avatar circle */}
      <SkeletonBlock width={48} height={48} style={{ borderRadius: 24, flexShrink: 0 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SkeletonBlock width={120} height={14} />
          <SkeletonBlock width={48} height={12} />
        </View>
        <SkeletonBlock width="80%" height={13} />
      </View>
    </View>
  );
}
