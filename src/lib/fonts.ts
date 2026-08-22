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

// Weights that mean "bold" once RN has resolved className/style. RN accepts
// numeric strings, plain numbers and the keywords.
const BOLD_WEIGHTS = new Set(["600", "700", "800", "900", "bold", 600, 700, 800, 900]);

export function isBoldWeight(weight: unknown): boolean {
  return weight != null && BOLD_WEIGHTS.has(weight as string);
}

/**
 * The font family for the active language AND weight.
 *
 * The weight argument is not a nicety — it is a correctness fix. RN cannot
 * synthesize a bold face for a CUSTOM font family on Android: given
 * `fontFamily: "Rubik_400Regular"` + `fontWeight: "700"` it fake-bolds by
 * smearing the glyphs, which widens their advances WITHOUT the text measurement
 * accounting for it. The last character then falls outside the measured box and
 * is clipped — visibly, in any tightly-measured container.
 *
 * That shipped: the first-run onboarding button read "Nex" and its skip link
 * read "Ski" (QA run-045, the first screen every new user sees). Long headings
 * looked fine only because they had slack to spare.
 *
 * The `*_700Bold` faces were already bundled and registered in FONT_ASSETS
 * below — they were simply never referenced, so every bold label in the app was
 * fake-bold. Asking for the real face fixes the metrics rather than padding
 * around the symptom.
 */
export function fontFamilyForLang(lang: string | undefined, weight?: unknown): string {
  const l = (lang ?? "en").toLowerCase();
  const bold = isBoldWeight(weight);
  if (l.startsWith("ps")) {
    return bold ? "NotoSansArabic_700Bold" : "NotoSansArabic_400Regular";
  }
  if (l.startsWith("fa") || l.startsWith("da")) {
    return bold ? "Zain_700Bold" : "Zain_400Regular";
  }
  return bold ? "Rubik_700Bold" : "Rubik_400Regular";
}
