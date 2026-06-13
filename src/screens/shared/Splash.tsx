// src/screens/shared/Splash.tsx
// Bootstrap / splash screen: validates the stored DeviseTokenAuth token
// against GET /auth/validate_token, then routes to browse or login.
// Never shows either destination screen — avoids any flash of the wrong route.

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { authAPI } from "@/api/auth";
import { secureStorage } from "@/utils/secure-storage";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser } from "@/i18n";
import { useColors } from "@/hooks/useColors";

export default function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const hydrateFromUser = useModeStore((s) => s.hydrateFromUser);
  const colors = useColors();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Check whether we have stored credentials at all before hitting the
      // network — saves a round-trip on a fresh install / after logout.
      const headers = await secureStorage.getAuthHeaders();

      if (!headers) {
        // No stored token — go straight to login.
        if (!cancelled) {
          clearUser();
          router.replace("/(auth)/login");
        }
        return;
      }

      try {
        // Token exists locally; confirm it is still valid with the server.
        const user = await authAPI.validateToken();
        if (!cancelled) {
          setUser(user);
          hydrateFromUser(user.sellerMode);
          applyThemeFromUser(user.preferredTheme);
          await applyLanguageFromUser(user.preferredLanguage);
          router.replace("/(main)/(tabs)/browse");
        }
      } catch {
        // 401 (expired/revoked token) or network error — treat as unauthenticated.
        if (!cancelled) {
          clearUser();
          await secureStorage.clearAuthHeaders();
          router.replace("/(auth)/login");
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityLabel={t("common.splash.validating")}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
