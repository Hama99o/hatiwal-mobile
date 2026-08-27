/**
 * SF-M7 — pure logic behind the sold-quantity reconciliation copy on
 * ListingForm.tsx. See quantityReconciliation.ts's own header for the bug
 * report this exists to fix.
 */
import {
  QUANTITY_BELOW_SOLD_UNITS_CODE,
  quantityBelowSoldUnitsMessage,
  soldUnitsOf,
  willReopenOnSave,
} from "../quantityReconciliation";

/** Stand-in for i18next `t`: echoes the key + interpolation so assertions
 *  can see exactly what was passed, without needing a real locale bundle. */
const t = (key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}(${JSON.stringify(opts)})` : key;

/** Shape axios rejects with. */
function httpError(status: number, data: unknown) {
  return { response: { status, data } };
}

describe("soldUnitsOf", () => {
  it("is quantity minus availableUnits", () => {
    expect(soldUnitsOf({ quantity: 15, availableUnits: 0 })).toBe(15);
    expect(soldUnitsOf({ quantity: 20, availableUnits: 5 })).toBe(15);
    expect(soldUnitsOf({ quantity: 8, availableUnits: 5 })).toBe(3);
  });

  it("is 0 for a listing nothing has sold from yet", () => {
    expect(soldUnitsOf({ quantity: 15, availableUnits: 15 })).toBe(0);
  });

  it("never goes negative, even against an inconsistent payload", () => {
    expect(soldUnitsOf({ quantity: 5, availableUnits: 9 })).toBe(0);
  });

  it("falls back to the single-item default for a nullish/legacy payload — same as stock.ts itself", () => {
    expect(soldUnitsOf(null)).toBe(0);
    expect(soldUnitsOf(undefined)).toBe(0);
    // No quantity/availableUnits at all (pre-multi-quantity listing): both
    // default to 1 via `totalUnitsOf`/`availableUnitsOf`, so nothing reads
    // as "sold".
    expect(soldUnitsOf({})).toBe(0);
  });
});

describe("quantityBelowSoldUnitsMessage", () => {
  it("maps SF-B6's known 422 code to a localized, actionable message", () => {
    const err = httpError(422, {
      errors: ["Quantity must be greater than or equal to 15"],
      code: QUANTITY_BELOW_SOLD_UNITS_CODE,
    });

    const message = quantityBelowSoldUnitsMessage(err, 15, t, String);

    expect(message).toBe('listing.form.quantityBelowSoldUnits({"count":"15"})');
  });

  it("clamps a negative sold-units input to 0 rather than showing a negative count", () => {
    const err = httpError(422, { code: QUANTITY_BELOW_SOLD_UNITS_CODE });

    const message = quantityBelowSoldUnitsMessage(err, -3, t, String);

    expect(message).toBe('listing.form.quantityBelowSoldUnits({"count":"0"})');
  });

  it("formats the count through the caller's own locale formatter, not a bare number", () => {
    const err = httpError(422, { code: QUANTITY_BELOW_SOLD_UNITS_CODE });
    const formatCount = jest.fn((n: number) => `۱۵-ish(${n})`);

    quantityBelowSoldUnitsMessage(err, 15, t, formatCount);

    expect(formatCount).toHaveBeenCalledWith(15);
  });

  it("returns null for any OTHER error code — the caller falls back to its existing generic handling, unchanged", () => {
    const err = httpError(422, {
      errors: ["Title can't be blank"],
      code: "some_other_code",
    });

    expect(quantityBelowSoldUnitsMessage(err, 15, t)).toBeNull();
  });

  it("returns null when the response carries no code at all — the common case for every other mutation failure", () => {
    expect(quantityBelowSoldUnitsMessage(httpError(422, { errors: ["nope"] }), 15, t)).toBeNull();
    expect(quantityBelowSoldUnitsMessage(httpError(500, {}), 15, t)).toBeNull();
    expect(quantityBelowSoldUnitsMessage({}, 15, t)).toBeNull();
  });
});

describe("willReopenOnSave", () => {
  it("is true only when raising quantity above what a SOLD listing has already sold", () => {
    expect(
      willReopenOnSave({ status: "sold", soldUnits: 15, typedQuantity: 20 })
    ).toBe(true);
  });

  it("is false for a listing that is not currently sold — nothing to reopen", () => {
    expect(
      willReopenOnSave({ status: "active", soldUnits: 3, typedQuantity: 20 })
    ).toBe(false);
    expect(
      willReopenOnSave({ status: "reserved", soldUnits: 1, typedQuantity: 5 })
    ).toBe(false);
    expect(
      willReopenOnSave({ status: "draft", soldUnits: 0, typedQuantity: 5 })
    ).toBe(false);
  });

  it("is false when the typed quantity stays at or below what already sold — that edit is refused, not a reopen", () => {
    expect(
      willReopenOnSave({ status: "sold", soldUnits: 15, typedQuantity: 15 })
    ).toBe(false);
    expect(
      willReopenOnSave({ status: "sold", soldUnits: 15, typedQuantity: 10 })
    ).toBe(false);
  });

  it("is false for a missing/NaN typed quantity rather than throwing", () => {
    expect(
      willReopenOnSave({ status: "sold", soldUnits: 15, typedQuantity: null })
    ).toBe(false);
    expect(
      willReopenOnSave({ status: "sold", soldUnits: 15, typedQuantity: NaN })
    ).toBe(false);
  });
});
