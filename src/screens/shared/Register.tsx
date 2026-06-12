import { View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useLocalization } from "@/hooks/useLocalization";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstname: "",
    lastname: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await authAPI.register(form);
      setUser(user);
      router.replace("/(main)/(tabs)/browse");
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 48 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", textAlign: isRtl ? "right" : "left", marginBottom: 8 }}>
        {t("auth.createAccount")}
      </Text>
      <Text style={{ color: "#666", textAlign: isRtl ? "right" : "left", marginBottom: 32 }}>
        {t("auth.subtitle")}
      </Text>

      {error && (
        <Text style={{ color: "red", marginBottom: 16, textAlign: isRtl ? "right" : "left" }}>
          {error}
        </Text>
      )}

      <TextInput placeholder={t("auth.firstName")} value={form.firstname} onChangeText={(v) => update("firstname", v)} style={inputStyle} />
      <TextInput placeholder={t("auth.lastName")} value={form.lastname} onChangeText={(v) => update("lastname", v)} style={inputStyle} />
      <TextInput placeholder={t("auth.phone")} value={form.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" style={inputStyle} />
      <TextInput placeholder={t("auth.email")} value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
      <TextInput placeholder={t("auth.password")} value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry style={inputStyle} />
      <TextInput placeholder={t("auth.confirmPassword")} value={form.passwordConfirmation} onChangeText={(v) => update("passwordConfirmation", v)} secureTextEntry style={inputStyle} />

      <TouchableOpacity
        onPress={handleRegister}
        disabled={loading}
        style={{ backgroundColor: "#2563EB", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          {loading ? t("common.loading") : t("auth.registerButton")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={{ marginTop: 16, alignItems: "center" }}
      >
        <Text style={{ color: "#2563EB" }}>{t("auth.haveAccount")} {t("auth.loginButton")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
