/**
 * ListingStatusBanner — Jest unit tests (TASK-K729 review fix).
 *
 * The ONE shared "this listing is reserved/sold" surface both
 * ListingDetail.tsx's own banner (`layout="strip"`) and the chat thread's
 * ListingUnavailableNotice (`layout="row"`) render — replacing two
 * hand-rolled, visually-drifted treatments with one. Covers:
 *  1. Renders the shared StatusBadge + title (+ optional subtitle) for both layouts.
 *  2. Renders `children` (the caller's own CTA row) inside the same surface.
 *  3. `reduceMotion` is accepted without throwing (entrance animation guard).
 *  4. `layout="strip"`'s border tint resolves to a real alpha channel
 *     (TASK-K729 review fix, HIGH — `accent.text + "33"` string
 *     concatenation on an hsl() string silently produced a FULLY OPAQUE
 *     border instead of ~20% alpha). `layout="row"` sits on `colors.card`
 *     with a solid (non-alpha) leading accent edge instead (TASK-K729
 *     review fix, MEDIUM — visual hierarchy: the accent-fill surface made
 *     StatusBadge's own pill, the subtitle and the outline button's border
 *     all lose contrast — see the component docstring).
 *  5. The caller's `style` prop (layout inset) merges on top of the
 *     container's own layout instead of replacing it (TASK-K729 review fix,
 *     MEDIUM — layout).
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { Text } from "@/components/reusables/text";
import { ListingStatusBanner } from "../ListingStatusBanner";

describe("ListingStatusBanner", () => {
  it("renders the shared StatusBadge + title for a reserved listing (row layout)", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved for you" layout="row" />);
    expect(screen.getByText("listing.status.reserved")).toBeTruthy();
    expect(screen.getByText("Reserved for you")).toBeTruthy();
  });

  it("renders the shared StatusBadge + title for a sold listing (strip layout)", () => {
    render(<ListingStatusBanner status="sold" title="Item sold" layout="strip" />);
    expect(screen.getByText("listing.status.sold")).toBeTruthy();
    expect(screen.getByText("Item sold")).toBeTruthy();
  });

  it("renders the optional subtitle when provided", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" subtitle="Reason line" layout="row" />);
    expect(screen.getByText("Reason line")).toBeTruthy();
  });

  it("omits the subtitle line when not provided", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" />);
    expect(screen.queryByText("Reason line")).toBeNull();
  });

  it("renders children (the caller's own CTA row) inside the same container", () => {
    render(
      <ListingStatusBanner status="sold" title="Item sold" layout="row">
        <View testID="cta-row">
          <Text>Browse similar</Text>
        </View>
      </ListingStatusBanner>
    );
    expect(screen.getByTestId("cta-row")).toBeTruthy();
    expect(screen.getByText("Browse similar")).toBeTruthy();
  });

  it("respects the testID prop on the outer container", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" testID="my-banner" />);
    expect(screen.getByTestId("my-banner")).toBeTruthy();
  });

  it("renders without throwing when reduceMotion=true (entrance animation guard)", () => {
    expect(() =>
      render(<ListingStatusBanner status="sold" title="Item sold" layout="strip" reduceMotion />)
    ).not.toThrow();
  });

  it("renders without throwing when reduceMotion=false (default — animated entrance)", () => {
    expect(() =>
      render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" />)
    ).not.toThrow();
  });

  // ── TASK-K729 (review fix, MEDIUM — visual hierarchy): row layout surface ──
  // `layout="row"` moved off the accent fill onto `colors.card` with a
  // leading accent edge (`borderStartWidth`/`borderStartColor`), so
  // StatusBadge's pill, the mutedForeground subtitle and the outline
  // button's border all regain real contrast (see the component docstring).
  it("renders the row layout on a colors.card surface with a solid (non-alpha) leading accent edge, not the accent fill", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" testID="card-row" />);
    const node = screen.getByTestId("card-row");
    const flat = StyleSheet.flatten(node.props.style);

    // colors.card / colors.border in light mode (the default test environment
    // — no theme override) — NOT the reserved accent tint
    // (colors.warningAlpha), which used to make StatusBadge's own pill
    // indistinguishable from its own container.
    expect(flat.backgroundColor).toBe("hsl(0,0%,100%)");
    expect(flat.borderColor).toBe("hsl(214,32%,91%)");
    expect(flat.borderStartWidth).toBe(4);
    // The leading edge is the full accent color (not alpha-diluted) — it's
    // the ONE deliberately-tinted element on an otherwise neutral card.
    expect(flat.borderStartColor).toBe("hsl(38,92%,40%)"); // colors.warning (reserved accent.text)
  });

  it("resolves the strip layout's bottom border to a real hsla() alpha channel, not an opaque hsl() string", () => {
    render(<ListingStatusBanner status="sold" title="Item sold" layout="strip" testID="alpha-strip" />);
    const node = screen.getByTestId("alpha-strip");
    const flat = StyleSheet.flatten(node.props.style);

    expect(flat.borderBottomColor).toMatch(/^hsla\(/);
    const alpha = Number(flat.borderBottomColor.match(/,\s*([\d.]+)\)$/)?.[1]);
    expect(alpha).toBeLessThan(1);
  });

  // ── TASK-K729 (review fix, MEDIUM — layout): style passthrough ──────────────
  it("merges the caller's style prop (e.g. layout inset) on top of its own container style", () => {
    render(
      <ListingStatusBanner
        status="sold"
        title="Item sold"
        layout="row"
        testID="inset-banner"
        style={{ marginHorizontal: 12, marginTop: 8 }}
      />
    );
    const node = screen.getByTestId("inset-banner");
    const flat = StyleSheet.flatten(node.props.style);

    expect(flat.marginHorizontal).toBe(12);
    expect(flat.marginTop).toBe(8);
    // The container's own layout (rounded, bordered accent card) survives —
    // the caller's style ADDS an inset, it doesn't replace the surface.
    expect(flat.borderRadius).toBe(10);
    expect(flat.borderWidth).toBe(1);
  });

  it("renders correctly with no style prop at all (backward compatible)", () => {
    render(<ListingStatusBanner status="reserved" title="Reserved" layout="row" testID="no-style-banner" />);
    const node = screen.getByTestId("no-style-banner");
    const flat = StyleSheet.flatten(node.props.style);
    expect(flat.borderRadius).toBe(10);
  });
});
