import { View, Pressable, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { ShoppingBag } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Input } from "@/components/reusables/input";
import { Button } from "@/components/reusables/button";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authAPI, type User } from "@/api/auth";
import { useAuthStore } from "@/stores/auth.store";
import { useModeStore } from "@/stores/mode.store";
import { applyThemeFromUser } from "@/stores/theme.store";
import { applyLanguageFromUser, type LanguageCode } from "@/i18n";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { registerPushToken } from "@/utils/push-token";
import { confirmAlert } from "@/utils/alert";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

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
  // Set by the http interceptor when the account is suspended/banned — either on
  // this login attempt or when the user was blocked mid-session and bounced here.
  const blockedNotice = useAuthStore((s) => s.blockedNotice);
  const setBlockedNotice = useAuthStore((s) => s.setBlockedNotice);

  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleClientId =
    Constants.expoConfig?.extra?.googleClientId ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  // iOS-specific OAuth client (bundle ID: com.hatiwal.app, created in Google Console).
  // Falls back to web client ID when not set (Expo Go — Google Sign-In won't complete there).
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? googleClientId;

  const placeholderOrId = googleClientId ?? "not_configured";
  const placeholderOrIosId = googleIosClientId ?? placeholderOrId;

  // Google iOS OAuth clients require the reversed client ID as the redirect URI:
  //   com.googleusercontent.apps.{id}:/oauthredirect
  // This scheme is registered in app.json CFBundleURLTypes so iOS opens the app.
  // When the iOS client ID isn't configured (Expo Go), redirectUri stays undefined
  // and expo-auth-session falls back to exp://... which Google rejects — expected.
  const iosReversedScheme = googleIosClientId
    ? `com.googleusercontent.apps.${googleIosClientId.replace(".apps.googleusercontent.com", "")}`
    : undefined;

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: placeholderOrId,
    iosClientId: placeholderOrIosId,
    androidClientId: placeholderOrId,
    redirectUri: iosReversedScheme ? `${iosReversedScheme}:/oauthredirect` : undefined,
  });

  useEffect(() => {
    if (!googleClientId) return;
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) {
        handleGoogleSignIn(idToken);
      } else {
        setError(t("auth.googleSignInFailed"));
      }
    } else if (googleResponse?.type === "error") {
      setError(t("auth.googleSignInFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  // Build the localized "you are blocked" message (+ admin reason, if any) from
  // the notice. Localized here rather than using the API's English string.
  const blockedMessage = blockedNotice
    ? (() => {
        const base =
          blockedNotice.status === "suspended"
            ? t("auth.blocked.suspended")
            : t("auth.blocked.banned");
        return blockedNotice.reason
          ? `${base} ${t("auth.blocked.reason", { reason: blockedNotice.reason })}`
          : base;
      })()
    : null;

  // Shared post-login bootstrap: set session, hydrate mode/theme/language,
  // register push, and navigate. Used for both a normal login and a restore.
  const enterApp = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setBlockedNotice(null);
    hydrateFromUser(loggedInUser.sellerMode);
    applyThemeFromUser(loggedInUser.preferredTheme);
    await applyLanguageFromUser(loggedInUser.preferredLanguage as LanguageCode);
    // Fire-and-forget: register push token after login. Any failure is swallowed
    // inside registerPushToken — it must never block navigation.
    registerPushToken().catch(() => undefined);
    router.replace((returnTo ?? "/(main)/(tabs)/browse") as never);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setBlockedNotice(null);
    try {
      const user = await authAPI.login({ email, password });

      // Account is in its 30-day deletion grace window: ask whether to restore
      // it or continue with deletion before letting them back in.
      if (user.deletionScheduledAt) {
        setLoading(false);
        confirmAlert(t("auth.restore.title"), t("auth.restore.message"), [
          {
            text: t("auth.restore.keepDeleting"),
            style: "destructive",
            onPress: async () => {
              try {
                await authAPI.logout();
              } catch {
                /* already effectively logged out */
              }
            },
          },
          {
            text: t("auth.restore.restore"),
            style: "default",
            onPress: async () => {
              try {
                const restored = await authAPI.restoreAccount();
                enterApp(restored);
              } catch {
                setError(t("common.error"));
              }
            },
          },
        ]);
        return;
      }

      enterApp(user);
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data;
      // A blocked account is already captured as a notice by the interceptor and
      // shown via `blockedMessage` — don't overwrite it with a generic error.
      const isBlocked =
        httpStatus === 403 && (data?.status === "banned" || data?.status === "suspended");
      if (!isBlocked) {
        // devise_token_auth returns { errors: ["Invalid login credentials..."] }
        const apiErrors: string[] = data?.errors ?? [];
        setError(apiErrors.length > 0 ? apiErrors.join(" ") : t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    setGoogleLoading(true);
    setError(null);
    setBlockedNotice(null);
    try {
      const user = await authAPI.googleSignIn(idToken);
      enterApp(user);
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const data = err?.response?.data;
      const isBlocked =
        httpStatus === 403 && (data?.status === "banned" || data?.status === "suspended");
      if (!isBlocked) {
        setError(t("auth.googleSignInFailed"));
      }
    } finally {
      setGoogleLoading(false);
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
          top: insets.top + 12,
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
        contentContainerStyle={{ padding: 24, paddingTop: insets.top + 64, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", textAlign: isRtl ? "right" : "left", marginBottom: 8, color: colors.foreground }}>
          {t("auth.welcome")}
        </Text>
        <Text style={{ color: colors.mutedForeground, textAlign: isRtl ? "right" : "left", marginBottom: 32 }}>
          {t("auth.subtitle")}
        </Text>

        {(blockedMessage || error) && (
          <View style={{ backgroundColor: colors.destructiveAlpha, borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.destructive }}>
            {blockedMessage && (
              <Text style={{ color: colors.destructive, fontSize: 14, fontWeight: "700", marginBottom: 4, textAlign: isRtl ? "right" : "left" }}>
                {t("auth.blocked.title")}
              </Text>
            )}
            <Text style={{ color: colors.destructive, fontSize: 13, textAlign: isRtl ? "right" : "left" }}>
              {blockedMessage ?? error}
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
          style={{ marginBottom: 12, textAlign: isRtl ? "right" : "left" }}
        />

        <Pressable
          onPress={() => router.push("/(auth)/forgot-password")}
          accessibilityRole="button"
          style={{
            alignSelf: isRtl ? "flex-start" : "flex-end",
            paddingVertical: 4,
            marginBottom: 20,
          }}
          android_ripple={{ color: colors.muted, radius: 80, borderless: true }}
        >
          <Text style={{ color: colors.primary, fontSize: 13 }}>
            {t("auth.forgotPassword")}
          </Text>
        </Pressable>

        <Button onPress={handleLogin} disabled={loading} style={{ marginBottom: 16 }}>
          <Text>{loading ? t("common.loading") : t("auth.loginButton")}</Text>
        </Button>

        {/* Google Sign-In — only shown when a client ID is configured */}
        {!!googleClientId && (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text
                style={{
                  marginHorizontal: 12,
                  fontSize: 12,
                  color: colors.mutedForeground,
                }}
              >
                {t("auth.orDivider")}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <Pressable
              onPress={() => promptGoogleAsync()}
              disabled={googleLoading || !googleRequest}
              accessibilityRole="button"
              accessibilityLabel={t("auth.signInWithGoogle")}
              style={{
                flexDirection: isRtl ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginBottom: 16,
                opacity: (googleLoading || !googleRequest) ? 0.4 : 1,
                backgroundColor: colors.background,
              }}
              android_ripple={{ color: colors.muted }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#4285F4",
                  width: 20,
                  textAlign: "center",
                }}
              >
                G
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: colors.foreground,
                }}
              >
                {googleLoading ? t("common.loading") : t("auth.signInWithGoogle")}
              </Text>
            </Pressable>
          </>
        )}

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
