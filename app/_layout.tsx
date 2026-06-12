import "../src/styles/global.css";
import "../src/i18n";

import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

/** Syncs the OS color scheme → `dark` class on <html> so NativeWind className dark: variants work on web. */
function DarkModeManager() {
  const { colorScheme } = useColorScheme();

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
      <DarkModeManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </QueryClientProvider>
  );
}
