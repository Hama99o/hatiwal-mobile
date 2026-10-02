import { agoParts, shortLocation } from "../listingMeta";

describe("shortLocation", () => {
  it("drops a repeated city and keeps two parts", () => {
    expect(shortLocation("10th District, Kabul, Kabul District")).toBe("10th District, Kabul");
  });

  it("handles the Arabic comma and Dari district words", () => {
    expect(shortLocation("ناحیه دهم، کابل، ولسوالی کابل")).toBe("ناحیه دهم, کابل");
  });

  it("keeps a single part and returns null for empty input", () => {
    expect(shortLocation("Herat")).toBe("Herat");
    expect(shortLocation("")).toBeNull();
    expect(shortLocation(null)).toBeNull();
  });
});

describe("agoParts", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const DAY = 24 * 60 * MIN;

  it.each([
    [ago(20_000), "now", 0],
    [ago(5 * MIN), "minutes", 5],
    [ago(3 * 60 * MIN), "hours", 3],
    [ago(2 * DAY), "days", 2],
    [ago(15 * DAY), "weeks", 2],
    [ago(65 * DAY), "months", 2],
    [ago(800 * DAY), "years", 2],
  ])("%s -> %s %i", (date, unit, n) => {
    expect(agoParts(date, now)).toEqual({ unit, n });
  });

  it("returns null for a missing or invalid date", () => {
    expect(agoParts(null, now)).toBeNull();
    expect(agoParts("not a date", now)).toBeNull();
  });
});
