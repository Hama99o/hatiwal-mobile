import React, { createContext, useContext } from "react";
import { Pressable, type PressableProps, type ViewStyle, StyleSheet } from "react-native";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

export const ButtonTextColorContext = createContext<string | undefined>(undefined);

export function useButtonTextColor(): string | undefined {
  return useContext(ButtonTextColorContext);
}

export function Button({
  variant = "default",
  size = "default",
  className,
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const colors = useColors();

  const baseStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    opacity: disabled ? 0.5 : 1,
    ...getSizeStyle(size),
    ...getVariantStyle(variant, colors),
  };

  const textColor = getVariantTextColor(variant, colors);

  return (
    <ButtonTextColorContext.Provider value={textColor}>
      <Pressable
        style={({ pressed }) => [
          baseStyle,
          pressed && { opacity: disabled ? 0.5 : 0.75 },
          style,
        ]}
        disabled={disabled}
        android_ripple={{ color: colors.muted }}
        {...props}
      >
        {children}
      </Pressable>
    </ButtonTextColorContext.Provider>
  );
}

function getSizeStyle(size: Size): ViewStyle {
  switch (size) {
    case "sm":   return { paddingHorizontal: 12, paddingVertical: 6, minHeight: 36 };
    case "lg":   return { paddingHorizontal: 24, paddingVertical: 14, minHeight: 52 };
    case "icon": return { width: 40, height: 40 };
    default:     return { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44 };
  }
}

function getVariantStyle(variant: Variant, colors: ReturnType<typeof useColors>): ViewStyle {
  switch (variant) {
    case "outline":
      return { borderWidth: 1, borderColor: colors.border, backgroundColor: "transparent" };
    case "ghost":
      return { backgroundColor: "transparent" };
    case "destructive":
      return { backgroundColor: colors.destructive };
    case "secondary":
      return { backgroundColor: colors.secondary };
    default:
      return { backgroundColor: colors.primary };
  }
}

function getVariantTextColor(variant: Variant, colors: ReturnType<typeof useColors>): string {
  switch (variant) {
    case "outline":
    case "ghost":
      return colors.foreground;
    case "destructive":
      return colors.destructiveForeground;
    case "secondary":
      return colors.secondaryForeground;
    default:
      return colors.primaryForeground;
  }
}
