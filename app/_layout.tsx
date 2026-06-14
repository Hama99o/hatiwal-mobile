import "../src/styles/global.css";
import "../src/i18n";

// Polyfill for Expo Go - provide fallback for gesture handler module
if (typeof global !== 'undefined' && !global.RNGestureHandlerModule) {
  global.RNGestureHandlerModule = {
    default: {
      installUIRuntimeBindings: () => {}, // No-op for Expo Go
    },
  };
}

import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";
import { Toaster } from "sonner-native";
import { useThemeStore, loadSavedTheme } from "@/stores/theme.store";
import { bootstrapAuth } from "@/stores/auth.bootstrap";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function ThemeManager({ onReady }: { onReady: () => void }) {
  const theme = useThemeStore((s) => s.theme);
  const [loaded, setLoaded] = useState(false);
  const { colorScheme, setColorScheme } = Platform.OS === "web" ? useColorScheme() : { colorScheme: theme, setColorScheme: () => {} };

  // Load saved theme once on mount
  useEffect(() => {
    loadSavedTheme().finally(() => setLoaded(true));
  }, []);

  // On web: Apply stored preference to NativeWind's color scheme engine
  useEffect(() => {
    if (Platform.OS !== "web" || !loaded) return;
    setColorScheme(theme);
  }, [theme, setColorScheme, loaded]);

  // On web: Sync `dark` class on <html> for CSS custom property cascade
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (colorScheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (loaded) onReady();
  }, [colorScheme, loaded]);

  // On native, signal ready as soon as loaded (we use useColors() hook, not CSS classes)
  useEffect(() => {
    if (loaded && Platform.OS !== "web") onReady();
  }, [loaded]);

  return null;
}

export default function RootLayout() {
  const [themeReady, setThemeReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const ready = themeReady && authReady;

  // Restore the auth session on EVERY app load (any route) before showing the
  // UI — so a logged-in user reloading on a deep route is never flashed the
  // login screen. Resolves fast (optimistic); server validation continues in
  // the background. See src/stores/auth.bootstrap.ts.
  useEffect(() => {
    bootstrapAuth().finally(() => setAuthReady(true));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager onReady={() => setThemeReady(true)} />
      {/* Hide everything until theme is resolved to avoid flash of wrong colors */}
      <View style={{ flex: 1, opacity: ready ? 1 : 0 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        <Toaster position="top-center" richColors />
      </View>
    </QueryClientProvider>
  );
}
