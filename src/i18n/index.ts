import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadApp } from "@/lib/reloadApp";
import { authAPI } from "@/api/auth";
import { resolveLanguageFromUser } from "./resolveLanguage";
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
  const changed = i18n.language !== lang;
  await i18n.changeLanguage(lang);
  I18nManager.forceRTL(isRtlLanguage(lang));
  // Persist locally BEFORE restarting so the stored language matches the forced
  // direction on next launch (otherwise the cold-start reconcile could loop).
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore persistence errors
  }
  // AWAIT the backend sync before restarting — bounded, so a slow network cannot
  // hold the UI.
  //
  // It used to be fire-and-forget, immediately followed by reloadApp(). The
  // restart tore down the JS context with the request still in flight, so the
  // server kept the OLD preferredLanguage; auth.bootstrap then read that stale
  // value back on the next launch and undid the change. That is the owner's
  // "it reload 2 or 3 time and it stay in same lang" (2026-09-02).
  //
  // The 1500ms cap matters: without it a dead network would block the language
  // change itself. If the PATCH loses the race, resolveLanguageFromUser still
  // protects the choice on the next launch and pushes it again — so this await
  // makes the server converge SOONER, it is not what makes the fix correct.
  await Promise.race([
    authAPI.updateMe({ preferredLanguage: lang }).catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  // Reload on ANY language change — RN's live label/direction update is janky
  // on Android (text sometimes stays in place); a restart applies it cleanly.
  if (changed) reloadApp();
}

/**
 * Apply the backend user's language — but NEVER over an explicit local choice.
 *
 * This runs on every load (auth.bootstrap's validateToken callback) as well as
 * after login/register, and it used to overwrite local storage with whatever the
 * server held. That is what reverted a just-made language change and forced the
 * extra restart the owner saw. The rule now lives in resolveLanguageFromUser,
 * with tests; see that file's header for the full sequence.
 */
export async function applyLanguageFromUser(lang: LanguageCode): Promise<void> {
  let stored: LanguageCode | null = null;
  try {
    stored = (await AsyncStorage.getItem(STORAGE_KEY)) as LanguageCode | null;
  } catch {
    // Unreadable storage counts as "no local choice", which keeps the old
    // seed-from-server behaviour rather than stranding the app on the default.
  }
  const { apply, pushToBackend } = resolveLanguageFromUser(stored, lang);

  if (pushToBackend) {
    // The local choice is authoritative and the server is behind — usually
    // because a language change restarted the app before its PATCH landed.
    // Correct the server; do NOT touch the UI.
    authAPI.updateMe({ preferredLanguage: pushToBackend }).catch(() => null);
    return;
  }
  if (!apply) return;

  const flips = isRtlLanguage(apply) !== I18nManager.isRTL;
  await i18n.changeLanguage(apply);
  I18nManager.forceRTL(isRtlLanguage(apply));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, apply);
  } catch {
    // ignore
  }
  // Only reload when the direction actually flips (avoids a needless restart on
  // the splash/login flow for same-direction languages).
  if (flips) reloadApp();
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
