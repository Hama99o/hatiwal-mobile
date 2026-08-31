/**
 * offerQuantity — SF-M11 unit tests.
 *
 * These rules are the whole reason the module exists: the serializer sends
 * `null` for "the sender didn't say", and EVERY consumer (offer bubble, agreed
 * deal banner, mark-sold prefill) has to read that the same way or the app
 * disagrees with itself about how many units a deal is for.
 */
import {
  offerUnits,
  shouldShowOfferUnits,
  parseOfferQuantity,
  OFFER_QUANTITY_ABOVE_AVAILABLE_KEY,
} from "../offerQuantity";

describe("offerUnits", () => {
  it("reads an absent quantity as ONE unit, not zero", () => {
    // The single most important case: `null` is what the serializer sends for
    // every offer on a single-item listing, every offer whose sender named no
    // quantity, and every offer written before SF-B11 shipped. Answering 0
    // here would render "0 × AFN 14,000" and sell nothing.
    expect(offerUnits(null)).toBe(1);
    expect(offerUnits(undefined)).toBe(1);
  });

  it("passes a real quantity through", () => {
    expect(offerUnits(3)).toBe(3);
    expect(offerUnits(1)).toBe(1);
  });

  it("falls back to one for values the column should never hold", () => {
    // Only reachable from a corrupted row (the column is validated positive
    // server-side), but a thread must stay readable rather than render "-2 ×".
    expect(offerUnits(0)).toBe(1);
    expect(offerUnits(-5)).toBe(1);
    expect(offerUnits(NaN)).toBe(1);
    expect(offerUnits(2.7)).toBe(2);
  });
});

describe("shouldShowOfferUnits", () => {
  it("shows nothing for one unit or an unspecified quantity", () => {
    // A "1 ×" prefix is noise, and on a single-item listing it is actively
    // confusing — this is what keeps single-item threads byte-identical.
    expect(shouldShowOfferUnits(null)).toBe(false);
    expect(shouldShowOfferUnits(1)).toBe(false);
  });

  it("shows the units once there is more than one", () => {
    expect(shouldShowOfferUnits(2)).toBe(true);
    expect(shouldShowOfferUnits(15)).toBe(true);
  });
});

describe("parseOfferQuantity", () => {
  it("treats an empty field as 'didn't say' — no value, no error", () => {
    // Empty must NOT be an error: the field is optional, and the server reads a
    // missing `offer_quantity` as unspecified.
    expect(parseOfferQuantity("", 15)).toEqual({ value: null, errorKey: null });
    expect(parseOfferQuantity("   ", 15)).toEqual({ value: null, errorKey: null });
  });

  it("accepts a whole positive number within stock", () => {
    expect(parseOfferQuantity("3", 15)).toEqual({ value: 3, errorKey: null });
    expect(parseOfferQuantity("15", 15)).toEqual({ value: 15, errorKey: null });
  });

  it("rejects a quantity above what is left, with the server's own ceiling", () => {
    // The buyer finds this out BEFORE sending, instead of decoding a 422.
    const r = parseOfferQuantity("20", 15);
    expect(r.value).toBeNull();
    expect(r.errorKey).toBe(OFFER_QUANTITY_ABOVE_AVAILABLE_KEY);
  });

  it("rejects zero, negatives, fractions and junk", () => {
    for (const bad of ["0", "-3", "2.5", "abc", "3abc"]) {
      const r = parseOfferQuantity(bad, 15);
      expect(r.value).toBeNull();
      expect(r.errorKey).toBe("chat.offer.quantityInvalid");
    }
  });

  it("does not invent a ceiling when stock is unknown", () => {
    // `availableUnits` is absent on a listing whose stock hasn't loaded; a
    // client-side ceiling of 0 would block every offer.
    expect(parseOfferQuantity("99", undefined)).toEqual({ value: 99, errorKey: null });
    expect(parseOfferQuantity("99", null)).toEqual({ value: 99, errorKey: null });
    expect(parseOfferQuantity("99", 0)).toEqual({ value: 99, errorKey: null });
  });
});
