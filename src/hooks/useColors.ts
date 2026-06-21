import { useColorScheme } from "react-native";
import { useThemeStore } from "@/stores/theme.store";

export function useColors() {
  const theme = useThemeStore((s) => s.theme);
  const osScheme = useColorScheme(); // "dark" | "light" | null — from the OS

  // "system" → follow OS; "dark"/"light" → explicit user choice
  const dark = theme === "system" ? osScheme === "dark" : theme === "dark";

  return {
    // Whether dark mode is currently active — useful for passing to non-themed APIs
    isDark: dark,

    // Page
    background:            dark ? "hsl(222, 84%, 5%)"   : "hsl(0, 0%, 98%)",
    foreground:            dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Card
    card:                  dark ? "hsl(222, 47%, 13%)"  : "hsl(0, 0%, 100%)",
    cardForeground:        dark ? "hsl(210, 40%, 98%)"  : "hsl(222, 47%, 11%)",

    // Primary — blue. Foreground is white in BOTH themes: `primary` is a
    // saturated blue in light AND dark, so text must be white for contrast.
    // (The old dark value hsl(222,47%,11%) was near-black → unreadable "Sign In".)
    primary:               dark ? "hsl(217, 91%, 60%)"  : "hsl(221, 83%, 53%)",
    primaryForeground:     "hsl(0, 0%, 100%)" as string,
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

    // Brand accent — saffron / lapis-fleck gold (#E8B23A), the gold "H" in the
    // Hatiwal mark. Gold stays gold; nudged brighter on dark.
    brandGold:             dark ? "hsl(41, 85%, 62%)"   : "hsl(41, 80%, 57%)",
    // Brand tile — lapis blue base the logo "H" sits on (same in both themes).
    brandLapis:            "hsl(222, 65%, 25%)" as string,

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

    // Overlay — generic translucent dark overlay (e.g. sold thumbnail)
    overlay:               "rgba(0,0,0,0.5)" as string,
    // Reserved overlay — translucent warm amber for the thumbnail status strip
    reservedOverlay:       "rgba(180,83,9,0.85)" as string,

    // Shadow (cast by elevated surfaces — kept black in both themes)
    shadow:                "#000" as string,

    // ── Photo/media overlay surfaces ──────────────────────────────────────────
    // Used for icons and text placed directly on top of photos or dark scrims.
    // Always white — these surfaces are always dark (photo + rgba scrim).
    overlayForeground:     "rgba(255,255,255,1)" as string,
    // Semi-transparent dark scrim (counter badge, header behind gallery, etc.)
    darkScrim:             "rgba(0,0,0,0.45)" as string,
    // Heavier scrim used behind the fullscreen gallery header bar
    darkScrimHeavy:        "rgba(0,0,0,0.65)" as string,
    // Very subtle white separator on dark surfaces
    overlayBorder:         "rgba(255,255,255,0.08)" as string,
    // Inactive dot on dark surface (gallery page dots)
    overlayDotInactive:    "rgba(255,255,255,0.3)" as string,
    // Subtle white button bg on dark surface (close button in fullscreen gallery)
    overlayButtonBg:       "rgba(255,255,255,0.12)" as string,
    // Semi-transparent counter text on dark surface
    overlayTextMuted:      "rgba(255,255,255,0.7)" as string,
    // The fullscreen photo viewer background — always pure black for immersion
    photoViewerBg:         "rgba(0,0,0,1)" as string,
    // Gallery container background when tiles are loading — near-black
    galleryBg:             dark ? "hsl(0, 0%, 7%)" : "hsl(0, 0%, 7%)" as string,
    // Map water/sea base color (OSM tiles background before tiles load)
    mapWater:              dark ? "hsl(210, 20%, 28%)" : "hsl(200, 30%, 80%)" as string,
    // User location dot on map — always a bright blue dot over any map style
    mapUserDotBorder:      "rgba(255,255,255,1)" as string,
    mapUserDotFill:        "hsl(211, 100%, 50%)" as string,
  } as const;
}
