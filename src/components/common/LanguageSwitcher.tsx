import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";
import { fontFamilyForLang } from "@/lib/fonts";

type LanguageSwitcherProps = {
  // "sm" — compact pills (default, used in Profile settings inline picker)
  // "lg" — larger touch targets and text (used on Login screen)
  size?: "sm" | "lg";
};

export default function LanguageSwitcher({ size = "sm" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const colors = useColors();
  const current = i18n.language;

  const isLg = size === "lg";

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code as LanguageCode)}
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
              // Tightened: the lg variant was 12/20 with a 16pt label, which on the
              // login screen read as three oversized blocks with more padding than
              // the inputs above them. Height is pinned with minHeight instead of
              // grown with padding, so the 44px touch target the design system
              // requires is kept while the chips look like chips.
              minHeight: 44,
              justifyContent: "center",
              paddingVertical: 8,
              paddingHorizontal: isLg ? 14 : 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.primaryForeground : colors.foreground,
                fontWeight: active ? "700" : "400",
                fontSize: isLg ? 15 : 14,
                // EACH LABEL IN ITS OWN SCRIPT'S FONT — not the app's.
                //
                // Everything else is drawn with fontFamilyForLang(ACTIVE language),
                // which is correct when the text IS in that language. This control is
                // the one place three scripts appear at once, so inheriting the app
                // font renders two of them in a face that cannot cover them: in English
                // everything gets Rubik (Latin only), and in Dari everything gets Zain,
                // which — as fonts.ts says itself — does not reliably carry Pashto's
                // extended letters (ټ ډ ړ ږ ښ ګ ڼ ې). "پښتو" contains ښ, so it rendered
                // broken in English and Dari and correctly only once the app was
                // already in Pashto. Reported from the device.
                fontFamily: fontFamilyForLang(lang.code, active ? "700" : "400"),
              }}
            >
              {lang.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
