import { View, ScrollView, Pressable, type TextInput } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authAPI } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser, type LanguageCode } from "@/i18n";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { registerPushToken } from "@/utils/push-token";

export default function RegisterScreen() {
  // Six fields is a lot to fill on a phone. Chaining them means the keyboard's
  // "next" walks the form instead of the user dismissing it and tapping each one.
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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
      // Fire-and-forget: register push token after registration. Any failure is
      // swallowed inside registerPushToken — it must never block navigation.
      registerPushToken().catch(() => undefined);
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
      <Pressable
        onPress={() => router.replace("/(main)/(tabs)/browse")}
        accessibilityRole="button"
        accessibilityLabel={t("auth.continueBrowsing")}
        style={({ pressed }) => ({
          alignSelf: isRtl ? "flex-end" : "flex-start",
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: colors.muted,
          marginBottom: 20,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ShoppingBag size={16} color={colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
          {t("auth.continueBrowsing")}
        </Text>
      </Pressable>

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
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastNameRef.current?.focus()}
        style={inputStyle}
      />
      <Input
        ref={lastNameRef}
        placeholder={t("auth.lastName")}
        value={form.lastname}
        onChangeText={(v) => update("lastname", v)}
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => phoneRef.current?.focus()}
        style={inputStyle}
      />
      <Input
        ref={phoneRef}
        placeholder={t("auth.phone")}
        value={form.phone}
        onChangeText={(v) => update("phone", v)}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        style={inputStyle}
      />
      <Input
        ref={emailRef}
        placeholder={t("auth.email")}
        value={form.email}
        onChangeText={(v) => update("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        // autocorrect on an email address silently rewrites it, and the failure
        // that follows gives the user no clue why.
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        style={inputStyle}
      />
      {/* Only the margin here — `inputStyle` also carries textAlign, which is a
          text style and does not belong on a View. PasswordInput handles its own
          RTL alignment internally. */}
      <View style={{ marginBottom: 12 }}>
        <PasswordInput
          ref={passwordRef}
          placeholder={t("auth.password")}
          value={form.password}
          onChangeText={(v) => update("password", v)}
          purpose="new"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
      </View>
      <View style={{ marginBottom: 24 }}>
        <PasswordInput
          ref={confirmRef}
          placeholder={t("auth.confirmPassword")}
          value={form.passwordConfirmation}
          onChangeText={(v) => update("passwordConfirmation", v)}
          purpose="new"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
        />
      </View>

      {/* testID because "Create Account" is BOTH this button's label
          (auth.registerButton) and the screen's heading (auth.createAccount), so
          the words alone cannot identify it. */}
      <Button
        testID="register-submit"
        onPress={handleRegister}
        disabled={loading}
        style={{ marginBottom: 16 }}
      >
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
