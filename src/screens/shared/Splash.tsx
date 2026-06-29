// src/screens/shared/Splash.tsx
//
// Bootstrap / splash screen.
// On mount: calls bootstrapAuth() which reads the stored token from
// secureStorage and sets the auth store optimistically. Then:
//   - A genuinely fresh install (no stored token AND onboarding not yet
//     seen/skipped — see @/utils/onboarding) is routed to /onboarding first.
//   - Everyone else — guest or authenticated, and any device that has already
//     been through onboarding — lands on /(main)/(tabs)/browse.
//
// Branded reveal (DESIGN_SYSTEM §6/§7, BACKLOG P2.1): the "Hatiwal" wordmark
// fades in + scales up (withSpring) over ~500 ms as the placeholder logomark,
// with the spinner demoted to a secondary cue below — a bare spinner alone is
// explicitly discouraged by the design system.
//
// Guest browsing (BACKLOG A4): a logged-out user MUST see the Browse feed,
// never a login wall. The account-only tabs (Saved/Messages/Profile) and
// actions (save/contact/offer) self-gate to login with a returnTo via
// useRequireAuth. So Splash never routes to /(auth)/login — doing so would
// re-break the shipped guest-browsing contract.
//
// Network error distinction (enforced in auth.bootstrap.ts):
//   • HTTP 401 (token revoked/expired) → tokens cleared inside bootstrapAuth,
//     auth store cleared → user continues as a guest on Browse.
//   • Network / timeout (no response) → tokens kept, optimistic session stays.
//
// IMPORTANT: This file does NOT call clearAuthHeaders() — that is handled
// inside bootstrapAuth() only for the definitive 401 case. Calling it here
// on a generic error would permanently log out a user whose device is
// temporarily offline.

import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { bootstrapAuth } from "@/stores/auth.bootstrap";
import { useColors } from "@/hooks/useColors";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Logomark } from "@/components/common/Logomark";
import { useReduceMotion } from "@/lib/animation";
import { secureStorage } from "@/utils/secure-storage";
import { hasSeenOnboarding } from "@/utils/onboarding";

export default function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const reduceMotion = useReduceMotion();

  // Logo reveal: fade in + subtle scale-up on cold start.
  // When Reduce Motion is on, snap directly to visible without animating.
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, [opacity, scale, reduceMotion]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let cancelled = false;

    const routeAfterBootstrap = async () => {
      // A device only ever sees onboarding when it has NO stored token (a
      // genuine guest — authenticated sessions never see it) AND hasn't
      // already finished/skipped it once before.
      const [authHeaders, onboardingSeen] = await Promise.all([
        secureStorage.getAuthHeaders(),
        hasSeenOnboarding(),
      ]);

      if (cancelled) return;

      if (!authHeaders && !onboardingSeen) {
        router.replace("/onboarding");
        return;
      }

      // Guests and authenticated users alike land on Browse — the feed is
      // guest-capable and account actions/tabs self-gate to login on demand.
      router.replace("/(main)/(tabs)/browse");
    };

    bootstrapAuth()
      .then(routeAfterBootstrap)
      .catch(() => {
        // bootstrapAuth never rejects (it catches internally), but guard
        // against unexpected throws. Do NOT call clearAuthHeaders() here and do
        // NOT route to login — keep tokens intact and drop to the guest feed.
        if (!cancelled) router.replace("/(main)/(tabs)/browse");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The H mark + wordmark are both symmetric / centered — direction-agnostic,
  // so no RTL mirroring is needed. Both reveal together under one animated style.
  return (
    <ScreenContainer
      scrollable={false}
      padded={false}
      safeArea={[]}
      accessible
      accessibilityLabel={t("common.splash.validating")}
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[styles.brand, wordmarkStyle]}>
        <Logomark size={72} />
        <Text style={[styles.wordmark, { color: colors.primary }]}>
          {t("common.appName")}
        </Text>
      </Animated.View>
      <ActivityIndicator
        size="small"
        color={colors.mutedForeground}
        style={styles.spinner}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    gap: 16,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 24,
  },
});
