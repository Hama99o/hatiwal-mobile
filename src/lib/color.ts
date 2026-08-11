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
 */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith("hsl(")) return c.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  return c;
}
