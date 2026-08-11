import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";
import { fontFamilyForLang } from "@/lib/fonts";

interface LabelProps extends TextProps {
  nativeID?: string;
  className?: string;
  children: React.ReactNode;
}

// TASK-P736 (review fix, CR round 2) — `fontFamilyForLang` added so a Label
// renders in the same brand font as the reusables `Text` it's almost always
// paired with (e.g. a `FieldLabel`'s required " *" asterisk, rendered via
// `Text`). Before this, a Label rendered in RN's default system font while
// its own nested `Text` children rendered in Rubik/Zain/Noto Sans Arabic —
// two different fonts in the same line, most visible on ps/fa.
export function Label({ className, children, style, ...props }: LabelProps) {
  const colors = useColors();
  const { i18n } = useTranslation();
  const fontFamily = fontFamilyForLang(i18n.language);
  return (
    <RNText
      className={cn("text-sm font-medium", className)}
      style={[{ color: colors.foreground, fontFamily }, style]}
      {...props}
    >
      {children}
    </RNText>
  );
}
