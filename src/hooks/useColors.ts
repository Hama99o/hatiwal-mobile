import { useColorScheme } from "nativewind";

/**
 * Returns inline-style color values that match the CSS custom properties in
 * src/styles/global.css (which drives NativeWind className tokens).
 *
 * Use these ONLY when you need a StyleSheet / inline style value.
 * For JSX layout always prefer `className="bg-primary …"` instead.
 */
export function useColors() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";

  return {
    // Page
    background:            dark ? "hsl(222 84% 5%)"   : "hsl(0 0% 98%)",
    foreground:            dark ? "hsl(210 40% 98%)"  : "hsl(222 47% 11%)",

    // Card
    card:                  dark ? "hsl(222 47% 8%)"   : "hsl(0 0% 100%)",
    cardForeground:        dark ? "hsl(210 40% 98%)"  : "hsl(222 47% 11%)",

    // Primary — blue
    primary:               dark ? "hsl(217 91% 60%)"  : "hsl(221 83% 53%)",
    primaryForeground:     dark ? "hsl(222 47% 11%)"  : "hsl(0 0% 100%)",

    // Secondary — soft neutral
    secondary:             dark ? "hsl(217 33% 17%)"  : "hsl(214 32% 91%)",
    secondaryForeground:   dark ? "hsl(210 40% 98%)"  : "hsl(222 47% 11%)",

    // Muted
    muted:                 dark ? "hsl(217 33% 17%)"  : "hsl(210 40% 96%)",
    mutedForeground:       dark ? "hsl(215 20% 65%)"  : "hsl(215 16% 47%)",

    // Accent
    accent:                dark ? "hsl(217 33% 17%)"  : "hsl(210 40% 96%)",
    accentForeground:      dark ? "hsl(210 40% 98%)"  : "hsl(222 47% 11%)",

    // Destructive
    destructive:           dark ? "hsl(0 63% 31%)"    : "hsl(0 84% 60%)",
    destructiveForeground: dark ? "hsl(0 86% 97%)"    : "hsl(0 0% 98%)",

    // Form / border
    border:                dark ? "hsl(217 33% 17%)"  : "hsl(214 32% 91%)",
    input:                 dark ? "hsl(217 33% 17%)"  : "hsl(214 32% 91%)",
    ring:                  dark ? "hsl(224 76% 48%)"  : "hsl(221 83% 53%)",

    // Semantic extras
    success:               dark ? "hsl(142 71% 45%)"  : "hsl(142 76% 36%)",
    successForeground:     "hsl(0 0% 98%)",
    warning:               dark ? "hsl(38 92% 50%)"   : "hsl(38 92% 40%)",
    warningForeground:     "hsl(0 0% 98%)",

    // Photo placeholder (neutral grey — shown when image is loading or missing)
    imagePlaceholder:      dark ? "hsl(217 33% 17%)"  : "hsl(210 40% 94%)",
  } as const;
}
