/**
 * ListingsIllustration — a shop/price tag for My Listings empty state.
 * Single-path line-art, symmetric, centered. Color via useColors().mutedForeground.
 */
import React from "react";
import Svg, { Path, Circle, Line, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
}

export function ListingsIllustration({ size = 96 }: Props) {
  const colors = useColors();
  const color = colors.mutedForeground;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      {/* Price tag body */}
      <Path
        d="M52 14H72C73.1 14 74 14.9 74 16V40C74 40.53 73.79 41.04 73.41 41.41L47.41 67.41C46.63 68.19 45.37 68.19 44.59 67.41L20.59 43.41C19.81 42.63 19.81 41.37 20.59 40.59L46.59 14.59C46.97 14.21 47.47 14 48 14H52Z"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hole in tag (string hole) */}
      <Circle
        cx="64"
        cy="24"
        r="4"
        stroke={color}
        strokeWidth="2"
      />
      {/* Decorative price lines inside the tag */}
      <Line
        x1="36"
        y1="44"
        x2="50"
        y2="44"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.45}
      />
      <Line
        x1="38"
        y1="50"
        x2="48"
        y2="50"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.3}
      />
      {/* Small "plus" badge — "post your first listing" affordance hint */}
      <Circle
        cx="74"
        cy="70"
        r="12"
        stroke={color}
        strokeWidth="2"
        opacity={0.6}
      />
      <Line x1="74" y1="64" x2="74" y2="76" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.6} />
      <Line x1="68" y1="70" x2="80" y2="70" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}
