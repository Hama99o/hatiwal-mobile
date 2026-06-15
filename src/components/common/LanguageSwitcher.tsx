import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const colors = useColors();
  const current = i18n.language;

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code as LanguageCode)}
            android_ripple={{ color: colors.muted, borderless: false }}
            style={({ pressed }) => ({
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : "transparent",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontWeight: active ? "700" : "400" }}>
              {lang.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
