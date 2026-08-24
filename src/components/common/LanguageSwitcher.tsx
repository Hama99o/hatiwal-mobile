import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

type LanguageSwitcherProps = {
  // "sm" — compact pills (default, used in Profile settings inline picker)
  // "lg" — larger touch targets and text (used on Login screen)
  size?: "sm" | "lg";
};

export default function LanguageSwitcher({ size = "sm" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const colors = useColors();
  const current = i18n.language;

  // Which language is being applied, if any. Switching language was reported as
  // feeling slow with no feedback: `setLanguage` awaits i18next, writes storage,
  // syncs the backend, and — when the direction flips (en <-> ps/fa) — RESTARTS
  // the app, because I18nManager.forceRTL only applies on the next launch. A tap
  // with no pending state looks like nothing happened, and an unannounced restart
  // looks like a crash.
  const [applying, setApplying] = useState<string | null>(null);

  const isLg = size === "lg";

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: isLg ? 10 : 8 }}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <Pressable
            key={lang.code}
            onPress={async () => {
              if (applying) return;
              setApplying(lang.code);
              try {
                await setLanguage(lang.code as LanguageCode);
              } finally {
                // On a direction flip the app restarts and this never runs, which
                // is correct: the spinner should stay up until it does.
                setApplying(null);
              }
            }}
            disabled={!!applying}
            android_ripple={{ color: colors.muted, borderless: false }}
            accessibilityRole="button"
            // The active pill is marked only by a fill colour, which a screen
            // reader cannot convey. The testID is distinct from Profile's
            // `language-option-*` on purpose: this switcher lives on Onboarding
            // and Login, so a flow that confuses the two should fail loudly
            // rather than tap whichever happens to be in the tree.
            accessibilityState={{ selected: active }}
            testID={`language-switcher-${lang.code}`}
            style={{
              paddingVertical: isLg ? 12 : 8,
              paddingHorizontal: isLg ? 20 : 16,
              borderRadius: isLg ? 10 : 8,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            {/* The label stays PUT while applying — the spinner sits beside it.
                Swapping the label out for a spinner hid which language you had
                just chosen at the exact moment you wanted confirmation. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  color: active ? colors.primaryForeground : colors.foreground,
                  fontWeight: active ? "700" : "400",
                  fontSize: isLg ? 16 : 14,
                }}
              >
                {lang.label}
              </Text>
              {applying === lang.code && (
                <ActivityIndicator
                  size="small"
                  color={active ? colors.primaryForeground : colors.foreground}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
