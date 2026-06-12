/**
 * Skeleton — loading placeholder using NativeWind tokens.
 * Animated pulse using React Native Reanimated.
 * Usage: <Skeleton className="h-16 w-full rounded-lg" />
 */
import React, { useEffect } from "react";
import { type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 750 }),
        withTiming(1, { duration: 750 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={cn("bg-muted rounded-md", className)}
      style={[animatedStyle, style]}
      {...props}
    />
  );
}
