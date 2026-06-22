/**
 * SavedIllustration — outlined heart for the Saved screen empty state.
 * Single-path line-art, symmetric, centered. Color via useColors().mutedForeground.
 */
import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
}

export function SavedIllustration({ size = 96 }: Props) {
  const colors = useColors();
  const color = colors.mutedForeground;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      {/* Main heart outline */}
      <Path
        d="M48 78C48 78 16 58 16 35C16 25.06 23.06 18 33 18C39.4 18 44.9 21.6 48 27C51.1 21.6 56.6 18 63 18C72.94 18 80 25.06 80 35C80 58 48 78 48 78Z"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small decorative heart inside — suggests "saved with care" */}
      <Path
        d="M48 58C48 58 34 48 34 39C34 34.58 37.58 31 42 31C44.7 31 47.1 32.5 48 35C48.9 32.5 51.3 31 54 31C58.42 31 62 34.58 62 39C62 48 48 58 48 58Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      {/* Tiny sparkle dots around the heart */}
      <Circle cx="22" cy="22" r="2" fill={color} opacity={0.35} />
      <Circle cx="74" cy="22" r="2" fill={color} opacity={0.35} />
      <Circle cx="14" cy="48" r="1.5" fill={color} opacity={0.25} />
      <Circle cx="82" cy="48" r="1.5" fill={color} opacity={0.25} />
    </Svg>
  );
}
