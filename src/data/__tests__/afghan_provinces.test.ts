import { AFGHAN_PROVINCES, nearestProvince } from "../afghan_provinces";

/**
 * `nearestProvince` exists so a dropped map pin can NAME its own province.
 *
 * Before it, Edit Profile could save a pin in Herat alongside province "Kabul" —
 * the precise field and the coarse one disagreeing, with nothing to say which the
 * seller meant.
 */
describe("nearestProvince", () => {
  it("names the province a capital sits in", () => {
    // Every capital must resolve to its own province, or the mapping is wrong.
    for (const p of AFGHAN_PROVINCES) {
      expect(nearestProvince(p.lat, p.lng)?.value).toBe(p.value);
    }
  });

  it("resolves a point near a city but off its capital coordinate", () => {
    expect(nearestProvince(34.5658, 69.2125)?.value).toBe("Kabul"); // Kabul airport
    expect(nearestProvince(34.36, 62.19)?.value).toBe("Herat");
  });

  it("does not confuse the eastern provinces, which sit close together", () => {
    // Kunar / Laghman / Nuristan are within ~80km of one another, so a distance
    // without the cos(lat) correction mixes them up.
    expect(nearestProvince(34.8742, 71.1462)?.value).toBe("Kunar");
    expect(nearestProvince(34.668, 70.2089)?.value).toBe("Laghman");
    expect(nearestProvince(35.4264, 70.9181)?.value).toBe("Nuristan");
  });

  it("returns null for a non-coordinate rather than guessing", () => {
    expect(nearestProvince(NaN, 69)).toBeNull();
    expect(nearestProvince(34, Infinity)).toBeNull();
  });

  it("still answers for a point outside Afghanistan without crashing", () => {
    // A seller abroad tapping "use my location" is a real path — production
    // listing 61 sits in Paris.
    expect(nearestProvince(48.86, 2.35)).not.toBeNull();
  });
});
