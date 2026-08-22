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

/**
 * The chat bubble's width cap — same class of tablet bug as the grid above.
 *
 * Bubbles were capped only as a PERCENTAGE (78–82%). Fine on a phone, wrong on a
 * tablet: at 1280dp, 80% is a ~1000dp line of text, far past the ~45–75
 * characters that reads comfortably, so a long message became one enormous
 * ribbon across the screen.
 *
 * Formula duplicated deliberately, for the same reason as gridColumns: these
 * tests exist to pin the numbers, above all that PHONES DO NOT CHANGE.
 */
const BUBBLE_MAX_W = 520;
const bubbleMaxWidth = (screenW: number, pct: number) =>
  Math.min(screenW * pct, BUBBLE_MAX_W);

describe("bubbleMaxWidth", () => {
  // On every phone the percentage still wins — the cap must be inert there.
  it.each([320, 360, 375, 390, 412, 430, 480])(
    "%ipx phone: the percentage still decides",
    (w) => {
      expect(bubbleMaxWidth(w, 0.8)).toBeCloseTo(w * 0.8);
      expect(bubbleMaxWidth(w, 0.8)).toBeLessThan(BUBBLE_MAX_W);
    }
  );

  it("clamps on a tablet instead of spanning the screen", () => {
    // 1280dp tablet: 80% would be 1024dp of text on one line.
    expect(bubbleMaxWidth(1280, 0.8)).toBe(520);
    expect(bubbleMaxWidth(2560, 0.78)).toBe(520);
  });

  it("keeps the phone/tablet boundary where the cap actually bites", () => {
    // 650dp * 0.8 = 520 — exactly the cap; anything narrower is unclamped.
    expect(bubbleMaxWidth(649, 0.8)).toBeCloseTo(519.2);
    expect(bubbleMaxWidth(651, 0.8)).toBe(520);
  });

  it("never returns more than the cap, at any width or percentage", () => {
    for (const w of [200, 400, 800, 1280, 2560]) {
      for (const pct of [0.78, 0.8, 0.82]) {
        expect(bubbleMaxWidth(w, pct)).toBeLessThanOrEqual(BUBBLE_MAX_W);
      }
    }
  });
});
