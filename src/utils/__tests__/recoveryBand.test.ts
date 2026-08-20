/**
 * recoveryBand unit tests (TASK-N317).
 *
 * Mirrors `hatiwal-web/e2e/recovery-band.spec.ts` case-for-case so both
 * clients agree on the exact same band arithmetic and degrade rules.
 *
 * Covers:
 *   - priceBand: ±30% rounding
 *   - priceBand: null for 0 / negative / null / undefined / NaN / Infinity
 *   - priceBand: never inverts the range, never negative
 *   - priceBand: AFN-only, case-insensitive; every other currency (incl.
 *     missing/empty) is un-bandable
 *   - recoveryBand: keeps the band only when similar stock falls inside it
 *     ("band-hits-stock"), inclusive at both edges
 *   - recoveryBand: drops the band when stock is empty, all outside, or junk
 *   - recoveryBand: drops whenever priceBand itself would (non-AFN / no price)
 */

import { BAND_SPREAD, BANDABLE_CURRENCY, priceBand, recoveryBand } from "../recoveryBand";

describe("priceBand", () => {
  it("is +/-30% of an AFN price, rounded", () => {
    expect(BAND_SPREAD).toBe(0.3);
    expect(priceBand(8000, "AFN")).toEqual({ min: 5600, max: 10400 });
    expect(priceBand(70000, "AFN")).toEqual({ min: 49000, max: 91000 });
    // Rounded, never fractional.
    expect(priceBand(1001, "AFN")).toEqual({ min: 701, max: 1301 });
    expect(priceBand(5, "AFN")).toEqual({ min: 4, max: 7 });
  });

  it("returns null for a price that can't make a band", () => {
    expect(priceBand(0, "AFN")).toBeNull();
    expect(priceBand(-100, "AFN")).toBeNull();
    expect(priceBand(null, "AFN")).toBeNull();
    expect(priceBand(undefined, "AFN")).toBeNull();
    expect(priceBand(Number.NaN, "AFN")).toBeNull();
    expect(priceBand(Number.POSITIVE_INFINITY, "AFN")).toBeNull();
    expect(priceBand(Number.NEGATIVE_INFINITY, "AFN")).toBeNull();
  });

  it("never inverts the range and never goes negative", () => {
    for (const p of [1, 2, 3, 7, 999, 1_000_000]) {
      const band = priceBand(p, "AFN");
      expect(band).not.toBeNull();
      expect(band!.min).toBeLessThanOrEqual(band!.max);
      expect(band!.min).toBeGreaterThanOrEqual(0);
    }
  });

  it("only AFN can be banded — case-insensitive, everything else is null", () => {
    expect(BANDABLE_CURRENCY).toBe("AFN");
    // A $900 laptop would otherwise ask the AFN feed for 630-1,170.
    expect(priceBand(900, "USD")).toBeNull();
    expect(priceBand(900, "EUR")).toBeNull();
    // Missing/garbled currency is treated as un-bandable, not as AFN.
    expect(priceBand(900, null)).toBeNull();
    expect(priceBand(900, undefined)).toBeNull();
    expect(priceBand(900, "")).toBeNull();
    // …but case never decides it.
    expect(priceBand(900, "afn")).toEqual({ min: 630, max: 1170 });
    expect(priceBand(900, "Afn")).toEqual({ min: 630, max: 1170 });
  });
});

describe("recoveryBand", () => {
  it("keeps the band when live stock falls inside it (band-hits-stock)", () => {
    expect(recoveryBand(70000, "AFN", [90000])).toEqual({ min: 49000, max: 91000 });
    // Inclusive at both edges.
    expect(recoveryBand(10000, "AFN", [7000])).toEqual({ min: 7000, max: 13000 });
    expect(recoveryBand(10000, "AFN", [13000])).toEqual({ min: 7000, max: 13000 });
  });

  it("drops the band when it would land on nothing", () => {
    expect(recoveryBand(8000, "AFN", [1200])).toBeNull();
    expect(recoveryBand(8000, "AFN", [])).toBeNull();
    expect(recoveryBand(8000, "AFN", [10401, 5599])).toBeNull();
    // Junk prices in the stock list can't fake a match.
    expect(recoveryBand(8000, "AFN", [null, undefined, Number.NaN])).toBeNull();
  });

  it("drops the band whenever priceBand itself would", () => {
    expect(recoveryBand(900, "USD", [900])).toBeNull();
    expect(recoveryBand(0, "AFN", [0])).toBeNull();
    expect(recoveryBand(null, "AFN", [1000])).toBeNull();
  });
});
