/**
 * withAlpha — TASK-K729 review fix (HIGH: "the only `+ \"33\"` color
 * concatenation left in src/").
 *
 * `useColors()` always returns `hsl(...)`/`rgb(...)` strings (see
 * src/hooks/useColors.ts) — never hex. Appending a hex alpha suffix like
 * `color + "33"` to an `hsl(...)` string produces a syntactically-invalid
 * value (`"hsl(38, 92%, 40%)33"`) that React Native's color parser accepts
 * anyway by silently discarding the trailing garbage, so the intended
 * ~20%-alpha tint renders as a FULLY OPAQUE color instead. There is no
 * visible error — this only shows up as "why is this border/fill so much
 * more solid than intended".
 *
 * This helper was previously hand-duplicated (byte-for-byte) in
 * `MapCanvas.ios.tsx` and `MapCanvas.android.tsx` — promoted here per the
 * house no-duplication rule so every caller (including
 * `ListingStatusBanner`) shares the one implementation.
 *
 * TASK-K729 (review fix, LOW): `useColors()` also exposes several ALREADY
 * translucent tokens (`primaryAlpha`, `sellerAlpha`, `destructiveAlpha`,
 * `successAlpha`, `warningAlpha`) as `rgba(...)` — a caller reaching for "a
 * translucent accent" will naturally reach for one of those. Before this fix,
 * `"rgba(245,158,11,0.15)".startsWith("rgb(")` is FALSE (`"rgba"` !=
 * `"rgb("`), and it matches none of the other branches either, so the final
 * `return c` handed the input back UNCHANGED — the caller's requested alpha
 * was silently discarded and the value kept its original alpha. Same
 * silent pass-through for an already-`hsla(...)` value. This is exactly the
 * class of bug this helper was promoted to eliminate, so an already-alpha'd
 * input now has its trailing alpha component REPLACED with the requested
 * one instead of falling through. Any other unrecognised format (a named
 * color like `"transparent"`, an `hsl()`-with-percent-alpha `#rrggbbaa`,
 * etc.) now warns loudly in dev instead of silently handing back an opaque
 * value with no signal that the alpha was ignored.
 */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith("hsl(")) return c.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  // Already an `hsla(...)`/`rgba(...)` value (e.g. one of useColors()'s
  // `*Alpha` tokens) — replace its EXISTING trailing alpha component with the
  // caller's requested one, rather than falling through to `return c`
  // unchanged (which silently kept the token's own baked-in alpha).
  if (c.startsWith("hsla(") || c.startsWith("rgba(")) {
    const ALPHA_TAIL = /,\s*[\d.]+\s*\)$/;
    if (ALPHA_TAIL.test(c)) return c.replace(ALPHA_TAIL, `, ${alpha})`);
    // Well-formed hsla()/rgba() always ends in ", <alpha>)" — falling through
    // here means the string is malformed, so warn rather than silently keep it.
  }
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  // Unrecognised format — warn loudly in dev instead of silently returning an
  // opaque value with the requested alpha discarded (the bug this helper
  // exists to eliminate).
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `withAlpha: unrecognised color format "${c}" — returning it unchanged; alpha ${alpha} was NOT applied.`
    );
  }
  return c;
}
