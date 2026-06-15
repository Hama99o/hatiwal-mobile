import React, { createContext, useContext } from "react";
import { TouchableOpacity, type TouchableOpacityProps, type ViewStyle, type StyleProp, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { triggerHaptic } from "@/lib/animation/haptics";
import { useReduceMotion } from "@/lib/animation/useReduceMotion";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  variant?: Variant;
  size?: Size;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const ButtonTextColorContext = createContext<string | undefined>(undefined);

export function useButtonTextColor(): string | undefined {
  return useContext(ButtonTextColorContext);
}

export function Button({
  variant = "default",
  size = "default",
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();

  const baseStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    opacity: disabled ? 0.5 : 1,
    ...getSizeStyle(size),
    ...getVariantStyle(variant, colors),
  };
  const combinedStyle = StyleSheet.flatten([baseStyle, style]) as ViewStyle;

  const textColor = getVariantTextColor(variant, colors);

  const handlePress = props.onPress
    ? (e: any) => {
        triggerHaptic(variant === "destructive" ? "medium" : "light", reduceMotion);
        props.onPress!(e);
      }
    : undefined;

  return (
    <ButtonTextColorContext.Provider value={textColor}>
      <TouchableOpacity
        style={combinedStyle}
        disabled={disabled}
        activeOpacity={0.75}
        {...props}
        onPress={handlePress}
      >
        {children}
      </TouchableOpacity>
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
