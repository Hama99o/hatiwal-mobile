import { View, ScrollView, TouchableOpacity } from "react-native";
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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const setUser = useAuthStore((s) => s.setUser);
  const hydrateFromUser = useModeStore((s) => s.hydrateFromUser);

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstname: "",
    lastname: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const update = (key: keyof typeof form, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.firstname.trim()) errs.push(t("auth.firstName") + " " + t("common.required"));
    if (!form.lastname.trim()) errs.push(t("auth.lastName") + " " + t("common.required"));
    if (!form.email.trim()) errs.push(t("auth.email") + " " + t("common.required"));
    if (!form.password) errs.push(t("auth.password") + " " + t("common.required"));
    if (form.password && form.passwordConfirmation && form.password !== form.passwordConfirmation) {
      errs.push(t("auth.passwordMismatch"));
    }
    return errs;
  };

  const handleRegister = async () => {
    const clientErrors = validate();
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    try {
      const user = await authAPI.register(form);
      setUser(user);
      hydrateFromUser(user.sellerMode);
      applyThemeFromUser(user.preferredTheme);
      await applyLanguageFromUser(user.preferredLanguage as LanguageCode);
      router.replace((returnTo ?? "/(main)/(tabs)/browse") as never);
    } catch (err: any) {
      // devise_token_auth returns { errors: { full_messages: [...] } } on 422
      const apiErrors: string[] = err?.response?.data?.errors?.full_messages ?? [];
      if (apiErrors.length > 0) {
        setErrors(apiErrors);
      } else {
        setErrors([t("common.error")]);
      }
    } finally {
      setLoading(false);
    }
  };

  const textAlign = isRtl ? "right" : "left";
  const inputStyle = { marginBottom: 12, textAlign: textAlign as "right" | "left" };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingTop: 48 }}
    >
      {/* Escape hatch — let guests leave the form and just browse. */}
      <TouchableOpacity
        onPress={() => router.replace("/(main)/(tabs)/browse")}
        accessibilityRole="button"
        accessibilityLabel={t("auth.continueBrowsing")}
        style={{
          alignSelf: isRtl ? "flex-end" : "flex-start",
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: colors.muted,
          marginBottom: 20,
        }}
      >
        <ShoppingBag size={16} color={colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
          {t("auth.continueBrowsing")}
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 28, fontWeight: "700", textAlign, marginBottom: 8, color: colors.foreground }}>
        {t("auth.createAccount")}
      </Text>
      <Text style={{ color: colors.mutedForeground, textAlign, marginBottom: 32 }}>
        {t("auth.subtitle")}
      </Text>

      {errors.length > 0 && (
        <View
          style={{
            backgroundColor: colors.destructiveAlpha ?? colors.destructive + "18",
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.destructive,
          }}
        >
          {errors.map((msg, i) => (
            <Text key={i} style={{ color: colors.destructive, fontSize: 13, textAlign, lineHeight: 20 }}>
              {i > 0 ? "• " : "• "}{msg}
            </Text>
          ))}
        </View>
      )}

      <Input
        placeholder={t("auth.firstName")}
        value={form.firstname}
        onChangeText={(v) => update("firstname", v)}
        style={inputStyle}
      />
      <Input
        placeholder={t("auth.lastName")}
        value={form.lastname}
        onChangeText={(v) => update("lastname", v)}
        style={inputStyle}
      />
      <Input
        placeholder={t("auth.phone")}
        value={form.phone}
        onChangeText={(v) => update("phone", v)}
        keyboardType="phone-pad"
        style={inputStyle}
      />
      <Input
        placeholder={t("auth.email")}
        value={form.email}
        onChangeText={(v) => update("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        style={inputStyle}
      />
      <Input
        placeholder={t("auth.password")}
        value={form.password}
        onChangeText={(v) => update("password", v)}
        secureTextEntry
        style={inputStyle}
      />
      <Input
        placeholder={t("auth.confirmPassword")}
        value={form.passwordConfirmation}
        onChangeText={(v) => update("passwordConfirmation", v)}
        secureTextEntry
        style={{ marginBottom: 24, textAlign }}
      />

      <Button onPress={handleRegister} disabled={loading} style={{ marginBottom: 16 }}>
        <Text>{loading ? t("common.loading") : t("auth.registerButton")}</Text>
      </Button>

      <Button variant="ghost" onPress={() => router.push({ pathname: "/(auth)/login", params: returnTo ? { returnTo } : {} })}>
        <Text style={{ color: colors.primary }}>
          {t("auth.haveAccount")} {t("auth.loginButton")}
        </Text>
      </Button>
    </ScrollView>
  );
}
