import React from "react";
import { render, screen } from "@testing-library/react-native";
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
