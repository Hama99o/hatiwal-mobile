import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { usePulse } from "@/lib/animation";

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
  // usePulse() is reduce-motion aware: static opacity when Reduce Motion is on.
  const animStyle = usePulse();

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

  // Mirrors ListingCard variant="grid": square rounded photo, no box, then a
  // 24dp price row, an 18dp one-line title and a 16dp meta row.
  return (
    <View>
      <SkeletonBlock style={{ aspectRatio: 1, borderRadius: 12 }} />
      <View style={{ paddingTop: 8, paddingHorizontal: 2, gap: 2 }}>
        <View style={{ height: 24, justifyContent: "center" }}>
          <SkeletonBlock width={80} height={17} />
        </View>
        <View style={{ height: 18, justifyContent: "center" }}>
          <SkeletonBlock width="85%" height={13} />
        </View>
        <View style={{ height: 16, flexDirection: "row", gap: 4, alignItems: "center" }}>
          <SkeletonBlock width={10} height={10} style={{ borderRadius: 999 }} />
          <SkeletonBlock width={56} height={11} />
        </View>
      </View>
    </View>
  );
}

/** Horizontal skeleton that mirrors ListingCard variant="list" */
export function ListingCardListSkeleton() {
  // Mirrors ListingCard variant="list": 96dp rounded square photo, no box.
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      <SkeletonBlock width={96} height={96} style={{ borderRadius: 10, flexShrink: 0 }} />
      <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>
        <SkeletonBlock width={80} height={16} />
        <SkeletonBlock height={13} />
        <SkeletonBlock width="70%" height={13} />
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center", marginTop: 2 }}>
          <SkeletonBlock width={10} height={10} style={{ borderRadius: 999 }} />
          <SkeletonBlock width={56} height={11} />
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
        minHeight: 72,
      }}
    >
      {/* Listing thumbnail square */}
      <SkeletonBlock width={52} height={52} style={{ borderRadius: 10, flexShrink: 0 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SkeletonBlock width={140} height={14} />
          <SkeletonBlock width={40} height={11} />
        </View>
        <SkeletonBlock width={90} height={12} />
        <SkeletonBlock width="75%" height={12} />
      </View>
    </View>
  );
}
