/**
 * Unit tests for src/utils/geocoding.ts
 *
 * Covers:
 *  - searchPlaces(query):
 *    · returns [] without calling fetch for queries shorter than 2 chars
 *    · maps a Nominatim jsonv2 array into GeocodeResult[] correctly
 *      (label = first comma-part, detail = next 1-2 parts, lat/lon as numbers)
 *    · returns [] on a non-ok HTTP response
 *    · returns [] when fetch throws
 *  - reverseGeocode(lat, lng):
 *    · returns "label, detail" string built from display_name
 *    · returns null when display_name is missing from response
 *    · returns null on a non-ok HTTP response
 *    · returns null when fetch throws
 *
 * fetch is fully mocked — no real network calls are made.
 */

import { searchPlaces, reverseGeocode, GeocodeResult } from "../geocoding";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Nominatim jsonv2 search result object. */
function nominatimResult(overrides: Partial<{
  display_name: string;
  lat: string;
  lon: string;
}> = {}) {
  return {
    display_name: "Jalalabad, Nangarhar, Afghanistan",
    lat: "34.4265",
    lon: "70.4515",
    ...overrides,
  };
}

/** Create a mock Response-like object for jest.spyOn(global, 'fetch'). */
function mockResponse(ok: boolean, body: unknown) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

// ---------------------------------------------------------------------------
// searchPlaces
// ---------------------------------------------------------------------------

