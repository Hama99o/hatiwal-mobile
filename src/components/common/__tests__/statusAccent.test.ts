/**
 * getStatusAccent — Jest unit tests (TASK-K729 review fix).
 *
 * The single source of truth for "listing status -> {background, text, edge}"
 * used by StatusBadge, SaleBuyerCard and ListingStatusBanner. Before this
 * shared map existed, `sold` had drifted to two different greys across
 * callers — these tests pin the mapping so it can't drift again.
 *
 * TASK-K729 (review fix, MEDIUM — dark mode / status hierarchy): `edge` is
 * asserted SEPARATELY from `text` — reusing `text` as the leading accent
 * border made `sold` (secondaryForeground: near-white in dark mode) the
 * loudest element on the whole notice, louder than the amber `reserved`
 * state that's actually still awaiting buyer action. See the component
 * docstring for the full mapping rationale.
 */
import { getStatusAccent } from "../statusAccent";

const colors = {
  muted: "MUTED_BG",
  mutedForeground: "MUTED_FG",
  successAlpha: "SUCCESS_BG",
  success: "SUCCESS_FG",
  warningAlpha: "WARNING_BG",
  warning: "WARNING_FG",
  secondary: "SECONDARY_BG",
  secondaryForeground: "SECONDARY_FG",
  border: "BORDER",
} as unknown as Parameters<typeof getStatusAccent>[1];

describe("getStatusAccent", () => {
  it("maps 'active' to the success accent (green — live), edge matches text", () => {
    expect(getStatusAccent("active", colors)).toEqual({
      bg: "SUCCESS_BG",
      text: "SUCCESS_FG",
      edge: "SUCCESS_FG",
    });
  });

  it("maps 'reserved' to the warning accent (amber — held for a buyer), edge matches text", () => {
    expect(getStatusAccent("reserved", colors)).toEqual({
      bg: "WARNING_BG",
      text: "WARNING_FG",
      edge: "WARNING_FG",
    });
  });

  it("maps 'sold' to the secondary accent (grey — archived) — mirrors StatusBadge, not SaleBuyerCard's old muted ternary", () => {
    expect(getStatusAccent("sold", colors)).toEqual({ bg: "SECONDARY_BG", text: "SECONDARY_FG", edge: "MUTED_FG" });
  });

  it("dedicated edge for 'sold' is mutedForeground, NOT secondaryForeground (dark mode is near-white and would out-shout every other element)", () => {
    const accent = getStatusAccent("sold", colors);
    expect(accent.edge).toBe("MUTED_FG");
    expect(accent.edge).not.toBe(accent.text);
  });

  it("falls back to the muted accent for 'draft', edge is the quiet neutral border token", () => {
    expect(getStatusAccent("draft", colors)).toEqual({ bg: "MUTED_BG", text: "MUTED_FG", edge: "BORDER" });
  });
});
