import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser, type LanguageCode } from "@/i18n";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
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
      router.replace("/(main)/(tabs)/browse");
    } catch (err: any) {
      // devise_token_auth returns { errors: ["Invalid login credentials..."] }
      const apiErrors: string[] = err?.response?.data?.errors ?? [];
      setError(apiErrors.length > 0 ? apiErrors.join(" ") : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.background }}>
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

      <Button variant="ghost" onPress={() => router.push("/(auth)/register")}>
        <Text style={{ color: colors.primary }}>{t("auth.noAccount")} {t("auth.registerButton")}</Text>
      </Button>

      <View style={{ marginTop: 32 }}>
        <LanguageSwitcher />
      </View>
    </View>
  );
}
