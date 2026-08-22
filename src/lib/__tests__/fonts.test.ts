/**
 * The brand font per language AND weight.
 *
 * The weight half exists because of a real, shipped, user-visible bug: RN cannot
 * synthesize a bold face for a CUSTOM font family on Android. Given
 * `fontFamily: "Rubik_400Regular"` + `fontWeight: "700"` it fake-bolds by
 * smearing glyphs, widening their advances without the text measurement
 * accounting for it — so the last character falls outside the box and is
 * clipped. The first-run onboarding button rendered "Nex" and its skip link
 * "Ski" (QA run-045): the first screen every new user sees.
 *
 * The `*_700Bold` faces were bundled and registered all along and simply never
 * referenced. These tests pin that they are.
 */
import { fontFamilyForLang, isBoldWeight, FONT_ASSETS } from "../fonts";

describe("fontFamilyForLang — regular weights", () => {
  it("uses Rubik for English", () => {
    expect(fontFamilyForLang("en")).toBe("Rubik_400Regular");
  });

  it("uses Zain for Dari", () => {
    expect(fontFamilyForLang("fa")).toBe("Zain_400Regular");
  });

  // Pashto has extended letters (ټ ډ ړ ږ ښ ګ ڼ ې) that Rubik/Zain do not carry.
  it("uses Noto Sans Arabic for Pashto", () => {
    expect(fontFamilyForLang("ps")).toBe("NotoSansArabic_400Regular");
  });

  it("falls back to Rubik for an unknown or missing language", () => {
    expect(fontFamilyForLang(undefined)).toBe("Rubik_400Regular");
    expect(fontFamilyForLang("qq")).toBe("Rubik_400Regular");
  });
});

describe("fontFamilyForLang — bold asks for the REAL bold face", () => {
  it.each([
    ["en", "Rubik_700Bold"],
    ["fa", "Zain_700Bold"],
    ["ps", "NotoSansArabic_700Bold"],
  ])("%s bold → %s", (lang, family) => {
    expect(fontFamilyForLang(lang, "700")).toBe(family);
  });

  // RN accepts all of these spellings from style or from NativeWind's
  // font-semibold/font-bold, so every one has to map to the bold face — a missed
  // spelling silently reverts to fake-bold and clips again.
  it.each(["600", "700", "800", "900", "bold", 600, 700])(
    "treats %p as bold",
    (w) => {
      expect(isBoldWeight(w)).toBe(true);
      expect(fontFamilyForLang("en", w)).toBe("Rubik_700Bold");
    }
  );

  it.each(["400", "500", "normal", 400, 500, undefined, null])(
    "treats %p as regular",
    (w) => {
      expect(isBoldWeight(w)).toBe(false);
      expect(fontFamilyForLang("en", w)).toBe("Rubik_400Regular");
    }
  );
});

describe("FONT_ASSETS", () => {
  // Every family the resolver can return must actually be registered, or the
  // text silently renders in the system font.
  it("registers both weights of all three families", () => {
    const keys = Object.keys(FONT_ASSETS);
    for (const family of [
      "Rubik_400Regular",
      "Rubik_700Bold",
      "Zain_400Regular",
      "Zain_700Bold",
      "NotoSansArabic_400Regular",
      "NotoSansArabic_700Bold",
    ]) {
      expect(keys).toContain(family);
    }
  });

  it("every family the resolver returns is registered", () => {
    const returned = new Set<string>();
    for (const lang of ["en", "fa", "ps", "qq"]) {
      returned.add(fontFamilyForLang(lang));
      returned.add(fontFamilyForLang(lang, "700"));
    }
    for (const f of returned) expect(Object.keys(FONT_ASSETS)).toContain(f);
  });
});
