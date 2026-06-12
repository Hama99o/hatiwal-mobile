/**
 * RNR Textarea — multi-line TextInput.
 */
import React from "react";
import { TextInput, type TextInputProps, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface TextareaProps extends TextInputProps {
  className?: string;
}

export function Textarea({ className, style, ...props }: TextareaProps) {
  const colors = useColors();

  return (
    <TextInput
      multiline
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
    minHeight: 96,
    textAlignVertical: "top",
  },
});
