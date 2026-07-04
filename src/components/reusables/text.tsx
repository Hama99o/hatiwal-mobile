import { Text as RNText, type TextProps } from "react-native";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";
import { useButtonTextColor } from "@/components/reusables/button";
import { fontFamilyForLang } from "@/lib/fonts";

interface Props extends TextProps {
  className?: string;
}

export function Text({ className, style, ...props }: Props) {
  const colors = useColors();
  const buttonTextColor = useButtonTextColor();
  const baseColor = buttonTextColor ?? colors.foreground;
  // Brand font for the active language (Rubik / Zain / Noto Sans Arabic — see
  // src/lib/fonts.ts). Placed before `style` so a caller can still override.
  const { i18n } = useTranslation();
  const fontFamily = fontFamilyForLang(i18n.language);
  return (
    <RNText
      className={cn(className)}
      style={[{ color: baseColor, fontFamily }, style]}
      {...props}
    />
  );
}
