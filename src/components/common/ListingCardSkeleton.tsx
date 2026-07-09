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

      <View style={{ padding: 10, paddingTop: 8, gap: 5 }}>
        {/* Price — 17sp bold, matches PriceTag md */}
        <SkeletonBlock width={80} height={17} />
        {/* Badge-slot placeholder — mirrors the real card's fixed-height badge
            slot (firm-price / price-drop badge) so the loading→loaded swap
            doesn't jump in height. */}
        <SkeletonBlock width={64} height={18} style={{ borderRadius: 999 }} />
        {/* Title line 1 */}
        <SkeletonBlock height={13} style={{ marginTop: 1 }} />
        {/* Title line 2 — shorter */}
        <SkeletonBlock width="68%" height={13} />
        {/* Location meta */}
        <View style={{ flexDirection: "row", gap: 4, marginTop: 2, alignItems: "center" }}>
          <SkeletonBlock width={10} height={10} style={{ borderRadius: 999 }} />
          <SkeletonBlock width={56} height={11} />
        </View>
      </View>
    </View>
  );
}

/** Horizontal skeleton that mirrors ListingCard variant="list" */
export function ListingCardListSkeleton() {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        minHeight: 96,
      }}
    >
      {/* Thumbnail — matches listImageContainer: width 108, 4:3 ratio */}
      <SkeletonBlock
        width={108}
        style={{ aspectRatio: 4 / 3, borderRadius: 0, flexShrink: 0 } as object}
      />
      <View style={{ flex: 1, padding: 10, gap: 6, justifyContent: "center" }}>
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
