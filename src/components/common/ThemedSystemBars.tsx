import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColors } from "@/hooks/useColors";

/**
 * Status bar icons AND the native root background follow the APP's theme.
 *
 * The status bar is translucent and Android draws edge-to-edge, so the strip
 * behind the clock and the one behind the navigation bar show the native root
 * view, not any screen. That view keeps the OS colour scheme: with the app in
 * Dark on a phone in light mode, both strips stayed near-white around a dark
 * screen, and the white status icons on them were unreadable (1.1.4 QA,
 * 2026-10-02). Painting the root with the theme's background fixes both.
 */
export function ThemedSystemBars() {
  const { isDark, background } = useColors();

  useEffect(() => {
    // Best-effort: never let a missing native module or a rejected call surface.
    SystemUI.setBackgroundColorAsync(background).catch(() => undefined);
  }, [background]);

  return <StatusBar style={isDark ? "light" : "dark"} translucent />;
}
