/**
 * normalizeDigits — TASK-P736 (review fix, CR round 2, extended CR round 3).
 *
 * Converts Persian/Pashto (Extended Arabic-Indic, U+06F0–U+06F9) and Arabic
 * (Arabic-Indic, U+0660–U+0669) numeral characters — what a Dari/Pashto
 * on-screen numeric keypad actually types — to their ASCII 0-9 equivalents.
 *
 * Without this, a seller on the `fa`/`ps` locale typing a price with their
 * own numeral keypad produces e.g. `Number("۸۰۰۰") === NaN`, which silently
 * clears the price field and makes the publish-readiness blocker toast say
 * "Add Price" for a price the seller did type.
 *
 * CR round 3: a Dari/Pashto numeric keypad doesn't just emit different
 * DIGIT glyphs — it emits a different DECIMAL SEPARATOR too: U+066B «٫»
 * (Arabic decimal separator), not ASCII `.`. `"۱۲٫۵"` survived the round-2
 * fix as `"12٫5"`, and `Number("12٫5") === NaN` — the exact same failure
 * mode, one keystroke later, landing on ps/fa users only. U+066B is mapped
 * to `.`; the Arabic thousands separator U+066C «٬» and the Arabic comma
 * U+060C «،» (sometimes typed/pasted as a group separator) are stripped
 * entirely, mirroring how a plain ASCII `,` would need to be stripped from
 * an English "8,000" for the same `Number(...)` call to succeed.
 *
 * Pure, no React — fully unit-testable.
 */
const PERSIAN_PASHTO_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const DIGIT_MAP: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  DIGIT_MAP[PERSIAN_PASHTO_DIGITS[i]] = String(i);
  DIGIT_MAP[ARABIC_INDIC_DIGITS[i]] = String(i);
}

// U+066B Arabic decimal separator ("٫") — the fa/ps keypad's equivalent of ".".
const ARABIC_DECIMAL_SEPARATOR = /٫/g;
// U+066C Arabic thousands separator ("٬") and U+060C Arabic comma ("،") —
// both act as group separators here; neither belongs in a numeric string.
const ARABIC_GROUP_SEPARATORS = /[٬،]/g;

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch)
    .replace(ARABIC_DECIMAL_SEPARATOR, ".")
    .replace(ARABIC_GROUP_SEPARATORS, "");
}
