/**
 * withAlpha — Jest unit tests (TASK-K729 review fix, LOW).
 *
 * `withAlpha` had zero direct test coverage before this — its behaviour was
 * only asserted indirectly, for the `hsl()` path only, via
 * `ListingStatusBanner.test.tsx`. This file pins every documented input
 * format, including the regression the review caught: an already-alpha'd
 * `rgba(...)`/`hsla(...)` input (e.g. one of `useColors()`'s `*Alpha`
 * tokens: `primaryAlpha`, `warningAlpha`, ...) used to fall through the
 * final `return c` and hand the caller's requested alpha back UNCHANGED.
 */
import { withAlpha } from "../color";

describe("withAlpha", () => {
  it("converts an hsl(...) color to hsla(...) with the requested alpha", () => {
    expect(withAlpha("hsl(38, 92%, 40%)", 0.2)).toBe("hsla(38, 92%, 40%, 0.2)");
  });

  it("converts an rgb(...) color to rgba(...) with the requested alpha", () => {
    expect(withAlpha("rgb(37, 99, 235)", 0.5)).toBe("rgba(37, 99, 235, 0.5)");
  });

  // ── TASK-K729 (review fix, LOW): the regression this test guards ──────────
  // Before the fix, `"rgba(245,158,11,0.15)".startsWith("rgb(")` is FALSE
  // ('rgba' != 'rgb('), and it started with neither '#' nor 'hsl(', so the
  // final `return c` handed the input back UNCHANGED — the caller's
  // requested alpha was silently discarded.
  it("replaces the EXISTING trailing alpha on an already-rgba(...) input (e.g. useColors().warningAlpha) with the requested one", () => {
    expect(withAlpha("rgba(245,158,11,0.15)", 0.2)).toBe("rgba(245,158,11, 0.2)");
  });

  it("replaces the EXISTING trailing alpha on an already-hsla(...) input with the requested one", () => {
    expect(withAlpha("hsla(38, 92%, 40%, 0.1)", 0.35)).toBe("hsla(38, 92%, 40%, 0.35)");
  });

  it("converts a 6-digit hex color (#rrggbb) to rgba(...) with the requested alpha", () => {
    expect(withAlpha("#2563eb", 0.1)).toBe("rgba(37, 99, 235, 0.1)");
  });

  it("converts a 3-digit hex color (#rgb) to rgba(...) with the requested alpha", () => {
    // #036 expands to #003366
    expect(withAlpha("#036", 0.4)).toBe("rgba(0, 51, 102, 0.4)");
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(withAlpha("  hsl(38, 92%, 40%)  ", 0.2)).toBe("hsla(38, 92%, 40%, 0.2)");
  });

  // ── Unrecognised formats — warn loudly instead of silently going opaque ───
  it("returns a named color unchanged and warns in dev instead of silently discarding the requested alpha", () => {
    const originalDev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(withAlpha("transparent", 0.5)).toBe("transparent");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("transparent");

    warnSpy.mockRestore();
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("does not warn when __DEV__ is false", () => {
    const originalDev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(withAlpha("papayawhip", 0.5)).toBe("papayawhip");
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
  });
});
