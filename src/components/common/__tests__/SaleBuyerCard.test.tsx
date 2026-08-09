/**
 * SaleBuyerCard — Jest unit tests (TASK-R418).
 *
 * Covers:
 *  1. Renders nothing when listing.sale is null/undefined
 *  2. Reserved state — "Reserved for {name}" headline + UserIdentity (avatar/name/verified)
 *  3. Sold state — "Sold to {name}" headline
 *  4. Final-price line shown only when it differs from the listing's asking price
 *  5. Final-price line hidden when finalPrice === listing.price
 *  6. "Message {name}" navigates to the conversation route when conversationId is present
 *  7. "Message {name}" falls back to listing-conversations when conversationId is null
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SaleBuyerCard } from "../SaleBuyerCard";
import type { Listing, ListingSale } from "@/api/listings";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  MessageCircle: () => null,
  UserCheck: () => null,
  BadgeCheck: () => null,
}));

// expo-router, useColors, useLocalization, react-i18next are mocked globally
// in src/__tests__/setup.ts. We spy on useRouter per-test to assert push args.

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 501,
    title: "Lenovo ThinkPad Laptop Core i5 8GB",
    description: "Great condition",
    price: 38000,
    currency: "AFN",
    status: "reserved",
    categoryId: 1,
    location: "Kandahar",
    address: null,
    latitude: null,
    longitude: null,
    thumbnailUrl: null,
    viewsCount: 12,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-01T10:00:00Z",
    seller: { id: 1, name: "Seller One", city: "Kandahar" },
    category: { id: 1, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "برقیات", slug: "electronics" },
    ...overrides,
  };
}

function buildSale(overrides: Partial<ListingSale> = {}): ListingSale {
  return {
    id: 9,
    status: "reserved",
    finalPrice: 38000,
    currency: "AFN",
    completedAt: null,
    buyer: { id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true },
    conversationId: 77,
    ...overrides,
  };
}

describe("SaleBuyerCard", () => {
  it("renders nothing when listing.sale is null", () => {
    const listing = buildListing({ sale: null });
    const { toJSON } = render(<SaleBuyerCard listing={listing} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when listing.sale is undefined", () => {
    const listing = buildListing();
    delete (listing as { sale?: ListingSale | null }).sale;
    const { toJSON } = render(<SaleBuyerCard listing={listing} />);
    expect(toJSON()).toBeNull();
  });

  it("shows 'Reserved for {name}' and the buyer via UserIdentity when reserved", () => {
    const listing = buildListing({ status: "reserved", sale: buildSale({ status: "reserved" }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.reservedFor")).toBeTruthy();
    // UserIdentity renders the buyer's name as its own text node
    expect(screen.getAllByText("Ahmad Karimi").length).toBeGreaterThan(0);
  });

  it("shows 'Sold to {name}' when sold", () => {
    const listing = buildListing({
      status: "sold",
      sale: buildSale({ status: "sold", completedAt: "2026-07-05T10:00:00Z" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.soldTo")).toBeTruthy();
    expect(screen.queryByText("listing.sale.reservedFor")).toBeNull();
  });

  it("hides the final-price line when finalPrice equals the listing price", () => {
    const listing = buildListing({ price: 38000, sale: buildSale({ finalPrice: 38000 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByText("listing.sale.finalPrice")).toBeNull();
  });

  it("shows the final-price line (label + PriceTag) when finalPrice differs from the listing price", () => {
    const listing = buildListing({ price: 38000, sale: buildSale({ finalPrice: 32000 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.finalPrice")).toBeTruthy();
    // PriceTag (mocked useLocalization.formatCurrency) renders "AFN 32000"
    expect(screen.getByText("AFN 32000")).toBeTruthy();
  });

  it("navigates to the buyer's conversation when conversationId is present", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const listing = buildListing({ sale: buildSale({ conversationId: 77 }) });
    render(<SaleBuyerCard listing={listing} />);

    fireEvent.press(screen.getByTestId("sale-buyer-message-button"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/77");
  });

  it("falls back to the listing-conversations screen when conversationId is null", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const listing = buildListing({ id: 501, title: "My Listing", sale: buildSale({ conversationId: null }) });
    render(<SaleBuyerCard listing={listing} />);

    fireEvent.press(screen.getByTestId("sale-buyer-message-button"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/listing-conversations/[id]",
      params: { id: "501", listingTitle: "My Listing" },
    });
  });

  it("falls back to displaying a placeholder name when buyer info is somehow missing", () => {
    const listing = buildListing({
      sale: buildSale({ buyer: { id: 0, name: "", avatarUrl: null, verified: false } }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.noBuyerRecorded")).toBeTruthy();
  });
});
