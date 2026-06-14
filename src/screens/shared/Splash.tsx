// src/screens/shared/Splash.tsx
// Bootstrap / splash: ensures the stored session is restored, then routes to
// the feed. The auth hydration itself lives in src/stores/auth.bootstrap.ts
// (shared with the root layout, so deep-route reloads hydrate too). Guests and
// logged-in users both land on Browse; account-only actions prompt login on
// demand. Never shows the wrong screen — avoids any flash.

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { bootstrapAuth } from "@/stores/auth.bootstrap";
import { useColors } from "@/hooks/useColors";

export default function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    let cancelled = false;
    // bootstrapAuth is idempotent (the root layout also calls it) and resolves
    // fast — it sets the optimistic auth state, then validates in the background.
    bootstrapAuth().finally(() => {
      if (!cancelled) router.replace("/(main)/(tabs)/browse");
    });
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
