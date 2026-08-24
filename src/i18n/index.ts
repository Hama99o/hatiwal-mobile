import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadApp } from "@/lib/reloadApp";
import { saveRouteForRestart } from "@/lib/routeMemory";
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

// Allow RTL globally; the concrete direction is set per-language below.
I18nManager.allowRTL(true);

// Reconcile the persisted language + layout direction on cold start. If the
// native RTL flag disagrees with the stored language's direction, flip it and
// restart ONCE. forceRTL() persists natively, so after the restart the flag and
// the stored language already agree → no restart loop.
AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    const lang = (stored as LanguageCode) || (DEFAULT_LANG as LanguageCode);
    if (lang !== i18n.language) i18n.changeLanguage(lang);
    const desiredRtl = isRtlLanguage(lang);
    if (I18nManager.isRTL !== desiredRtl) {
      I18nManager.forceRTL(desiredRtl);
      reloadApp();
    }
  })
  .catch(() => {});

export async function setLanguage(lang: LanguageCode): Promise<void> {
  // Only a DIRECTION FLIP needs the restart. `I18nManager.forceRTL()` applies
  // natively and takes effect on the next launch — on iOS as much as on Android,
  // so that part is a React Native constraint, not an Android bug.
  //
  // What was an Android-only cost is restarting for language changes that do NOT
  // flip direction: ps -> fa are both RTL, and en with the direction already LTR
  // needs nothing but new labels, which i18next swaps reactively. This restarted
  // on ANY change, which is why switching language felt heavy.
  const flipsDirection = isRtlLanguage(lang) !== I18nManager.isRTL;
  await i18n.changeLanguage(lang);
  I18nManager.forceRTL(isRtlLanguage(lang));
  // Persist locally BEFORE restarting so the stored language matches the forced
  // direction on next launch (otherwise the cold-start reconcile could loop).
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore persistence errors
  }
  // Fire-and-forget backend sync — local storage is authoritative for the UI.
  authAPI.updateMe({ preferredLanguage: lang }).catch(() => null);
  if (flipsDirection) {
    // Save the route BEFORE restarting, and await it — a fire-and-forget write
    // races the process going away. Without this the restart dropped the user
    // back on the feed from wherever they were, which is the whole complaint:
    // only the language should change, not the page.
    await saveRouteForRestart();
    reloadApp();
  }
}

/** Apply a language from the backend user object (no API sync — backend is the source). */
export async function applyLanguageFromUser(lang: LanguageCode): Promise<void> {
  const flips = isRtlLanguage(lang) !== I18nManager.isRTL;
  await i18n.changeLanguage(lang);
  I18nManager.forceRTL(isRtlLanguage(lang));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  // On login only reload when the direction actually flips (avoids a needless
  // restart loop on the splash/login flow for same-direction languages).
  if (flips) {
    await saveRouteForRestart();
    reloadApp();
  }
}

/** Reset language to English and clear storage — call on logout. */
export async function resetLanguage(): Promise<void> {
  // Don't restart here — logout has its own navigation/reset flow; the LTR
  // direction is applied on the next launch (or the next login via
  // applyLanguageFromUser). Restarting mid-logout risks racing that flow.
  await i18n.changeLanguage("en");
  I18nManager.forceRTL(false);
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

export default i18n;
