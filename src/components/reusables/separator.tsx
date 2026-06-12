/**
 * RNR Separator — horizontal divider line.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Separator({ orientation = "horizontal", className }: SeparatorProps) {
  const colors = useColors();

  return (
    <View
      style={[
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginVertical: 4,
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: "100%",
    marginHorizontal: 4,
  },
});
