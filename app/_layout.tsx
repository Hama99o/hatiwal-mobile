import "../src/styles/global.css";
import "../src/i18n";

import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";
import { useThemeStore, loadSavedTheme } from "@/stores/theme.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function ThemeManager({ onReady }: { onReady: () => void }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useThemeStore((s) => s.theme);
  const [loaded, setLoaded] = useState(false);

  // Load saved theme once on mount
  useEffect(() => {
    loadSavedTheme().finally(() => setLoaded(true));
  }, []);

  // Apply stored preference to NativeWind's color scheme engine
  useEffect(() => {
    if (loaded) {
      setColorScheme(theme);
    }
  }, [theme, setColorScheme, loaded]);

  // Sync `dark` class on <html> for CSS custom property cascade on web
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (colorScheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (loaded) onReady();
  }, [colorScheme, loaded]);

  // On native, signal ready as soon as loaded
  useEffect(() => {
    if (loaded && Platform.OS !== "web") onReady();
  }, [loaded]);

  return null;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager onReady={() => setReady(true)} />
      {/* Hide everything until theme is resolved to avoid flash of wrong colors */}
      <View style={{ flex: 1, opacity: ready ? 1 : 0 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
