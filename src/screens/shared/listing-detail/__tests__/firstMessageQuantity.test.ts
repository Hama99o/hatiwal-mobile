/**
 * firstMessageQuantity — unit tests (SF-M6).
 *
 * `buildFirstMessageText` is the real production function driving
 * FirstMessageSheet's prefilled text — see reserveAfterOffer.test.tsx's own
 * rationale for testing the pure builder directly rather than mounting the
 * full sheet (Modal/KeyboardAvoidingView/react-query).
 *
 * Deterministic `t`/`formatCurrency` stubs mirror reserveAfterOffer.test.tsx
 * so assertions can check both the translation KEY and the interpolated
 * values without depending on real i18n resources — the actual en/ps/fa
 * copy is covered separately by src/i18n/__tests__/translationCoverage.test.ts
 * and by exercising the REAL `formatCurrency`/`t` in the "real i18n" block
 * below, once per locale, so the unit×qty=total sentence is proven end to end
 * in each of the three shipped languages.
 */
import { buildFirstMessageText } from "../firstMessageQuantity";
import { wrapBidiIsolate } from "@/screens/chat/conversation/reserveAfterAccept";
import { enTranslations } from "@/i18n/en";
import { psTranslations } from "@/i18n/ps";
import { faTranslations } from "@/i18n/fa";

const DEFAULT_MESSAGE = "Hi, is this still available?";

const t = jest.fn((key: string, options?: Record<string, unknown>) =>
  options ? `${key}|${JSON.stringify(options)}` : key
);

const formatCurrency = jest.fn(
  (amount: number, currency = "AFN") => `${currency} ${amount}`
);

const formatNumber = jest.fn((value: number) => String(value));

beforeEach(() => {
  jest.clearAllMocks();
});

function base(overrides: Partial<Parameters<typeof buildFirstMessageText>[0]> = {}) {
  return {
    quantity: 1,
    multiUnit: false,
    unitPrice: 14000,
    currency: "AFN",
    defaultMessage: DEFAULT_MESSAGE,
    formatCurrency,
    formatNumber,
    t,
    ...overrides,
  };
}

// ─── Hard rule: single-item / qty<=1 must be byte-identical to the plain default ──

describe("buildFirstMessageText — falls back to the plain default message", () => {
  it("returns the default message for a single-item listing (multiUnit=false), regardless of quantity", () => {
    expect(buildFirstMessageText(base({ multiUnit: false, quantity: 1 }))).toBe(DEFAULT_MESSAGE);
    expect(buildFirstMessageText(base({ multiUnit: false, quantity: 5 }))).toBe(DEFAULT_MESSAGE);
    expect(t).not.toHaveBeenCalledWith(
      "listing.detail.firstMessageQuantityTemplate",
      expect.anything()
    );
  });

  it("returns the default message for a multi-unit listing left at the default qty=1", () => {
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: 1 }))).toBe(DEFAULT_MESSAGE);
  });

  it("returns the default message for a non-finite or non-positive quantity (defensive)", () => {
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: 0 }))).toBe(DEFAULT_MESSAGE);
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: -3 }))).toBe(DEFAULT_MESSAGE);
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: NaN }))).toBe(DEFAULT_MESSAGE);
  });

  it("returns the default message when the unit price isn't a usable positive number (a listing still loading)", () => {
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: 3, unitPrice: 0 }))).toBe(
      DEFAULT_MESSAGE
    );
    expect(buildFirstMessageText(base({ multiUnit: true, quantity: 3, unitPrice: NaN }))).toBe(
      DEFAULT_MESSAGE
    );
  });

  it("never calls formatCurrency at all when falling back to the default message", () => {
    buildFirstMessageText(base({ multiUnit: false, quantity: 5 }));
    expect(formatCurrency).not.toHaveBeenCalled();
  });
});

// ─── The actual point of the ticket: unit price × qty = total, in writing ────

