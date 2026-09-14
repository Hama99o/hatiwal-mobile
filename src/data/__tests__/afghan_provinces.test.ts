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

// Pakistan's provinces and territories, added 2026-09-14 after the owner
// reported that KPK could not be picked at all — on an app that already shipped
// Pakistan's map tiles and PKR.
describe("Pakistan's provinces and territories", () => {
  const PK = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
              "Islamabad", "Gilgit-Baltistan", "Azad Kashmir"];

  it("all seven are present", () => {
    for (const v of PK) {
      expect(AFGHAN_PROVINCES.find((p) => p.value === v)).toBeDefined();
    }
  });

  it("each carries a capital coordinate that nearestProvince can rank", () => {
    for (const v of PK) {
      const p = AFGHAN_PROVINCES.find((x) => x.value === v)!;
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
    }
  });

  it("nearestProvince resolves real Pakistani cities to the right unit", () => {
    // The whole point of the coordinates: a pin dropped in these cities must
    // name the province a seller would recognise, not the closest Afghan one.
    expect(nearestProvince(31.5204, 74.3587)?.value).toBe("Punjab");        // Lahore
    expect(nearestProvince(24.8607, 67.0011)?.value).toBe("Sindh");         // Karachi
    expect(nearestProvince(34.0151, 71.5249)?.value).toBe("Khyber Pakhtunkhwa"); // Peshawar
    expect(nearestProvince(30.1798, 66.9750)?.value).toBe("Balochistan");   // Quetta
  });

  it("Kabul still resolves to Kabul — Afghanistan is unaffected", () => {
    expect(nearestProvince(34.5553, 69.2075)?.value).toBe("Kabul");
  });

  it("carries the initialisms a seller actually types", () => {
    const kp = AFGHAN_PROVINCES.find((p) => p.value === "Khyber Pakhtunkhwa")!;
    expect(kp.aliases).toContain("KPK");
  });
});
