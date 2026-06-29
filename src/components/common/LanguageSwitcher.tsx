import { View, Pressable } from "react-native";
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

  const isLg = size === "lg";

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: isLg ? 10 : 8 }}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code as LanguageCode)}
            android_ripple={{ color: colors.muted, borderless: false }}
            accessibilityRole="button"
            style={{
              paddingVertical: isLg ? 12 : 8,
              paddingHorizontal: isLg ? 20 : 16,
              borderRadius: isLg ? 10 : 8,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.primaryForeground : colors.foreground,
                fontWeight: active ? "700" : "400",
                fontSize: isLg ? 16 : 14,
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
