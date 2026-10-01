import { Text as RNText, StyleSheet, type TextProps } from "react-native";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/useColors";
import { useButtonTextColor } from "@/components/reusables/button";
import { brandTextStyle } from "@/lib/fonts";

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
  // The WEIGHT is normalized here, not left to RN: each brand family ships
  // only 400 and 700, and asking for 600 made Android measure and draw the
  // text with different metrics — shrink-wrapped Pashto labels lost their last
  // word. brandTextStyle pins every bold spelling to "700" (a real face), and
  // it goes AFTER `style` so it wins. Flattened because `style` may be an
  // array, and because NativeWind merges `font-bold`/`font-semibold` from
  // className into it before we see it — so both spellings are covered.
  // See src/lib/fonts.ts.
  const { i18n } = useTranslation();
  const flat = StyleSheet.flatten(style) as { fontWeight?: unknown } | undefined;
  const { fontFamily, fontWeight } = brandTextStyle(i18n.language, flat?.fontWeight);
  return (
    <RNText
      className={cn(className)}
      style={[{ color: baseColor, fontFamily }, style, fontWeight ? { fontWeight } : null]}
      {...props}
    />
  );
}
