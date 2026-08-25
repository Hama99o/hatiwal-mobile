/**
 * Every `t("ns.key")` in the app must exist in ALL THREE locales.
 *
 * CLAUDE.md: "Every user-facing string must be translated into all 3 locales."
 * The failure mode when it isn't is not a crash — i18next falls back to
 * rendering the KEY, so a Pashto user sees `listing.stock.each` where a word
 * should be. Nothing else catches that: it type-checks, it renders, it ships.
 *
 * The audit runs over source rather than a snapshot on purpose — a snapshot only
 * knows the keys someone remembered to add to it.
 *
 * PLURALS: i18next resolves `t("browse.filtersActive", { count })` to
 * `filtersActive_one` / `filtersActive_other`. So the base form counts as
 * present when any plural variant exists. Getting this wrong makes the audit
 * cry wolf on correct code — it did, before this was handled.
 */
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "../..");
const LOCALES = path.join(SRC, "i18n/locales");
const LANGS = ["en", "ps", "fa"] as const;
const PLURAL = /_(zero|one|two|few|many|other)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "__mocks__") continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|stories)\./.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** Every leaf key, plus each plural's base form. */
function keysOf(lang: string): Set<string> {
  const keys = new Set<string>();
  const dir = path.join(LOCALES, lang);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const ns = file.replace(/\.json$/, "");
    const add = (obj: unknown, prefix: string) => {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          add(v, prefix ? `${prefix}.${k}` : k);
        }
      } else {
        keys.add(prefix);
        keys.add(prefix.replace(PLURAL, ""));
      }
    };
    add(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), ns);
  }
  return keys;
}

/** `t("ns.key")` occurrences — namespaced only, so bare strings aren't mistaken for keys. */
function usedKeys(): Set<string> {
  const used = new Set<string>();
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9_.]+)"/g)) {
      used.add(m[1]);
    }
  }
  return used;
}


/** Every key -> its VALUE, so a key that exists but was never translated is visible. */
function valuesOf(lang: string): Map<string, string> {
  const out = new Map<string, string>();
  const dir = path.join(LOCALES, lang);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const ns = file.replace(/\.json$/, "");
    const add = (obj: unknown, prefix: string) => {
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          add(v, prefix ? `${prefix}.${k}` : k);
        }
      } else if (typeof obj === "string") {
        out.set(`${ns}.${prefix.replace(PLURAL, "")}`, obj);
      }
    };
    add(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), "");
  }
  return out;
}

/**
 * Values that are SUPPOSED to be identical in every language.
 *   appName  — a brand name; translating it would be a bug.
 *   share.body — "{{title}} — {{price}}\n{{url}}", pure interpolation, no words.
 */
const IDENTICAL_BY_DESIGN = new Set(["common.appName", "listing.share.body"]);

/**
 * Known untranslated strings — DEBT, not permission.
 *
 * The app is otherwise fully translated: 872 keys, none missing, and nothing else
 * left in English. These four were added while fixing silent failures on the create
 * form, and machine-translating error copy into Pashto or Dari is worse than the
 * configured `fallbackLng: "en"` — a confidently wrong message misleads, where
 * English at least reads as untranslated. They need a human.
 *
 * DELETE each entry as it is translated. Do not add to this list to make a build
 * pass; that is the whole point of it being here.
 */
const AWAITING_TRANSLATION = new Set([
  "listing.form.photoPickFailed",
  "listing.form.cameraFailed",
  "listing.form.photoLimitReached",
  "listing.form.quantityOutOfRange",
]);

describe("translation coverage", () => {
  const used = usedKeys();
  const catalogs = Object.fromEntries(LANGS.map((l) => [l, keysOf(l)]));

  it("finds a meaningful number of keys (guards the regex itself)", () => {
    expect(used.size).toBeGreaterThan(400);
    expect(catalogs.en.size).toBeGreaterThan(400);
  });

  it.each(LANGS)("every key used in code exists in %s", (lang) => {
    const missing = [...used].filter((k) => !catalogs[lang].has(k)).sort();
    expect(missing).toEqual([]);
  });

  // Drift in either direction is worth knowing: a key added to en and forgotten
  // elsewhere renders as the raw key for those users.
  it.each(["ps", "fa"] as const)("%s carries every en key", (lang) => {
    const missing = [...catalogs.en].filter((k) => !catalogs[lang].has(k)).sort();
    expect(missing).toEqual([]);
  });
  // Key PRESENCE is not translation. A key can sit in ps/fa holding the English
  // string and every check above still passes, while a Pashto-speaking seller reads
  // English at the exact moment something has gone wrong.
  it.each(["ps", "fa"] as const)("%s has no untranslated English left in it", (lang) => {
    const en = valuesOf("en");
    const other = valuesOf(lang);
    const untranslated = [...en.entries()]
      .filter(([k, v]) => other.get(k) === v)
      // Latin letters are the tell: a shared number, symbol or pure interpolation
      // string is not evidence of anything.
      .filter(([, v]) => /[A-Za-z]/.test(v))
      .map(([k]) => k)
      .filter((k) => !IDENTICAL_BY_DESIGN.has(k) && !AWAITING_TRANSLATION.has(k))
      .sort();
    expect(untranslated).toEqual([]);
  });
});
