/**
 * Stock rules — docs/SPIKE_LISTING_QUANTITY.md, Tier 1.
 *
 * These four functions decide what a buyer is told about how many are left. The
 * failure they exist to prevent is not cosmetic: a buyer who reads "15 in stock"
 * on a listing where 13 are gone travels across Kabul for a bag that sold on
 * Tuesday, and there is no payment step or delivery to undo it.
 */
import { availableUnitsOf, totalUnitsOf, isLowStock, hasStockToShow } from "../stock";

describe("availableUnitsOf", () => {
  it("reports what is LEFT, not the seller's original count", () => {
    expect(availableUnitsOf({ quantity: 15, availableUnits: 2 })).toBe(2);
  });

  it("falls back to quantity when the payload predates available_units", () => {
    expect(availableUnitsOf({ quantity: 15 })).toBe(15);
  });

  it("treats a listing with no counts at all as a single item", () => {
    expect(availableUnitsOf({})).toBe(1);
  });

  it("never reports a negative count, whatever the server says", () => {
    expect(availableUnitsOf({ quantity: 5, availableUnits: -3 })).toBe(0);
  });

  it("is 0 for no listing, so a loading screen shows no count", () => {
    expect(availableUnitsOf(null)).toBe(0);
    expect(availableUnitsOf(undefined)).toBe(0);
  });

  it("reports 0 for a sold-out batch rather than falling back to quantity", () => {
    // The `??` chain must not treat a real 0 as "missing" — that would resurrect
    // the original count on the exact listing where it is most misleading.
    expect(availableUnitsOf({ quantity: 15, availableUnits: 0 })).toBe(0);
  });
});

describe("totalUnitsOf", () => {
  it("is the seller's original count, for the '3 of 15 left' phrasing", () => {
    expect(totalUnitsOf({ quantity: 15, availableUnits: 3 })).toBe(15);
  });

  it("is 1 for a payload that predates the column", () => {
    expect(totalUnitsOf({})).toBe(1);
  });

  it("is 0 for no listing", () => {
    expect(totalUnitsOf(null)).toBe(0);
  });
});

describe("hasStockToShow", () => {
  // The spike's governing rule: a seller with one item must never see that this
  // feature exists, and neither must their buyers.
  it("is false for a single-item listing — the majority case shows nothing", () => {
    expect(hasStockToShow({ quantity: 1, availableUnits: 1, multiUnit: false })).toBe(false);
  });

  it("is true only when the SERVER says multi-unit", () => {
    expect(hasStockToShow({ quantity: 15, availableUnits: 15, multiUnit: true })).toBe(true);
  });

  // A client-side `quantity > 1` guess would drift from the API the moment the
  // server's own rule changes; all three clients must agree on the same listing.
  it("does not guess from quantity when the server omitted the flag", () => {
    expect(hasStockToShow({ quantity: 15, availableUnits: 15 })).toBe(false);
  });

  it("is false for no listing", () => {
    expect(hasStockToShow(null)).toBe(false);
  });
});

describe("isLowStock", () => {
  it("is false for a single-item listing — there is no 'running out' of one", () => {
    expect(isLowStock(1, 1)).toBe(false);
  });

  it("is true at 2 or fewer left, whatever the batch size", () => {
    expect(isLowStock(2, 3)).toBe(true);
    expect(isLowStock(2, 300)).toBe(true);
    expect(isLowStock(1, 50)).toBe(true);
  });

  it("is true at a fifth of the batch or less, whatever the absolute number", () => {
    expect(isLowStock(20, 100)).toBe(true); // exactly a fifth — the boundary is low
    expect(isLowStock(10, 100)).toBe(true);
    expect(isLowStock(3, 15)).toBe(true);
  });

  it("is false while there is more than a fifth left", () => {
    expect(isLowStock(21, 100)).toBe(false);
    expect(isLowStock(12, 15)).toBe(false);
    expect(isLowStock(4, 15)).toBe(false);
  });

  // Sold out is the `sold` status plus its banner, which says far more than an
  // amber count would. Amber on "0 left" would read as "hurry".
  it("is false when sold out", () => {
    expect(isLowStock(0, 15)).toBe(false);
  });
});
