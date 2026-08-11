/**
 * normalizeDigits — TASK-P736 (review fix, CR round 2)
 *
 * Covers the price-field regression this util exists to fix: a Dari/Pashto
 * numeric keypad types Persian/Pashto (Extended Arabic-Indic) or Arabic
 * (Arabic-Indic) numerals, which `Number(...)`/`z.coerce.number()` cannot
 * parse on their own.
 */
import { normalizeDigits } from "../normalizeDigits";

describe("normalizeDigits", () => {
  it("converts Persian/Pashto (Extended Arabic-Indic) digits to ASCII", () => {
    expect(normalizeDigits("۸۰۰۰")).toBe("8000");
    expect(Number(normalizeDigits("۸۰۰۰"))).toBe(8000);
  });

  it("converts Arabic-Indic digits to ASCII", () => {
    expect(normalizeDigits("٨٠٠٠")).toBe("8000");
    expect(Number(normalizeDigits("٨٠٠٠"))).toBe(8000);
  });

  it("leaves ASCII digits and the decimal separator untouched", () => {
    expect(normalizeDigits("12.5")).toBe("12.5");
    expect(normalizeDigits("")).toBe("");
  });

  it("leaves a trailing decimal point untouched (mid-typing '12.')", () => {
    expect(normalizeDigits("12.")).toBe("12.");
  });

  it("handles a mix of ASCII and Persian/Pashto digits", () => {
    expect(normalizeDigits("1۲.۵")).toBe("12.5");
  });

  it("leaves non-digit characters (e.g. a stray letter) untouched", () => {
    expect(normalizeDigits("abc۱23")).toBe("abc123");
  });
});
