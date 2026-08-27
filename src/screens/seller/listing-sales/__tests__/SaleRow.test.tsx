/**
 * SaleRow — Jest unit tests (SF-M5, docs/SELL_FLOW_REDESIGN.md §10.3).
 *
 * Covers:
 *  1. Renders the buyer's identity (name + avatar via UserIdentity).
 *  2. Renders "Sold outside Hatiwal" — never the "buyer info unavailable"
 *     fallback — for an SF-B3 outside-buyer row (`buyer: null`).
 *  3. Quantity only renders when the listing is multi-unit.
 *  4. Tapping the row calls onPress.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { Transaction } from "@/api/transactions";

jest.mock("lucide-react-native", () => ({
  ChevronRight: "ChevronRight",
  ChevronLeft: "ChevronLeft",
}));

jest.mock("@/components/common/PriceTag", () => ({
  PriceTag: "PriceTag",
}));

import { SaleRow } from "../SaleRow";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 501,
    status: "sold",
    finalPrice: 14000,
    currency: "AFN",
    quantity: 3,
    completedAt: "2026-06-01T00:00:00Z",
    createdAt: "2026-06-01T00:00:00Z",
    role: "seller",
    listing: { id: 42, title: "Rugs", thumbnailUrl: null, price: 14000, currency: "AFN", multiUnit: true, availableUnits: 10 },
    buyer: { id: 9, name: "Zahra Noori", avatarUrl: null },
    seller: { id: 1, name: "Ahmad", avatarUrl: null },
    ...overrides,
  };
}

describe("SaleRow", () => {
  it("renders the buyer's name", () => {
    render(<SaleRow transaction={makeTransaction()} multiUnit onPress={jest.fn()} />);
    expect(screen.getByText("Zahra Noori")).toBeTruthy();
  });

  it("renders 'Sold outside Hatiwal' for a buyer-less row (SF-B3), not a generic fallback", () => {
    render(<SaleRow transaction={makeTransaction({ buyer: null })} multiUnit onPress={jest.fn()} />);
    expect(screen.getByText("listing.sale.outsideBuyer")).toBeTruthy();
    expect(screen.queryByText("listing.sale.noBuyerRecorded")).toBeNull();
  });

  it("shows the quantity when the listing is multi-unit", () => {
    render(<SaleRow transaction={makeTransaction({ id: 1, quantity: 3 })} multiUnit onPress={jest.fn()} />);
    expect(screen.getByTestId("sale-row-quantity-1")).toBeTruthy();
  });

  it("hides the quantity for a single-item listing", () => {
    render(<SaleRow transaction={makeTransaction({ id: 2, quantity: 1 })} multiUnit={false} onPress={jest.fn()} />);
    expect(screen.queryByTestId("sale-row-quantity-2")).toBeNull();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<SaleRow transaction={makeTransaction()} multiUnit onPress={onPress} />);
    fireEvent.press(screen.getByTestId("sale-row-501"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
