import { fallbackCenter, profileCenter, sameCoords } from "../mapDefaults";
import { DEFAULT_CENTER } from "@/components/common/map/MapCanvas.types";
import { getProvinceByValue } from "@/data/afghan_provinces";

const herat = getProvinceByValue("Herat")!;

describe("profileCenter", () => {
  it("uses the profile's own map point, also when the API sends strings", () => {
    expect(profileCenter({ latitude: "34.350000", longitude: "62.200000" })).toEqual({ latitude: 34.35, longitude: 62.2 });
    expect(profileCenter({ latitude: 31.61, longitude: 65.71 })).toEqual({ latitude: 31.61, longitude: 65.71 });
  });

  it("falls back to the province capital, then the city when it names a province", () => {
    expect(profileCenter({ province: "Herat" })).toEqual({ latitude: herat.lat, longitude: herat.lng });
    expect(profileCenter({ city: "Herat" })).toEqual({ latitude: herat.lat, longitude: herat.lng });
  });

  it("ignores unusable points: 0,0, out of range, half-set, non-numeric", () => {
    expect(profileCenter({ latitude: 0, longitude: 0, province: "Herat" })).toEqual({ latitude: herat.lat, longitude: herat.lng });
    expect(profileCenter({ latitude: "999", longitude: "62" })).toBeNull();
    expect(profileCenter({ latitude: "34.3", longitude: null })).toBeNull();
    expect(profileCenter({ latitude: "abc", longitude: "62" })).toBeNull();
  });

  it("returns null when the profile says nothing usable", () => {
    expect(profileCenter(null)).toBeNull();
    expect(profileCenter({})).toBeNull();
    expect(profileCenter({ city: "Somewhere unknown" })).toBeNull();
  });
});

describe("fallbackCenter", () => {
  it("is the profile address when known, otherwise Kabul", () => {
    expect(fallbackCenter({ province: "Herat" })).toEqual({ latitude: herat.lat, longitude: herat.lng });
    expect(fallbackCenter(null)).toEqual(DEFAULT_CENTER);
    expect(sameCoords(fallbackCenter({}), DEFAULT_CENTER)).toBe(true);
  });
});
