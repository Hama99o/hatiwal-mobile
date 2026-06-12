/**
 * RNR Label — styled text for form field labels.
 */
import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

interface LabelProps extends TextProps {
  nativeID?: string;
  className?: string;
  children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <RNText
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
    </RNText>
  );
}
