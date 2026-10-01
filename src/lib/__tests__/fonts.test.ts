/**
 * The brand font per language, and the weight rule that keeps Android from
 * measuring and drawing text with different metrics.
 *
 * History, because both halves shipped as user-visible bugs:
 * - Fake-bold on a single-weight custom family clipped the last character
 *   (first-run onboarding read "Nex" / "Ski", QA run-045).
 * - With every file registered at RUNTIME as its own family, shrink-wrapped
 *   Pashto labels at weight 600 lost their last word ("د هتیوال ملاتړ" drew as
 *   "د هتیوال") and 700 on the bold file fell back to a thin system face
 *   (measured on device 2026-10-01).
 * The fix is build-time embedding (app.json → expo-font plugin) of ONE family
 * per script with real 400 + 700 faces, and pinning every bold spelling to 700.
 * These tests pin the JS half AND that app.json declares what JS asks for.
 */
import appJson from "../../../app.json";
import { brandTextStyle, BRAND_FAMILIES, fontFamilyForLang, isBoldWeight } from "../fonts";

describe("fontFamilyForLang", () => {
  it("uses Rubik for English", () => {
    expect(fontFamilyForLang("en")).toBe("Rubik");
  });

  it("uses Zain for Dari", () => {
    expect(fontFamilyForLang("fa")).toBe("Zain");
  });

  // Pashto has extended letters (ټ ډ ړ ږ ښ ګ ڼ ې) that Rubik/Zain do not carry.
  it("uses Noto Sans Arabic for Pashto", () => {
    expect(fontFamilyForLang("ps")).toBe("Noto Sans Arabic");
  });

  // Without its own branch Urdu fell through to Latin and rendered as tofu.
  it("uses Noto Sans Arabic for Urdu", () => {
    expect(fontFamilyForLang("ur")).toBe("Noto Sans Arabic");
  });

  it("falls back to Rubik for an unknown or missing language", () => {
    expect(fontFamilyForLang(undefined)).toBe("Rubik");
    expect(fontFamilyForLang("qq")).toBe("Rubik");
  });

  it("never gives an RTL locale the Latin face", () => {
    for (const lang of ["ps", "fa", "ur"]) expect(fontFamilyForLang(lang)).not.toBe("Rubik");
  });
});

describe("brandTextStyle — bold always lands on the real 700 face", () => {
  // RN accepts all of these from style or NativeWind's font-semibold/font-bold;
  // a missed spelling would ask Android for a weight the family lacks.
  it.each(["600", "700", "800", "900", "bold", 600, 700])("pins %p to 700", (w) => {
    expect(isBoldWeight(w)).toBe(true);
    expect(brandTextStyle("ps", w)).toEqual({ fontFamily: "Noto Sans Arabic", fontWeight: "700" });
  });

  it.each(["400", "500", "normal", 400, 500, undefined, null])("leaves %p alone (resolves to 400)", (w) => {
    expect(isBoldWeight(w)).toBe(false);
    expect(brandTextStyle("en", w)).toEqual({ fontFamily: "Rubik" });
  });
});

describe("app.json embeds exactly the families JS asks for", () => {
  const plugin = (appJson.expo.plugins as unknown[]).find(
    (p) => Array.isArray(p) && p[0] === "expo-font"
  ) as [string, { android: { fonts: { fontFamily: string; fontDefinitions: { path: string; weight: number }[] }[] }; ios: { fonts: string[] } }] | undefined;

  it("declares the expo-font plugin", () => {
    expect(plugin).toBeDefined();
  });

  it.each(Object.values(BRAND_FAMILIES))("Android family %s has real 400 and 700 faces", (family) => {
    const def = plugin![1].android.fonts.find((f) => f.fontFamily === family);
    expect(def).toBeDefined();
    expect(def!.fontDefinitions.map((d) => d.weight).sort()).toEqual([400, 700]);
  });

  it("iOS bundles both weights of all three families", () => {
    expect(plugin![1].ios.fonts).toHaveLength(6);
  });
});
