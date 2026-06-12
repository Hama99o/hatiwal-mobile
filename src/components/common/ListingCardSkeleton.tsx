import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
}

/** Single shimmer block — reusable pulse animation */
function SkeletonBlock({ className }: SkeletonBlockProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 800 }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animStyle}
      className={cn("bg-muted rounded-md", className)}
    />
  );
}

interface ListingCardSkeletonProps {
  className?: string;
}

/**
 * ListingCardSkeleton — mirrors the ListingCard layout exactly.
 * Used while the feed is loading (skeleton pattern, not spinner).
 */
export function ListingCardSkeleton({ className }: ListingCardSkeletonProps) {
  return (
    <View
      className={cn(
        "bg-card rounded-lg overflow-hidden border border-border",
        className
      )}
    >
      {/* Photo placeholder — 4:3 ratio */}
      <SkeletonBlock className="w-full aspect-[4/3] rounded-none" />

      <View className="p-3 gap-2">
        {/* Price */}
        <SkeletonBlock className="h-5 w-24 rounded-md" />
        {/* Title line 1 */}
        <SkeletonBlock className="h-4 w-full rounded-md" />
        {/* Title line 2 (shorter) */}
        <SkeletonBlock className="h-4 w-3/4 rounded-md" />
        {/* Meta row: city + time */}
        <View className="flex-row gap-2 mt-1">
          <SkeletonBlock className="h-3 w-16 rounded-md" />
          <SkeletonBlock className="h-3 w-20 rounded-md" />
        </View>
      </View>
    </View>
  );
}

/** Renders a grid of skeleton cards for the feed loading state */
export function ListingCardSkeletonGrid({
  count = 6,
}: {
  count?: number;
}) {
  return (
    <View className="flex-row flex-wrap gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-1 min-w-[45%]">
          <ListingCardSkeleton />
        </View>
      ))}
    </View>
  );
}
