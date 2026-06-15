import React from "react";
import { type ViewProps } from "react-native";
import Animated from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { usePulse } from "@/lib/animation";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const pulseStyle = usePulse();
  const colors = useColors();

  return (
    <Animated.View
      className={cn("rounded-md", className)}
      style={[{ backgroundColor: colors.muted }, pulseStyle, style]}
      {...props}
    />
  );
}
