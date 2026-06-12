import "../src/styles/global.css";
import "../src/i18n";

import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";
import { useThemeStore, loadSavedTheme } from "@/stores/theme.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

// Kick off loading saved theme from AsyncStorage as early as possible
loadSavedTheme();

/**
 * Reads the stored theme preference and applies it via nativewind's
 * setColorScheme. Also syncs the `dark` CSS class on <html> for web.
 */
function ThemeManager() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useThemeStore((s) => s.theme);

  // Apply stored preference to NativeWind's color scheme engine
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  // Sync `dark` class on <html> for CSS custom property cascade on web
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (colorScheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [colorScheme]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </QueryClientProvider>
  );
}
