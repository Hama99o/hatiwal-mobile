import { describe, it, expect } from "@jest/globals";
import { normalizePhoneForWhatsApp, whatsappUrl } from "../whatsapp";

describe("normalizePhoneForWhatsApp", () => {
  it("strips + and spaces from an international number", () => {
    expect(normalizePhoneForWhatsApp("+93 70 000 0001")).toBe("93700000001");
  });

  it("strips dashes and parentheses", () => {
    expect(normalizePhoneForWhatsApp("+93-(70)-000-0001")).toBe("93700000001");
  });

  it("drops the 00 international prefix", () => {
    expect(normalizePhoneForWhatsApp("0093700000001")).toBe("93700000001");
  });

  it("converts the national trunk 0 to the country code", () => {
    expect(normalizePhoneForWhatsApp("0700000001")).toBe("93700000001");
  });

  it("prefixes a bare subscriber number", () => {
    expect(normalizePhoneForWhatsApp("700000001")).toBe("93700000001");
  });

  it("leaves an already-correct number alone", () => {
    expect(normalizePhoneForWhatsApp("93700000001")).toBe("93700000001");
  });

  it("returns null for empty, null and undefined", () => {
    expect(normalizePhoneForWhatsApp("")).toBeNull();
    expect(normalizePhoneForWhatsApp(null)).toBeNull();
    expect(normalizePhoneForWhatsApp(undefined)).toBeNull();
  });

  it("returns null for a string with no digits at all", () => {
    expect(normalizePhoneForWhatsApp("call me")).toBeNull();
  });

  it("returns null for something too short to dial", () => {
    // Better no button than a button that opens a chat with the wrong person.
    expect(normalizePhoneForWhatsApp("12345")).toBeNull();
  });

  it("returns null for something absurdly long", () => {
    expect(normalizePhoneForWhatsApp("9370000000123456789")).toBeNull();
  });

  // ── Service area beyond Afghanistan ──────────────────────────────────────
  //
  // The regression these cover: the old rule was "starts with 93 -> leave it,
  // otherwise prepend 93", so a correctly-written Pakistani or Iranian number
  // had its COUNTRY CODE treated as part of the subscriber number.

  it("leaves an international Pakistani number alone — it used to prepend 93 to it", () => {
    expect(normalizePhoneForWhatsApp("+92 300 1234567")).toBe("923001234567");
    expect(normalizePhoneForWhatsApp("0092 300 1234567")).toBe("923001234567");
  });

  it("leaves an international Iranian number alone", () => {
    expect(normalizePhoneForWhatsApp("+98 912 3456789")).toBe("989123456789");
  });

  it("reads a national-form number with the dial code it is given", () => {
    // The same digits mean different people in each country, which is exactly
    // why the caller passes the listing's province rather than guessing.
    expect(normalizePhoneForWhatsApp("03001234567", "92")).toBe("923001234567");
    expect(normalizePhoneForWhatsApp("0700000001", "93")).toBe("93700000001");
  });

  it("does not mistake a bare 9-digit subscriber number for a country code", () => {
    // "930000000" opens with 93 but is too short to be international, so it is
    // a subscriber number and still needs the prefix.
    expect(normalizePhoneForWhatsApp("930000000")).toBe("93930000000");
  });

  it("honours a different country code when asked", () => {
    expect(normalizePhoneForWhatsApp("0701234567", "98")).toBe("98701234567");
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link — no scheme, so it needs no iOS plist entry", () => {
    expect(whatsappUrl("+93 70 000 0001")).toBe("https://wa.me/93700000001");
  });

  it("is null when the number is unusable, so the caller can hide the button", () => {
    expect(whatsappUrl("nope")).toBeNull();
  });
});
