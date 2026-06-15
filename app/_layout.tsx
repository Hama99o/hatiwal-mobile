import "../src/styles/global.css";
import "../src/i18n";

import { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useThemeStore, loadSavedTheme } from "@/stores/theme.store";
// @ts-ignore — module is installed in Docker container; not resolvable on host
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner-native";
import { bootstrapAuth } from "@/stores/auth.bootstrap";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function ThemedStatusBar() {
  const theme = useThemeStore((s) => s.theme);
  const osScheme = useColorScheme();
  const isDark = theme === "system" ? osScheme === "dark" : theme === "dark";
  return <StatusBar style={isDark ? "light" : "dark"} translucent />;
}

function ThemeManager({ onReady }: { onReady: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSavedTheme().finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) onReady();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider MUST wrap the app — every screen's useSafeAreaInsets()
          (tab bar, headers, sheets, footers) returns zeros without it, which
          silently disables all notch / home-indicator spacing. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/* StatusBar — reads the app's own theme store (not just system scheme)
            so icons are correct even when the user has overridden light/dark. */}
        <ThemedStatusBar />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
