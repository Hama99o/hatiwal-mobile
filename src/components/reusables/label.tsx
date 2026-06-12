import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";

interface LabelProps extends TextProps {
  nativeID?: string;
  className?: string;
  children: React.ReactNode;
}

export function Label({ className, children, style, ...props }: LabelProps) {
  const colors = useColors();
  return (
    <RNText
      className={cn("text-sm font-medium", className)}
      style={[{ color: colors.foreground }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}
