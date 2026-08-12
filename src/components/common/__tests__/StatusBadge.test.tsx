import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { StatusBadge } from "../StatusBadge";

// t() returns the key in tests, so we assert on "listing.status.draft" etc.

describe("StatusBadge — inline mode", () => {
  it("renders draft status", () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText("listing.status.draft")).toBeTruthy();
  });

  it("renders active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("listing.status.active")).toBeTruthy();
  });

  it("renders reserved status", () => {
    render(<StatusBadge status="reserved" />);
    expect(screen.getByText("listing.status.reserved")).toBeTruthy();
  });

  it("renders sold status", () => {
    render(<StatusBadge status="sold" />);
    expect(screen.getByText("listing.status.sold")).toBeTruthy();
  });
});

describe("StatusBadge — overlay mode", () => {
  it("renders sold overlay", () => {
    render(<StatusBadge status="sold" overlay />);
    // toUpperCase() is applied in the component
    expect(screen.getByText("LISTING.STATUS.SOLD")).toBeTruthy();
  });

  it("renders reserved overlay", () => {
    render(<StatusBadge status="reserved" overlay />);
    expect(screen.getByText("LISTING.STATUS.RESERVED")).toBeTruthy();
  });

  it("returns null for draft in overlay mode", () => {
    const { toJSON } = render(<StatusBadge status="draft" overlay />);
    expect(toJSON()).toBeNull();
  });

  it("returns null for active in overlay mode", () => {
    const { toJSON } = render(<StatusBadge status="active" overlay />);
    expect(toJSON()).toBeNull();
  });
});

describe("StatusBadge — accessibility", () => {
  it("has accessibilityRole text for inline badge", () => {
    render(<StatusBadge status="active" />);
    const el = screen.getByRole("text");
    expect(el).toBeTruthy();
  });
});

// TASK-K729 (review fix, LOW — contrast, only partially fixed by
// ListingStatusBanner's colors.card move): the pill's fill alone barely
// contrasts against a card/background surface for `sold` — a subtle
// withAlpha(accent.text, 0.25) border gives it a real boundary on ANY
// surface, not just where the accent-tinted fill itself happens to differ.
// `accessibilityRole="text"` is set explicitly on the container View AND
// (via RNTL's implicit host-role inference) matched on the inner label Text
// too, and NativeWind's CSS interop wraps every RN primitive in extra
// forward-ref layers — so `getByRole`/`.parent` chains resolve to different
// depths depending on the wrapper. `UNSAFE_getAllByProps` matches on the
// literal `accessibilityRole` prop we authored, and its LAST match is always
// the innermost (host) node with the fully-flattened style.
function getContainerStyle(): Record<string, unknown> {
  const matches = screen.UNSAFE_getAllByProps({ accessibilityRole: "text" });
  return StyleSheet.flatten(matches.at(-1)!.props.style);
}

describe("StatusBadge — pill border (contrast fix)", () => {
  it("renders a 1px border tinted from the status's own text color, not the container's fill", () => {
    render(<StatusBadge status="sold" />);
    const flat = getContainerStyle();
    expect(flat.borderWidth).toBe(1);
    // secondaryForeground (mocked) is "hsl(222,47%,11%)" -> a 25%-alpha hsla(...)
    expect(flat.borderColor).toBe("hsla(222,47%,11%, 0.25)");
  });

  it("gives every status its own border tint (reserved uses the warning token, not sold's)", () => {
    render(<StatusBadge status="reserved" />);
    const flat = getContainerStyle();
    expect(flat.borderColor).toBe("hsla(38,92%,40%, 0.25)");
  });

  it("does not add a border to the overlay treatment (unaffected by this fix)", () => {
    render(<StatusBadge status="sold" overlay />);
    const flat = getContainerStyle();
    expect(flat.borderWidth).toBeUndefined();
  });
});
