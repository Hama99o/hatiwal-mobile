// Brand fonts, embedded at build time by the expo-font config plugin (app.json).
//
// Unlike the browser, React Native cannot fall back per-glyph within a single
// text run — one Text renders in exactly one fontFamily. So instead of a CSS
// font stack we pick ONE font per active language:
//   • English (en) → Rubik        (Latin)
//   • Dari    (fa) → Zain         (Persian/Farsi script — Zain covers it)
//   • Pashto  (ps) → Noto Sans Arabic
//        Pashto has extended letters (ټ ډ ړ ږ ښ ګ ڼ ې) that Rubik/Zain do not
//        reliably carry; Noto Sans Arabic does, so Pashto is guaranteed to render.
//   • Urdu    (ur) → Noto Sans Arabic
//        Urdu is Arabic script, so WITHOUT a branch here it fell through to the
//        Latin default and every Urdu string would have rendered as tofu boxes —
//        see the no-per-glyph-fallback note above, which is exactly why the
//        default is not survivable for a non-Latin language. Noto Sans Arabic
//        carries the Urdu-specific letters (ٹ ڈ ڑ ں ھ ہ ے) as well as the shared
//        Arabic block.
//
//        CAVEAT worth knowing: this is NASKH, not NASTALIQ. Urdu is
//        conventionally set in Nastaliq (Noto Nastaliq Urdu), and Pakistani
//        readers notice the difference — Naskh reads as "correct but foreign".
//        It is legible and it ships today with no new dependency; moving to
//        Nastaliq means adding that font package and is a deliberate follow-up,
//        not something to do silently here.
//
// HOW THE FONTS GET INTO THE APP — build time, not runtime.
//
// They are EMBEDDED by the expo-font config plugin (app.json → plugins →
// "expo-font"): on Android each language's 400 + 700 files become ONE native
// font family (res/font XML, registered with ReactFontManager), on iOS the
// files are added to the bundle and resolved by their internal family name.
// So JS asks for a FAMILY ("Noto Sans Arabic") plus a real fontWeight, and the
// platform picks the face — for measuring AND for drawing.
//
// That is the fix for a measure-vs-draw bug that runtime loading caused
// (useFonts registered every file as its own single-weight family, e.g.
// "NotoSansArabic_700Bold"). On Android the layout then measured with
// different metrics than it drew with: shrink-wrapped Pashto labels at weight
// 600 lost their last word ("د هتیوال ملاتړ" drew as "د هتیوال"), regular +
// 600 clipped too, and weight 700 on the bold file silently fell back to a thin
// system face. Measured on device 2026-10-01 across 7 weight/family variants;
// the same class of bug produced the first-run "Nex"/"Ski" clipping earlier.
//
// Family names are the fonts' own internal family names (fc-scan), so the same
// string works on both platforms.
export const BRAND_FAMILIES = {
  latin: "Rubik",
  dari: "Zain",
  arabic: "Noto Sans Arabic",
} as const;

// Weights that mean "bold" once RN has resolved className/style. RN accepts
// numeric strings, plain numbers and the keywords.
const BOLD_WEIGHTS = new Set(["600", "700", "800", "900", "bold", 600, 700, 800, 900]);

export function isBoldWeight(weight: unknown): boolean {
  return weight != null && BOLD_WEIGHTS.has(weight as string);
}

/** The brand font FAMILY for the active language (weight is chosen separately). */
export function fontFamilyForLang(lang: string | undefined): string {
  const l = (lang ?? "en").toLowerCase();
  if (l.startsWith("ps") || l.startsWith("ur")) return BRAND_FAMILIES.arabic;
  if (l.startsWith("fa") || l.startsWith("da")) return BRAND_FAMILIES.dari;
  return BRAND_FAMILIES.latin;
}

/**
 * Family + a weight that exists as a REAL face. Each family ships exactly 400
 * and 700, so every bold spelling (600, 800, "bold", NativeWind's
 * font-semibold) is pinned to "700" — asking a platform for a weight the
 * family lacks invites it to synthesize one, which is how text measured at one
 * width and drew at another. Non-bold weights are left to resolve to 400.
 * Spread AFTER the caller's style so the normalized weight wins.
 */
export function brandTextStyle(
  lang: string | undefined,
  weight?: unknown
): { fontFamily: string; fontWeight?: "700" } {
  const fontFamily = fontFamilyForLang(lang);
  return isBoldWeight(weight) ? { fontFamily, fontWeight: "700" } : { fontFamily };
}
