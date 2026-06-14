import { useColorScheme } from "nativewind";

export function useColors() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";

  return {
    // Page
    background:            dark ? "hsl(222, 84%, 5%)"   : "hsl(0, 0%, 98%)",
    foreground:            dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Card
    card:                  dark ? "hsl(222, 47%, 13%)"  : "hsl(0, 0%, 100%)",
    cardForeground:        dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Primary — blue
    primary:               dark ? "hsl(217, 91%, 60%)"  : "hsl(221, 83%, 53%)",
    primaryForeground:     dark ? "hsl(222, 47%, 11%)"  : "hsl(0, 0%, 100%)",
    primaryAlpha:          dark ? "rgba(59,130,246,0.12)"  : "rgba(37,99,235,0.10)",

    // Secondary — soft neutral
    secondary:             dark ? "hsl(217, 33%, 17%)"  : "hsl(214, 32%, 91%)",
    secondaryForeground:   dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Muted
    muted:                 dark ? "hsl(217, 33%, 17%)"  : "hsl(210, 40%, 96%)",
    mutedForeground:       dark ? "hsl(215, 20%, 65%)"  : "hsl(215, 16%, 47%)",

    // Accent
    accent:                dark ? "hsl(217, 33%, 17%)"  : "hsl(210, 40%, 96%)",
    accentForeground:      dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Destructive
    destructive:           dark ? "hsl(0, 72%, 51%)"    : "hsl(0, 84%, 60%)",
    destructiveForeground: dark ? "hsl(0, 0%, 98%)"     : "hsl(0, 0%, 98%)",
    destructiveAlpha:      dark ? "rgba(220,38,38,0.12)" : "rgba(220,38,38,0.08)",

    // Form / border
    border:                dark ? "hsl(217, 33%, 22%)"  : "hsl(214, 32%, 91%)",
    input:                 dark ? "hsl(217, 33%, 17%)"  : "hsl(214, 32%, 91%)",
    ring:                  dark ? "hsl(224, 76%, 48%)"  : "hsl(221, 83%, 53%)",

    // Semantic extras
    success:               dark ? "hsl(142, 71%, 45%)"  : "hsl(142, 76%, 36%)",
    successForeground:     "hsl(0, 0%, 98%)" as string,
    successAlpha:          dark ? "rgba(34,197,94,0.15)"  : "rgba(22,163,74,0.12)",
    warning:               dark ? "hsl(38, 92%, 50%)"   : "hsl(38, 92%, 40%)",
    warningForeground:     "hsl(0, 0%, 98%)" as string,
    warningAlpha:          dark ? "rgba(245,158,11,0.15)" : "rgba(180,83,9,0.10)",

    // Photo placeholder (neutral grey — shown when image is loading or missing)
    imagePlaceholder:      dark ? "hsl(217, 33%, 17%)"  : "hsl(210, 40%, 94%)",

    // Overlay
    overlay:               "rgba(0,0,0,0.5)" as string,

    // Shadow (cast by elevated surfaces — kept black in both themes)
    shadow:                "#000" as string,
  } as const;
}
