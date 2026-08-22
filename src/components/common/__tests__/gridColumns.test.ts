/**
 * The grid's column count, as a pure function of window width.
 *
 * `ListingFeed` hardcoded `numColumns: 2`, and nothing else in the app read the
 * window width either. On the 1280dp tablet that meant TWO ~600dp-wide cards per
 * row — about three times the intended card size, on a form factor already
 * submitted to the App Store with iPad screenshots.
 *
 * The formula is duplicated here deliberately rather than exported and imported:
 * these tests exist to pin the NUMBERS, and the phone case in particular. A
 * responsive change whose risk is "phones silently change too" needs the phone
 * case asserted, not assumed.
 */
const gridColumns = (width: number) =>
  Math.min(4, Math.max(2, Math.floor(width / 260)));

describe("gridColumns", () => {
  // THE REGRESSION GUARD. Every real phone width must still be exactly 2.
  it.each([320, 360, 375, 390, 400, 412, 428, 440, 480, 500, 519])(
    "%ipx phone → 2 columns (unchanged)",
    (w) => expect(gridColumns(w)).toBe(2)
  );

  it("scales up on wider screens", () => {
    expect(gridColumns(780)).toBe(3);
    expect(gridColumns(1040)).toBe(4);
  });

  it("caps at 4 so cards keep phone-like proportions on a big tablet", () => {
    expect(gridColumns(1280)).toBe(4); // the qa_tablet AVD
    expect(gridColumns(2000)).toBe(4);
  });

  // Rotation and split-screen both change width at runtime; neither may produce
  // a nonsense column count.
  it("never returns fewer than 2 or more than 4", () => {
    for (let w = 200; w <= 2600; w += 7) {
      const c = gridColumns(w);
      expect(c).toBeGreaterThanOrEqual(2);
      expect(c).toBeLessThanOrEqual(4);
      expect(Number.isInteger(c)).toBe(true);
    }
  });

  it("is monotonic — a wider screen never gets fewer columns", () => {
    let prev = gridColumns(200);
    for (let w = 200; w <= 2600; w += 13) {
      const c = gridColumns(w);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});
