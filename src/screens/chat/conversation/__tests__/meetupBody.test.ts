/**
 * meetupBody — Jest unit tests (TASK-M263).
 *
 * Covers:
 *  - encodeMeetupBody: legacy 2-part (no coords), 3-part (with coords),
 *    invalid coords fall back to legacy format
 *  - parseMeetupBody: legacy 2-part, 3-part with valid coords, malformed
 *    3rd segment (non-numeric / wrong shape), empty/null body
 *  - round-trip: encode then parse recovers the same place/time/coords
 */
import { encodeMeetupBody, parseMeetupBody } from "../meetupBody";

describe("encodeMeetupBody", () => {
  it("encodes the legacy 2-part format when no coords are given", () => {
    expect(encodeMeetupBody("Kabul City Center", "Fri 3pm")).toBe(
      "Kabul City Center | Fri 3pm"
    );
  });

  it("encodes the legacy 2-part format when coords is undefined", () => {
    expect(encodeMeetupBody("Kabul City Center", "Fri 3pm", undefined)).toBe(
      "Kabul City Center | Fri 3pm"
    );
  });

  it("encodes the legacy 2-part format when coords is null", () => {
    expect(encodeMeetupBody("Kabul City Center", "Fri 3pm", null)).toBe(
      "Kabul City Center | Fri 3pm"
    );
  });

  it("appends a 3rd 'lat,long' segment when coords are provided", () => {
    expect(
      encodeMeetupBody("Kabul City Center", "Fri 3pm", { lat: 34.5553, long: 69.2075 })
    ).toBe("Kabul City Center | Fri 3pm | 34.5553,69.2075");
  });

  it("falls back to the legacy format when coords contain non-finite values", () => {
    expect(
      encodeMeetupBody("Kabul City Center", "Fri 3pm", { lat: NaN, long: 69.2075 })
    ).toBe("Kabul City Center | Fri 3pm");
  });
});

describe("parseMeetupBody — legacy 2-part", () => {
  it("parses place and time, coords is null", () => {
    const result = parseMeetupBody("Kabul City Center | Fri 3pm");
    expect(result).toEqual({
      place: "Kabul City Center",
      time: "Fri 3pm",
      coords: null,
    });
  });
});

describe("parseMeetupBody — 3-part with coords", () => {
  it("parses place, time, and coords", () => {
    const result = parseMeetupBody("Kabul City Center | Fri 3pm | 34.5553,69.2075");
    expect(result).toEqual({
      place: "Kabul City Center",
      time: "Fri 3pm",
      coords: { lat: 34.5553, long: 69.2075 },
    });
  });

  it("round-trips through encodeMeetupBody", () => {
    const coords = { lat: 31.6, long: 65.7 };
    const encoded = encodeMeetupBody("Herat Bazaar", "Tomorrow noon", coords);
    const parsed = parseMeetupBody(encoded);
    expect(parsed).toEqual({
      place: "Herat Bazaar",
      time: "Tomorrow noon",
      coords,
    });
  });
});

describe("parseMeetupBody — malformed input", () => {
  it("tolerates a non-numeric 3rd segment (falls back to coords: null)", () => {
    const result = parseMeetupBody("Kabul City Center | Fri 3pm | not-a-coordinate");
    expect(result.place).toBe("Kabul City Center");
    expect(result.time).toBe("Fri 3pm");
    expect(result.coords).toBeNull();
  });

  it("tolerates a 3rd segment with only one number (wrong shape)", () => {
    const result = parseMeetupBody("Kabul City Center | Fri 3pm | 34.5553");
    expect(result.coords).toBeNull();
  });

  it("tolerates a 3rd segment with extra commas", () => {
    const result = parseMeetupBody("Kabul City Center | Fri 3pm | 34.5,69.2,extra");
    expect(result.coords).toBeNull();
  });

  it("tolerates an empty string body", () => {
    const result = parseMeetupBody("");
    expect(result).toEqual({ place: "", time: "", coords: null });
  });

  it("tolerates a null body", () => {
    const result = parseMeetupBody(null);
    expect(result).toEqual({ place: "", time: "", coords: null });
  });

  it("tolerates an undefined body", () => {
    const result = parseMeetupBody(undefined);
    expect(result).toEqual({ place: "", time: "", coords: null });
  });

  it("tolerates a body with no separators at all (place-only)", () => {
    const result = parseMeetupBody("Kabul City Center");
    expect(result).toEqual({ place: "Kabul City Center", time: "", coords: null });
  });
});
