/**
 * NoResultsIllustration — magnifying glass with a dashed circle for Browse no-results.
 * Single-path line-art, symmetric, centered. Color via useColors().mutedForeground.
 */
import React from "react";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
}

export function NoResultsIllustration({ size = 96 }: Props) {
  const colors = useColors();
  const color = colors.mutedForeground;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      {/* Outer dashed search area circle */}
      <Circle
        cx="40"
        cy="40"
        r="26"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      {/* Inner lens circle */}
      <Circle
        cx="40"
        cy="40"
        r="18"
        stroke={color}
        strokeWidth="2"
        opacity={0.45}
      />
      {/* Small dot at centre — "no match" indicator */}
      <Circle
        cx="40"
        cy="40"
        r="3"
        fill={color}
        opacity={0.4}
      />
      {/* Magnifying glass handle */}
      <Line
        x1="60"
        y1="60"
        x2="78"
        y2="78"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Cross / X mark inside lens */}
      <Line
        x1="33"
        y1="33"
        x2="47"
        y2="47"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1="47"
        y1="33"
        x2="33"
        y2="47"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}
