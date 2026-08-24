import "../src/styles/global.css";
import "../src/i18n";

import { useEffect, useRef, useState } from "react";
import { LogBox, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useThemeStore, loadSavedTheme } from "@/stores/theme.store";
// @ts-ignore — module is installed in Docker container; not resolvable on host
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { Stack, router, usePathname } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner-native";
import { bootstrapAuth } from "@/stores/auth.bootstrap";
import { rememberRoute, consumeSavedRoute } from "@/lib/routeMemory";
// @ts-ignore — expo-font is installed in the Docker container; not resolvable on host
import { useFonts } from "expo-font";
import { FONT_ASSETS } from "@/lib/fonts";

// A LogBox OVERLAY covers the app and makes controls unreachable — it is dev-only
// (LogBox is inert in release), but while it is up neither a person nor a test can
// tap what is behind it. This one message is not actionable: expo-dev-client
// configures linking for its launcher and expo-router configures it for the app,
// so React Navigation logs the conflict in dev builds. There is exactly one
// `scheme` in app.json and expo-router is the only routing plugin.
//
// It cost mode/seller_views_own_listing_buyer_mode a run: the flow failed on
// `Element not found: profile-tab` with the overlay sitting on top of the tab bar,
// and the linking log appeared in 1 of 28 logcats, so it fires on a particular
// dev-client reload rather than on anything the app does.
//
// Scoped to this exact string on purpose. Everything else still raises normally —
// the point is to stop a known non-issue from hiding the UI, not to stop seeing
// errors.
LogBox.ignoreLogs(["Looks like you have configured linking in multiple places"]);

/**
 * Keeps the current route in memory, and once per launch returns the user to
 * wherever a forced restart interrupted them (an LTR<->RTL language switch —
 * `I18nManager.forceRTL` only applies on the next launch).
 *
 * Mounted INSIDE the Stack so `usePathname` has a router to read, and the
 * restore is guarded to run once: `router.replace` changes the path, which would
 * otherwise re-enter this effect and fight the user's next navigation.
 */
function RouteMemory() {
  const pathname = usePathname();
  const restored = useRef(false);

  useEffect(() => {
    rememberRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    consumeSavedRoute().then((saved) => {
      // Same path already? Nothing to do — replacing would be a pointless remount.
      if (saved && saved !== pathname) router.replace(saved as never);
    });
  }, [pathname]);

  return null;
}

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
  // Load brand fonts before showing UI so text never flashes in the system font.
  // useFonts also returns an error we tolerate — if a font fails, RN falls back
  // to system rather than blocking the app forever.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = themeReady && authReady && (fontsLoaded || !!fontError);

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
          {/* Hide everything until theme is resolved to avoid flash of wrong colors.
              The opacity gate is NOT enough on its own, and that shipped a visible
              bug: `opacity: 0` still MOUNTS AND LAYS OUT the whole tree, so every
              Text was measured with SYSTEM-font metrics before Rubik/Zain/Noto
              finished loading. When the fonts landed, the paint switched to the
              brand face — whose glyph advances are wider — but Yoga had no reason
              to re-measure, so single-line labels in tightly-measured boxes lost
              their last character. The first-run onboarding button read "Nex" and
              its skip link "Ski" (QA run-045/046); later screens were fine
              because they mount after the fonts are already loaded.

              So the Stack is not rendered until `ready`, which is the pattern
              Expo's own font example uses (`if (!loaded) return null`). We cannot
              return null from the whole component — ThemeManager below has to stay
              mounted to report themeReady — so the gate goes here instead. This
              also means screens mount ONCE, after fonts, rather than mounting
              invisibly and remounting. */}
          <View style={{ flex: 1, opacity: ready ? 1 : 0 }}>
            {ready && (
            <>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
              </Stack>
              <RouteMemory />
            </>
            )}
            <Toaster position="top-center" richColors />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