describe("searchPlaces", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
      return mockResponse(true, []);
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // Short-query short-circuit
  it("returns [] immediately for an empty string without calling fetch", async () => {
    const result = await searchPlaces("");
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns [] for a single-character query without calling fetch", async () => {
    const result = await searchPlaces("K");
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns [] for a whitespace-only string without calling fetch", async () => {
    const result = await searchPlaces("  ");
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls fetch for a 2-char query", async () => {
    fetchSpy.mockImplementation(() => mockResponse(true, []));
    await searchPlaces("Ka");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // jsonv2 mapping
  it("maps a Nominatim jsonv2 array to GeocodeResult[]", async () => {
    const raw = [
      nominatimResult({
        display_name: "Jalalabad, Nangarhar, Afghanistan",
        lat: "34.4265",
        lon: "70.4515",
      }),
    ];
    fetchSpy.mockImplementation(() => mockResponse(true, raw));

    const results = await searchPlaces("Jalalabad");

    expect(results).toHaveLength(1);
    const r: GeocodeResult = results[0];
    expect(r.label).toBe("Jalalabad");
    expect(r.detail).toBe("Nangarhar, Afghanistan");
    expect(r.latitude).toBe(34.4265);
    expect(r.longitude).toBe(70.4515);
    expect(typeof r.latitude).toBe("number");
    expect(typeof r.longitude).toBe("number");
  });

  it("maps multiple results correctly", async () => {
    const raw = [
      nominatimResult({
        display_name: "Kabul, Kabul Province, Afghanistan",
        lat: "34.5553",
        lon: "69.2075",
      }),
      nominatimResult({
        display_name: "Kandahar, Kandahar Province, Afghanistan",
        lat: "31.6259",
        lon: "65.7372",
      }),
    ];
    fetchSpy.mockImplementation(() => mockResponse(true, raw));

    const results = await searchPlaces("Ka");

    expect(results).toHaveLength(2);
    expect(results[0].label).toBe("Kabul");
    expect(results[0].detail).toBe("Kabul Province, Afghanistan");
    expect(results[1].label).toBe("Kandahar");
    expect(results[1].detail).toBe("Kandahar Province, Afghanistan");
  });

  it("handles a display_name with only one part (no commas)", async () => {
    const raw = [nominatimResult({ display_name: "Afghanistan" })];
    fetchSpy.mockImplementation(() => mockResponse(true, raw));

    const results = await searchPlaces("Afg");

    expect(results[0].label).toBe("Afghanistan");
    expect(results[0].detail).toBe("");
  });

  it("handles a display_name with exactly two parts", async () => {
    const raw = [nominatimResult({ display_name: "Herat, Afghanistan" })];
    fetchSpy.mockImplementation(() => mockResponse(true, raw));

    const results = await searchPlaces("Herat");

    expect(results[0].label).toBe("Herat");
    expect(results[0].detail).toBe("Afghanistan");
  });

  // Error fallbacks
  it("returns [] on a non-ok HTTP response", async () => {
    fetchSpy.mockImplementation(() => mockResponse(false, null));

    const results = await searchPlaces("Kabul");

    expect(results).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns [] when fetch throws a network error", async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error("Network Error")));

    const results = await searchPlaces("Kabul");

    expect(results).toEqual([]);
  });

  it("returns [] when response body is not an array", async () => {
    fetchSpy.mockImplementation(() => mockResponse(true, { error: "too many requests" }));

    const results = await searchPlaces("Kabul");

    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// reverseGeocode
// ---------------------------------------------------------------------------

describe("reverseGeocode", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
      return mockResponse(true, {
        display_name: "Chicken Street, Kabul, Kabul Province, Afghanistan",
      });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns 'label, detail' string from display_name", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, {
        display_name: "Chicken Street, Kabul, Kabul Province, Afghanistan",
      })
    );

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBe("Chicken Street, Kabul, Kabul Province");
  });

  it("returns just the label when display_name has only one part", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, { display_name: "Afghanistan" })
    );

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBe("Afghanistan");
  });

  it("returns label with one detail part when display_name has exactly two parts", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, { display_name: "Herat, Afghanistan" })
    );

    const result = await reverseGeocode(34.3482, 62.2000);

    expect(result).toBe("Herat, Afghanistan");
  });

  it("returns null when display_name is missing", async () => {
    fetchSpy.mockImplementation(() => mockResponse(true, {}));

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBeNull();
  });

  it("returns null when display_name is null", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, { display_name: null })
    );

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBeNull();
  });

  it("returns null on a non-ok HTTP response", async () => {
    fetchSpy.mockImplementation(() => mockResponse(false, null));

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBeNull();
  });

  it("returns null when fetch throws a network error", async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error("Network Error")));

    const result = await reverseGeocode(34.5553, 69.2075);

    expect(result).toBeNull();
  });

  // A STORED address must not be frozen in its creator's language.
  //
  // Production has a listing whose address reads
  // "لسمه ناحیه، کابل، کابل شاروالي." on the ENGLISH page, and another whose
  // city is "پاريس" — each written in whatever language the seller's UI
  // happened to be, then shown to every viewer. These two pin which call gets
  // which language.
  it("asks for ENGLISH first when the label will be stored (canonical)", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, { display_name: "Kabul, Afghanistan" })
    );

    await reverseGeocode(34.5553, 69.2075, { canonical: true });

    const url: string = fetchSpy.mock.calls[0][0];
    expect(url).toContain("accept-language=en,ps,fa");
  });

  it("keeps asking in the USER's language for a label they only read once", async () => {
    // Pashto UI: the browse filter's own row is ephemeral and belongs in the
    // reader's language, so this path must NOT be forced to English. Asserted
    // with a ps locale on purpose — under the suite's default English locale
    // both paths produce the identical header, so an English-only test would
    // pass whether the split worked or not.
    const i18n = require("@/i18n").default;
    const previous = i18n.language;
    i18n.language = "ps";
    try {
      fetchSpy.mockImplementation(() =>
        mockResponse(true, { display_name: "کابل" })
      );

      await reverseGeocode(34.5553, 69.2075);
      const url: string = fetchSpy.mock.calls[0][0];
      expect(url).toContain("accept-language=ps");
      expect(url).not.toContain("accept-language=en");

      // …while a STORED address stays English even for that same ps user.
      fetchSpy.mockClear();
      await reverseGeocode(34.5553, 69.2075, { canonical: true });
      const stored: string = fetchSpy.mock.calls[0][0];
      expect(stored).toContain("accept-language=en,ps,fa");
    } finally {
      i18n.language = previous;
    }
  });

  it("calls fetch with the correct lat/lon in the URL", async () => {
    fetchSpy.mockImplementation(() =>
      mockResponse(true, { display_name: "Kabul, Afghanistan" })
    );

    await reverseGeocode(34.5553, 69.2075);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url: string = fetchSpy.mock.calls[0][0];
    expect(url).toContain("lat=34.5553");
    expect(url).toContain("lon=69.2075");
  });
});
