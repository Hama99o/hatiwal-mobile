import { View, Pressable, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser, type LanguageCode } from "@/i18n";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { registerPushToken } from "@/utils/push-token";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  // When a guest taps a gated action we send them here with `returnTo` so we
  // can drop them back exactly where they were after a successful login.
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const setUser = useAuthStore((s) => s.setUser);
  const hydrateFromUser = useModeStore((s) => s.hydrateFromUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await authAPI.login({ email, password });
      setUser(user);
      hydrateFromUser(user.sellerMode);
      applyThemeFromUser(user.preferredTheme);
      await applyLanguageFromUser(user.preferredLanguage as LanguageCode);
      // Fire-and-forget: register push token after login. Any failure is
      // swallowed inside registerPushToken — it must never block navigation.
      registerPushToken().catch(() => undefined);
      router.replace((returnTo ?? "/(main)/(tabs)/browse") as never);
    } catch (err: any) {
      // devise_token_auth returns { errors: ["Invalid login credentials..."] }
      const apiErrors: string[] = err?.response?.data?.errors ?? [];
      setError(apiErrors.length > 0 ? apiErrors.join(" ") : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      // Platform audit (2026-06-18):
      //   iOS "padding" — lifts content so the keyboard doesn't cover it.
      //   Android "height" — shrinks the KAV container height so the ScrollView
      //   recalculates and the Sign In button stays reachable. Was previously
      //   `undefined` which left the keyboard overlapping content on Android.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Escape hatch — login is never a dead-end now that guests can browse.
          Pinned to the top, outside the scroll, so it never moves. */}
      <Pressable
        onPress={() => router.replace("/(main)/(tabs)/browse")}
        accessibilityRole="button"
        accessibilityLabel={t("auth.continueBrowsing")}
        style={({ pressed }) => ({
          position: "absolute",
          top: 52,
          zIndex: 1,
          ...(isRtl ? { right: 20 } : { left: 20 }),
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: colors.muted,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ShoppingBag size={16} color={colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
          {t("auth.continueBrowsing")}
        </Text>
      </Pressable>

      {/* Scrollable centered form. KeyboardAvoidingView lifts it when the
          on-screen keyboard appears, and the ScrollView lets the user reach the
          Sign in button (below the inputs) on short screens / while typing. */}
      <ScrollView
        style={{ flex: 1 }}
        // Top-aligned + generous top padding (clears the pinned "continue
        // browsing" pill). NOT justifyContent:center — on web that clips the
        // bottom (the Sign in button) when content is taller than the viewport
        // and won't scroll to it. Top-aligned flow keeps the button reachable.
        contentContainerStyle={{ padding: 24, paddingTop: 104, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", textAlign: isRtl ? "right" : "left", marginBottom: 8, color: colors.foreground }}>
          {t("auth.welcome")}
        </Text>
        <Text style={{ color: colors.mutedForeground, textAlign: isRtl ? "right" : "left", marginBottom: 32 }}>
          {t("auth.subtitle")}
        </Text>

        {error && (
          <View style={{ backgroundColor: colors.destructiveAlpha, borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.destructive }}>
            <Text style={{ color: colors.destructive, fontSize: 13, textAlign: isRtl ? "right" : "left" }}>
              {error}
            </Text>
          </View>
        )}

        <Input
          placeholder={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ marginBottom: 12, textAlign: isRtl ? "right" : "left" }}
        />
        <Input
          placeholder={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 24, textAlign: isRtl ? "right" : "left" }}
        />

        <Button onPress={handleLogin} disabled={loading} style={{ marginBottom: 16 }}>
          <Text>{loading ? t("common.loading") : t("auth.loginButton")}</Text>
        </Button>

        <Button variant="ghost" onPress={() => router.push({ pathname: "/(auth)/register", params: returnTo ? { returnTo } : {} })}>
          <Text style={{ color: colors.primary }}>{t("auth.noAccount")} {t("auth.registerButton")}</Text>
        </Button>

        <View style={{ marginTop: 32 }}>
          <LanguageSwitcher />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
