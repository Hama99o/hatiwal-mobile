/**
 * normalizeDigits — TASK-P736 (review fix, CR round 2).
 *
 * Converts Persian/Pashto (Extended Arabic-Indic, U+06F0–U+06F9) and Arabic
 * (Arabic-Indic, U+0660–U+0669) numeral characters — what a Dari/Pashto
 * on-screen numeric keypad actually types — to their ASCII 0-9 equivalents.
 *
 * Without this, a seller on the `fa`/`ps` locale typing a price with their
 * own numeral keypad produces e.g. `Number("۸۰۰۰") === NaN`, which silently
 * clears the price field and makes the publish-readiness blocker toast say
 * "Add Price" for a price the seller did type. Every other character
 * (including the decimal separator `.`) passes through untouched.
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

export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_MAP[ch] ?? ch);
}
