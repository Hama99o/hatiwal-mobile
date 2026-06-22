/**
 * RNR Input — NativeWind-aware TextInput wrapper.
 * Uses forwardRef so callers can programmatically focus the input.
 */
import React from "react";
import { TextInput, type TextInputProps, StyleSheet, StyleProp, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface InputProps extends Omit<TextInputProps, "style"> {
  className?: string;
  style?: StyleProp<TextStyle>;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  function Input({ className, style, ...props }, ref) {
    const colors = useColors();

    return (
      <TextInput
        ref={ref}
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
);

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
