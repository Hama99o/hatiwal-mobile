import { View, ScrollView } from "react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
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

  const inputStyle = { marginBottom: 12, textAlign: (isRtl ? "right" : "left") as "right" | "left" };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingTop: 48 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", textAlign: isRtl ? "right" : "left", marginBottom: 8, color: colors.foreground }}>
        {t("auth.createAccount")}
      </Text>
      <Text style={{ color: colors.mutedForeground, textAlign: isRtl ? "right" : "left", marginBottom: 32 }}>
        {t("auth.subtitle")}
      </Text>

      {error && (
        <Text style={{ color: colors.destructive, marginBottom: 16, textAlign: isRtl ? "right" : "left" }}>
          {error}
        </Text>
      )}

      <Input placeholder={t("auth.firstName")} value={form.firstname} onChangeText={(v) => update("firstname", v)} style={inputStyle} />
      <Input placeholder={t("auth.lastName")} value={form.lastname} onChangeText={(v) => update("lastname", v)} style={inputStyle} />
      <Input placeholder={t("auth.phone")} value={form.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" style={inputStyle} />
      <Input placeholder={t("auth.email")} value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
      <Input placeholder={t("auth.password")} value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry style={inputStyle} />
      <Input placeholder={t("auth.confirmPassword")} value={form.passwordConfirmation} onChangeText={(v) => update("passwordConfirmation", v)} secureTextEntry style={{ marginBottom: 24, textAlign: isRtl ? "right" : "left" }} />

      <Button onPress={handleRegister} disabled={loading} style={{ marginBottom: 16 }}>
        <Text>{loading ? t("common.loading") : t("auth.registerButton")}</Text>
      </Button>

      <Button variant="ghost" onPress={() => router.push("/(auth)/login")}>
        <Text style={{ color: colors.primary }}>{t("auth.haveAccount")} {t("auth.loginButton")}</Text>
      </Button>
    </ScrollView>
  );
}
