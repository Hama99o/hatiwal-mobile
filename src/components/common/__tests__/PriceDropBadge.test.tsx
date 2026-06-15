import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PriceDropBadge } from "../PriceDropBadge";

// i18next mock returns the key with interpolated values, e.g.:
//   t("listing.priceDrop.badge", { percent: 15 }) → "listing.priceDrop.badge"
// We assert on the key string since the mock is a simple pass-through.

describe("PriceDropBadge — detail variant", () => {
  it("renders the badge text in detail mode", () => {
    render(<PriceDropBadge percent={15} variant="detail" />);
    expect(screen.getByText(/listing\.priceDrop\.badge/)).toBeTruthy();
  });

  it("returns null when percent is 0", () => {
    const { toJSON } = render(<PriceDropBadge percent={0} variant="detail" />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when percent is negative", () => {
    const { toJSON } = render(<PriceDropBadge percent={-5} variant="detail" />);
    expect(toJSON()).toBeNull();
  });

  it("renders with a positive percent value", () => {
    const { toJSON } = render(<PriceDropBadge percent={20} variant="detail" />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("PriceDropBadge — card variant", () => {
  it("renders the short badge text in card mode", () => {
    render(<PriceDropBadge percent={10} variant="card" />);
    expect(screen.getByText(/listing\.priceDrop\.badgeCardShort/)).toBeTruthy();
  });

  it("returns null when percent is 0 in card mode", () => {
    const { toJSON } = render(<PriceDropBadge percent={0} variant="card" />);
    expect(toJSON()).toBeNull();
  });

  it("renders with a positive percent in card mode", () => {
    const { toJSON } = render(<PriceDropBadge percent={5} variant="card" />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("PriceDropBadge — default variant", () => {
  it("defaults to detail variant when no variant prop is given", () => {
    render(<PriceDropBadge percent={25} />);
    expect(screen.getByText(/listing\.priceDrop\.badge/)).toBeTruthy();
  });
});
