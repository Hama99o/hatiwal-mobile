/**
 * ChatIllustration — two overlapping speech bubbles for the Conversations empty state.
 * Single-path line-art, symmetric, centered. Color via useColors().mutedForeground.
 */
import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
}

export function ChatIllustration({ size = 96 }: Props) {
  const colors = useColors();
  const color = colors.mutedForeground;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      {/* Back bubble (slightly offset, lighter) */}
      <Path
        d="M62 22H72C76.42 22 80 25.58 80 30V50C80 54.42 76.42 58 72 58H68L72 70L58 58H50C45.58 58 42 54.42 42 50V46"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      {/* Front bubble */}
      <Path
        d="M46 16H24C19.58 16 16 19.58 16 24V46C16 50.42 19.58 54 24 54H28L24 66L40 54H46C50.42 54 54 50.42 54 46V24C54 19.58 50.42 16 46 16Z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots in front bubble suggesting typing / message */}
      <Circle cx="28" cy="35" r="2.5" fill={color} opacity={0.5} />
      <Circle cx="35" cy="35" r="2.5" fill={color} opacity={0.5} />
      <Circle cx="42" cy="35" r="2.5" fill={color} opacity={0.5} />
    </Svg>
  );
}
