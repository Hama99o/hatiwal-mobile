import fs from "fs";
import path from "path";

/**
 * Regression guard for the savesCount defect — fix 254b259
 * ("buyers saw the literal text 'listing.savesCount' on a listing").
 *
 * Root cause: a plural-only i18n key (savesCount_one / savesCount_other) with NO
 * base key. ListingDetail passed `count` a FORMATTED STRING, i18next cannot
 * classify a string into a plural category, so no plural form resolved — and
 * with no base key to fall back to, i18next rendered the raw key to the user.
 *
 * The fix's stated invariant: every plural key ALSO carries a base form, as the
 * belt-and-braces that stops a raw key ever reaching a user again. This test
 * enforces that across every locale and namespace so the dangerous pair cannot
 * recur.
 *
 * Watched-fail-first: the third case below feeds the guard the PRE-FIX shape
 * (`savesCount_one`/`_other`, no base) and asserts it is flagged — i.e. this
 * test would have failed at 254b259^ on listing.savesCount in all four locales.
 */

const LOCALES_DIR = path.join(__dirname, "..", "locales");
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"];
const suffixRe = new RegExp(`_(${PLURAL_SUFFIXES.join("|")})$`);

type Violation = { where: string; base: string };

/** Recursively flag plural keys that lack a base sibling at the same level. */
function findViolations(
  obj: Record<string, unknown>,
  where: string,
  prefix = "",
  out: Violation[] = [],
): Violation[] {
  const keys = Object.keys(obj);
  const present = new Set(keys);
  const pluralBases = new Set<string>();

  for (const k of keys) {
    const v = obj[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      findViolations(v as Record<string, unknown>, where, prefix ? `${prefix}.${k}` : k, out);
      continue;
    }
    const m = k.match(suffixRe);
    if (m) pluralBases.add(k.slice(0, k.length - m[0].length));
  }

  for (const base of pluralBases) {
    if (!present.has(base)) out.push({ where, base: prefix ? `${prefix}.${base}` : base });
  }
  return out;
}

describe("i18n plural keys carry a base form (regression: savesCount / 254b259)", () => {
  const locales = fs
    .readdirSync(LOCALES_DIR)
    .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());

  it("has all four shipped locales", () => {
    expect(locales).toEqual(expect.arrayContaining(["en", "ps", "fa", "ur"]));
  });

  it("every plural key has a base form, in every locale and namespace", () => {
    const violations: Violation[] = [];
    for (const loc of locales) {
      const dir = path.join(LOCALES_DIR, loc);
      for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json"))) {
        const json = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        findViolations(json, `${loc}/${f}`, "", violations);
      }
    }
    if (violations.length) {
      const lines = violations.map(
        (v) => `  ${v.where}: "${v.base}" has plural forms but no base key (renders the raw key to users)`,
      );
      throw new Error(`Plural-only i18n keys without a base form:\n${lines.join("\n")}`);
    }
    expect(violations).toHaveLength(0);
  });

  it("catches the pre-fix savesCount shape (proves the guard fails-first)", () => {
    const preFix = {
      "savesCount_one": "Saved by {{count}} person",
      "savesCount_other": "Saved by {{count}} people",
    };
    const violations = findViolations(preFix, "fixture/listing.json");
    expect(violations).toEqual([{ where: "fixture/listing.json", base: "savesCount" }]);
  });
});
