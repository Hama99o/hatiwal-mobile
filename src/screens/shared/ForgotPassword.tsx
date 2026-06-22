import { View, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from "expo-router";
import { authAPI } from "@/api/auth";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await authAPI.forgotPassword(email.trim());
      // Always show generic success — don't expose whether email exists
      setSent(true);
    } catch {
      // Show generic success regardless of 404 (don't expose account existence)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            textAlign: isRtl ? "right" : "left",
            marginBottom: 8,
            color: colors.foreground,
          }}
        >
          {t("auth.forgotPasswordTitle")}
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            textAlign: isRtl ? "right" : "left",
            marginBottom: 32,
          }}
        >
          {t("auth.forgotPasswordSubtitle")}
        </Text>

        {sent ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 14,
                textAlign: isRtl ? "right" : "left",
              }}
            >
              {t("auth.resetLinkSent")}
            </Text>
          </View>
        ) : (
          <>
            {error && (
              <View
                style={{
                  backgroundColor: colors.destructiveAlpha,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: colors.destructive,
                }}
              >
                <Text
                  style={{
                    color: colors.destructive,
                    fontSize: 13,
                    textAlign: isRtl ? "right" : "left",
                  }}
                >
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
              style={{ marginBottom: 24, textAlign: isRtl ? "right" : "left" }}
            />

            <Button onPress={handleSend} disabled={loading || !email.trim()} style={{ marginBottom: 16 }}>
              <Text>{loading ? t("common.loading") : t("auth.sendResetLink")}</Text>
            </Button>
          </>
        )}

        <Button variant="ghost" onPress={() => router.back()} style={{ marginTop: sent ? 0 : 4 }}>
          <Text style={{ color: colors.primary }}>
            {t("auth.hasAccount")} {t("auth.loginButton")}
          </Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
