// Brand fonts, loaded at startup via expo-font (see app/_layout.tsx).
//
// Unlike the browser, React Native cannot fall back per-glyph within a single
// text run — one Text renders in exactly one fontFamily. So instead of a CSS
// font stack we pick ONE font per active language:
//   • English (en) → Rubik        (Latin)
//   • Dari    (fa) → Zain         (Persian/Farsi script — Zain covers it)
//   • Pashto  (ps) → Noto Sans Arabic
//        Pashto has extended letters (ټ ډ ړ ږ ښ ګ ڼ ې) that Rubik/Zain do not
//        reliably carry; Noto Sans Arabic does, so Pashto is guaranteed to render.
//
// The packages are installed in the Docker container (not resolvable on the host),
// same as react-native-gesture-handler — hence the ts-ignore, matching _layout.tsx.

// @ts-ignore — installed in the Docker container; not resolvable on host
import { Rubik_400Regular, Rubik_700Bold } from "@expo-google-fonts/rubik";
// @ts-ignore — installed in the Docker container; not resolvable on host
import { Zain_400Regular, Zain_700Bold } from "@expo-google-fonts/zain";
// @ts-ignore — installed in the Docker container; not resolvable on host
import {
  NotoSansArabic_400Regular,
  NotoSansArabic_700Bold,
} from "@expo-google-fonts/noto-sans-arabic";

// Passed to useFonts(); the KEY becomes the registered fontFamily name.
export const FONT_ASSETS = {
  Rubik_400Regular,
  Rubik_700Bold,
  Zain_400Regular,
  Zain_700Bold,
  NotoSansArabic_400Regular,
  NotoSansArabic_700Bold,
};

// The regular family for the active language. Bold is synthesized by RN from
// fontWeight (font-bold / font-semibold className) on top of this family.
export function fontFamilyForLang(lang: string | undefined): string {
  const l = (lang ?? "en").toLowerCase();
  if (l.startsWith("ps")) return "NotoSansArabic_400Regular";
  if (l.startsWith("fa") || l.startsWith("da")) return "Zain_400Regular";
  return "Rubik_400Regular";
}
