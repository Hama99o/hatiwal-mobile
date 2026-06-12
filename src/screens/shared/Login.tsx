import { View, TextInput, TouchableOpacity } from "react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useLocalization } from "@/hooks/useLocalization";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

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
      router.replace("/(main)/(tabs)/browse");
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", textAlign: isRtl ? "right" : "left", marginBottom: 8 }}>
        {t("auth.welcome")}
      </Text>
      <Text style={{ color: "#666", textAlign: isRtl ? "right" : "left", marginBottom: 32 }}>
        {t("auth.subtitle")}
      </Text>

      {error && (
        <Text style={{ color: "red", marginBottom: 16, textAlign: isRtl ? "right" : "left" }}>
          {error}
        </Text>
      )}

      <TextInput
        placeholder={t("auth.email")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12, textAlign: isRtl ? "right" : "left" }}
      />
      <TextInput
        placeholder={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 24, textAlign: isRtl ? "right" : "left" }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: "#2563EB", borderRadius: 8, padding: 16, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          {loading ? t("common.loading") : t("auth.loginButton")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/register")}
        style={{ marginTop: 16, alignItems: "center" }}
      >
        <Text style={{ color: "#2563EB" }}>{t("auth.noAccount")} {t("auth.registerButton")}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 32 }}>
        <LanguageSwitcher />
      </View>
    </View>
  );
}
