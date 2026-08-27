/**
 * StockBadge unit tests — SF-M1/SF-M4 (docs/SELL_FLOW_REDESIGN.md §4.2.2/§4.5).
 *
 * StockBadge was extracted so ListingDetail, MyListingDetail and
 * SellerListingCard could share ONE "N in stock" / "N of M left" rule
 * instead of three drifting inline copies — but it shipped with zero test
 * coverage of its own, which is exactly how its held clause silently fell
 * behind the inline copies it was meant to replace (design review finding,
 * fixed alongside this file). These tests lock the contract in place now
 * that all three real screens render this component directly.
 *
 * `t()` is mocked globally (src/__tests__/setup.ts) to return the raw key —
 * so `t("listing.stock.inStock", {...}) + " · " + t("listing.stock.held")`
 * renders as the literal concatenated keys below. That's enough to prove
 * WHICH branch rendered without depending on real translation strings.
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { StockBadge } from "../StockBadge";

describe("StockBadge — single-item invariant", () => {
  it("renders nothing for a single-item listing, either audience", () => {
    render(
      <StockBadge
        listing={{ multiUnit: false, quantity: 1, availableUnits: 1 }}
        audience="buyer"
        testID="badge"
      />
    );
    expect(screen.queryByTestId("badge")).toBeNull();

    render(
      <StockBadge
        listing={{ multiUnit: false, quantity: 1, availableUnits: 0 }}
        audience="owner"
        testID="badge-owner"
      />
    );
    expect(screen.queryByTestId("badge-owner")).toBeNull();
  });

  it("renders nothing for a null/undefined listing", () => {
    render(<StockBadge listing={null} audience="buyer" testID="badge" />);
    expect(screen.queryByTestId("badge")).toBeNull();
  });
});

describe("StockBadge — buyer audience", () => {
  it("shows the plain in-stock phrasing when nothing is running out", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 12 }}
        audience="buyer"
        testID="badge"
      />
    );
    expect(screen.getByText("listing.stock.inStock")).toBeTruthy();
  });

  it("switches to the progress phrasing once stock is genuinely low", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 2 }}
        audience="buyer"
        testID="badge"
      />
    );
    expect(screen.getByText("listing.stock.leftOfTotal")).toBeTruthy();
  });

  it("never names the buyer, even if heldBuyerName is (incorrectly) passed", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }}
        audience="buyer"
        heldBuyerName="Ahmad Karimi"
      />
    );
    expect(screen.getByText("listing.stock.inStock · listing.stock.held")).toBeTruthy();
    expect(screen.queryByText(/Ahmad/)).toBeNull();
  });

  it("appends nothing when there is no open hold", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 12, heldUnits: 0 }}
        audience="buyer"
      />
    );
    expect(screen.getByText("listing.stock.inStock")).toBeTruthy();
  });
});

describe("StockBadge — owner audience", () => {
  it("shows the plain count before anything has sold (QA run-017 — no noisy 'N of N')", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 15 }}
        audience="owner"
        testID="badge"
      />
    );
    expect(screen.getByText("listing.stock.inStock")).toBeTruthy();
  });

  it("switches to progress phrasing the moment ANY unit has sold", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 14 }}
        audience="owner"
      />
    );
    expect(screen.getByText("listing.stock.leftOfTotal")).toBeTruthy();
  });

  it("appends the buyer's name to the held clause when heldBuyerName is provided", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }}
        audience="owner"
        heldBuyerName="Ahmad Karimi"
      />
    );
    expect(screen.getByText("listing.stock.leftOfTotal · listing.stock.heldForBuyer")).toBeTruthy();
  });

  it("falls back to the nameless held clause when heldBuyerName is absent (legacy row)", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }}
        audience="owner"
      />
    );
    expect(screen.getByText("listing.stock.leftOfTotal · listing.stock.held")).toBeTruthy();
  });
});

describe("StockBadge — misc", () => {
  it("forwards testID onto the rendered container", () => {
    render(
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 12 }}
        audience="buyer"
        testID="stock-badge-detail"
      />
    );
    expect(screen.getByTestId("stock-badge-detail")).toBeTruthy();
  });
});
