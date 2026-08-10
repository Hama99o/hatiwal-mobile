/**
 * getStatusAccent — Jest unit tests (TASK-K729 review fix).
 *
 * The single source of truth for "listing status -> {background, text}"
 * used by StatusBadge, SaleBuyerCard and ListingStatusBanner. Before this
 * shared map existed, `sold` had drifted to two different greys across
 * callers — these tests pin the mapping so it can't drift again.
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
} as unknown as Parameters<typeof getStatusAccent>[1];

describe("getStatusAccent", () => {
  it("maps 'active' to the success accent (green — live)", () => {
    expect(getStatusAccent("active", colors)).toEqual({ bg: "SUCCESS_BG", text: "SUCCESS_FG" });
  });

  it("maps 'reserved' to the warning accent (amber — held for a buyer)", () => {
    expect(getStatusAccent("reserved", colors)).toEqual({ bg: "WARNING_BG", text: "WARNING_FG" });
  });

  it("maps 'sold' to the secondary accent (grey — archived) — mirrors StatusBadge, not SaleBuyerCard's old muted ternary", () => {
    expect(getStatusAccent("sold", colors)).toEqual({ bg: "SECONDARY_BG", text: "SECONDARY_FG" });
  });

  it("falls back to the muted accent for 'draft'", () => {
    expect(getStatusAccent("draft", colors)).toEqual({ bg: "MUTED_BG", text: "MUTED_FG" });
  });
});
