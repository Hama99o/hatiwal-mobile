import { View, TouchableOpacity, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            onPress={() => setLanguage(lang.code as LanguageCode)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: active ? "#2563EB" : "#ddd",
              backgroundColor: active ? "#2563EB" : "transparent",
            }}
          >
            <Text style={{ color: active ? "white" : "#333", fontWeight: active ? "bold" : "normal" }}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
