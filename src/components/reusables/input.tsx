/**
 * RNR Input — NativeWind-aware TextInput wrapper.
 */
import React from "react";
import { TextInput, type TextInputProps, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface InputProps extends TextInputProps {
  className?: string;
  style?: ViewStyle | TextStyle;
}

export function Input({ className, style, ...props }: InputProps) {
  const colors = useColors();

  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={[
        styles.base,
        {
          borderColor: colors.border,
          backgroundColor: colors.background,
          color: colors.foreground,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
});
