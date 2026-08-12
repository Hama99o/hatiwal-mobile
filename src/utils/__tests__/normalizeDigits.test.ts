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

  // TASK-P736 (review fix, CR round 3) — the Arabic decimal separator ٫
  // survived the round-2 digit fix untouched, so a fa/ps keypad's fractional
  // price still failed `Number(...)` one keystroke later.
  it("converts the Arabic decimal separator ٫ (U+066B) to an ASCII dot", () => {
    expect(normalizeDigits("۱۲٫۵")).toBe("12.5");
    expect(Number(normalizeDigits("۱۲٫۵"))).toBe(12.5);
  });

  it("strips the Arabic thousands separator ٬ (U+066C)", () => {
    expect(normalizeDigits("۸٬۰۰۰")).toBe("8000");
    expect(Number(normalizeDigits("۸٬۰۰۰"))).toBe(8000);
  });

  it("strips the Arabic comma ، (U+060C) used as a group separator", () => {
    expect(normalizeDigits("۸،۰۰۰")).toBe("8000");
    expect(Number(normalizeDigits("۸،۰۰۰"))).toBe(8000);
  });

  // TASK-P736 (review fix, round 4) — an English seller's grouped price
  // ("8,000") must parse too; only en/ps/fa are supported, so a `,` is
  // unambiguously a group separator on every locale this app ships.
  it("strips the ASCII comma , used as a group separator (English grouped price)", () => {
    expect(normalizeDigits("8,000")).toBe("8000");
    expect(Number(normalizeDigits("8,000"))).toBe(8000);
  });

  it("strips multiple ASCII commas in a large grouped price", () => {
    expect(normalizeDigits("1,250,000")).toBe("1250000");
  });
});
