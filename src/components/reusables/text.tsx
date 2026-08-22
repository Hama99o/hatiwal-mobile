import { Text as RNText, StyleSheet, type TextProps } from "react-native";
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
  //
  // The WEIGHT has to be resolved here, not left to RN: Android cannot
  // synthesize a bold face for a custom family, so `Rubik_400Regular` +
  // fontWeight 700 gets fake-bolded and the last glyph is clipped (the
  // onboarding button rendered "Nex"). Flattened because `style` may be an
  // array, and because NativeWind merges `font-bold`/`font-semibold` from
  // className into it before we see it — so both spellings are covered.
  const { i18n } = useTranslation();
  const flat = StyleSheet.flatten(style) as { fontWeight?: unknown } | undefined;
  const fontFamily = fontFamilyForLang(i18n.language, flat?.fontWeight);
  return (
    <RNText
      className={cn(className)}
      style={[{ color: baseColor, fontFamily }, style]}
      {...props}
    />
  );
}
