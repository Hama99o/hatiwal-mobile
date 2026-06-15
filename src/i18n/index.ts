import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "@/api/auth";
import { enTranslations } from "./en";
import { psTranslations } from "./ps";
import { faTranslations } from "./fa";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ps", label: "پښتو" },
  { code: "fa", label: "دری" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "app-language";
const DEFAULT_LANG = process.env.EXPO_PUBLIC_DEFAULT_LANG || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    ps: { translation: psTranslations },
    fa: { translation: faTranslations },
  },
  lng: DEFAULT_LANG,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export const RTL_LANGUAGES = ["ps", "fa"];

export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}

function applyDirection(lang: string) {
  const rtl = isRtlLanguage(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

// Apply direction for the initial language.
applyDirection(i18n.language);

// Load the persisted language choice (overrides the env default).
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored);
      applyDirection(stored);
    }
  })
  .catch(() => {});

export async function setLanguage(lang: LanguageCode): Promise<void> {
  await i18n.changeLanguage(lang);
  applyDirection(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore persistence errors
  }
  authAPI.updateMe({ preferredLanguage: lang }).catch(() => null);
}

/** Apply a language from the backend user object (no API sync — backend is the source). */
export async function applyLanguageFromUser(lang: LanguageCode): Promise<void> {
  await i18n.changeLanguage(lang);
  applyDirection(lang);
  AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
}

/** Reset language to English and clear storage — call on logout. */
export async function resetLanguage(): Promise<void> {
  await i18n.changeLanguage("en");
  applyDirection("en");
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export default i18n;
