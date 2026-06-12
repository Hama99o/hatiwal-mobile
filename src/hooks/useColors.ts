import { useColorScheme } from "react-native";

/**
 * Returns a token-keyed color map that matches the NativeWind CSS variable
 * tokens defined in tailwind.config.js.  Use these ONLY when you need an
 * inline style / StyleSheet value and className isn't an option.
 *
 * For JSX layout always prefer `className="bg-background …"` instead.
 */
export function useColors() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  return {
    background: dark ? "hsl(240 10% 3.9%)" : "hsl(0 0% 100%)",
    foreground: dark ? "hsl(0 0% 98%)" : "hsl(240 10% 3.9%)",
    card: dark ? "hsl(240 10% 3.9%)" : "hsl(0 0% 100%)",
    cardForeground: dark ? "hsl(0 0% 98%)" : "hsl(240 10% 3.9%)",
    primary: dark ? "hsl(0 0% 98%)" : "hsl(240 5.9% 10%)",
    primaryForeground: dark ? "hsl(240 5.9% 10%)" : "hsl(0 0% 98%)",
    secondary: dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 4.8% 95.9%)",
    secondaryForeground: dark ? "hsl(0 0% 98%)" : "hsl(240 5.9% 10%)",
    muted: dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 4.8% 95.9%)",
    mutedForeground: dark ? "hsl(240 5% 64.9%)" : "hsl(240 3.8% 46.1%)",
    accent: dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 4.8% 95.9%)",
    accentForeground: dark ? "hsl(0 0% 98%)" : "hsl(240 5.9% 10%)",
    destructive: dark ? "hsl(0 62.8% 30.6%)" : "hsl(0 72.2% 50.6%)",
    destructiveForeground: dark ? "hsl(0 85.7% 97.3%)" : "hsl(0 0% 98%)",
    border: dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 5.9% 90%)",
    input: dark ? "hsl(240 3.7% 15.9%)" : "hsl(240 5.9% 90%)",
    ring: dark ? "hsl(240 4.9% 83.9%)" : "hsl(240 5.9% 10%)",
    // Extra semantic tokens for marketplace
    success: dark ? "hsl(142 71% 45%)" : "hsl(142 76% 36%)",
    successForeground: "hsl(0 0% 98%)",
    warning: dark ? "hsl(38 92% 50%)" : "hsl(38 92% 40%)",
    warningForeground: "hsl(0 0% 98%)",
  } as const;
}