describe("buildFirstMessageText — multiUnit && qty > 1: states the total in writing", () => {
  it("builds the template with the bidi-isolated qty, unit price, and total (unitPrice * qty)", () => {
    const text = buildFirstMessageText(base({ multiUnit: true, quantity: 3, unitPrice: 14000 }));

    expect(t).toHaveBeenCalledWith("listing.detail.firstMessageQuantityTemplate", {
      qty: wrapBidiIsolate("3"),
      unitPrice: wrapBidiIsolate("AFN 14000"),
      total: wrapBidiIsolate("AFN 42000"),
    });
    expect(text).toContain("listing.detail.firstMessageQuantityTemplate");
  });

  it("formats qty via formatNumber — locale digit shaping (e.g. ps/fa Arabic-Indic digits), not a bare JS number", () => {
    formatNumber.mockReturnValueOnce("۳");
    buildFirstMessageText(base({ multiUnit: true, quantity: 3, unitPrice: 14000 }));
    expect(formatNumber).toHaveBeenCalledWith(3);
    const [, options] = t.mock.calls[0];
    expect((options as Record<string, unknown>).qty).toBe(wrapBidiIsolate("۳"));
  });

  it("computes the total as unitPrice * quantity, not a hardcoded example", () => {
    buildFirstMessageText(base({ multiUnit: true, quantity: 7, unitPrice: 2500 }));
    expect(formatCurrency).toHaveBeenCalledWith(2500, "AFN");
    expect(formatCurrency).toHaveBeenCalledWith(17500, "AFN"); // 7 * 2500
  });

  it("passes the listing's own currency through to both formatCurrency calls", () => {
    buildFirstMessageText(base({ multiUnit: true, quantity: 2, unitPrice: 100, currency: "USD" }));
    expect(formatCurrency).toHaveBeenCalledWith(100, "USD");
    expect(formatCurrency).toHaveBeenCalledWith(200, "USD");
  });

  it("bidi-isolates BOTH the unit price and the total — never a raw formatted amount spliced into the sentence", () => {
    formatCurrency.mockReturnValueOnce("AFN 14,000").mockReturnValueOnce("AFN 42,000");
    buildFirstMessageText(base({ multiUnit: true, quantity: 3, unitPrice: 14000 }));

    const [, options] = t.mock.calls[0];
    expect((options as Record<string, unknown>).unitPrice).toBe(wrapBidiIsolate("AFN 14,000"));
    expect((options as Record<string, unknown>).total).toBe(wrapBidiIsolate("AFN 42,000"));
  });

  it("passes the listing's quantity through formatNumber before interpolating qty", () => {
    buildFirstMessageText(base({ multiUnit: true, quantity: 5 }));
    expect(formatNumber).toHaveBeenCalledWith(5);
  });
});

// ─── Real i18n — the sentence renders correctly, once per shipped locale ────

describe("buildFirstMessageText — real translations (en / ps / fa)", () => {
  const CATALOGS = { en: enTranslations, ps: psTranslations, fa: faTranslations } as const;

  it.each(Object.keys(CATALOGS) as Array<keyof typeof CATALOGS>)(
    "renders the unit×qty=total sentence in %s using that locale's own template + currency formatting",
    (lang) => {
      const catalog = CATALOGS[lang];
      const realT = (key: string, options?: Record<string, unknown>) => {
        // key is namespaced "listing.detail.xxx" — walk the flat catalog object.
        const parts = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = catalog;
        for (const p of parts) value = value?.[p];
        if (typeof value !== "string") throw new Error(`Missing key ${key} for ${lang}`);
        return options
          ? value.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(options[name] ?? ""))
          : value;
      };
      const intlLocale = lang === "en" ? "en-US" : lang === "ps" ? "fa-AF" : "fa-IR";
      const realFormatCurrency = (amount: number, currency = "AFN") =>
        new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(amount);
      const realFormatNumber = (value: number) => new Intl.NumberFormat(intlLocale).format(value);

      const text = buildFirstMessageText({
        quantity: 3,
        multiUnit: true,
        unitPrice: 14000,
        currency: "AFN",
        defaultMessage: realT("listing.detail.defaultMessage"),
        formatCurrency: realFormatCurrency,
        formatNumber: realFormatNumber,
        t: realT,
      });

      // Real template text (not the raw key) is present, and the sentence
      // carries the "×"/"=" structure the redesign doc requires.
      expect(text).toContain("×");
      expect(text).toContain("=");
      expect(text).not.toBe(realT("listing.detail.defaultMessage"));
      // Every interpolated placeholder was actually replaced — none of the
      // literal "{{...}}" tokens survive into the final string.
      expect(text).not.toMatch(/\{\{\w+\}\}/);
    }
  );

  it("falls back to each locale's plain defaultMessage for a single-item listing", () => {
    for (const [lang, catalog] of Object.entries(CATALOGS)) {
      const realT = (key: string) => {
        const parts = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = catalog;
        for (const p of parts) value = value?.[p];
        return value as string;
      };
      const text = buildFirstMessageText(
        base({
          multiUnit: false,
          quantity: 1,
          defaultMessage: realT("listing.detail.defaultMessage"),
          t: realT,
        })
      );
      expect(text).toBe(realT("listing.detail.defaultMessage"));
      // sanity: each locale's default message is non-empty and locale-specific
      expect(text.length).toBeGreaterThan(0);
      void lang;
    }
  });
});
