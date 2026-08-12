/**
 * RNR Separator — horizontal divider line.
 */
import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  /**
   * Overrides the default `colors.border` line color — e.g. DaySeparator's
   * unread-divider hairline (`colors.primary`) needs a stronger line than
   * the default muted one (TASK-D428, CR MED: extend, don't fork).
   */
  color?: string;
  /**
   * Merged last, after the base orientation styles — lets a caller drop the
   * fixed `width: "100%"` (e.g. `{ flex: 1, width: undefined }`) so the line
   * can grow inside a row alongside other content instead of always being a
   * full-width block.
   */
  style?: ViewStyle;
}

export function Separator({ orientation = "horizontal", className, color, style }: SeparatorProps) {
  const colors = useColors();

  return (
    <View
      style={[
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        { backgroundColor: color ?? colors.border },
        style,
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
