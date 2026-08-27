/**
 * SaleBuyerCard — Jest unit tests (TASK-R418).
 *
 * Covers:
 *  1. Renders nothing when listing.sale is null/undefined
 *  2. Reserved state — "Reserved for {name}" headline + UserIdentity (avatar/name/verified)
 *  3. Sold state — "Sold to {name}" headline
 *  4. Final-price line shown only when it differs from the listing's asking price
 *  5. Final-price line hidden when finalPrice === listing.price
 *  6. Message control navigates to the conversation route when conversationId is present
 *  7. Message control falls back to listing-conversations (relabeled) when conversationId is null
 *  8. CYCLE-4: UserIdentity's onPress lands on the buyer's profile
 *  9. CYCLE-4: completedAt renders as "Sold on {date}" for a sold sale
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

  // ── CYCLE-4 design-review fixes ─────────────────────────────────────────────

  it("navigates to the buyer's profile when the collapsed UserIdentity row is tapped", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const listing = buildListing({ sale: buildSale({ buyer: { id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true } }) });
    render(<SaleBuyerCard listing={listing} />);

    fireEvent.press(screen.getByTestId("sale-buyer-identity"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/seller/42");
  });

  it("does not attach a profile onPress when the buyer is missing entirely", () => {
    const listing = buildListing({
      sale: buildSale({ buyer: undefined as unknown as ListingSale["buyer"] }),
    });
    render(<SaleBuyerCard listing={listing} />);
    // Non-pressable UserIdentity renders without a testID on the Pressable
    // wrapper (see UserIdentity.tsx) — asserting the root testID still
    // resolves confirms the row renders without a profile-nav crash.
    expect(screen.queryByTestId("sale-buyer-card")).toBeTruthy();
  });

  it("renders 'Sold on {date}' for a sold sale with completedAt", () => {
    const listing = buildListing({
      status: "sold",
      sale: buildSale({ status: "sold", completedAt: "2026-07-05T10:00:00Z" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.soldOn")).toBeTruthy();
  });

  it("does not render a sold-on date for a reserved sale", () => {
    const listing = buildListing({ status: "reserved", sale: buildSale({ status: "reserved" }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByText("listing.sale.soldOn")).toBeNull();
  });

  it("relabels the Message control to 'View Conversations' when there is no direct conversation", () => {
    const listing = buildListing({ sale: buildSale({ conversationId: null }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.ownerDetail.viewConversations")).toBeTruthy();
    expect(screen.queryByText("common.message")).toBeNull();
  });

  it("shows the compact 'Message' label when a direct conversation exists", () => {
    const listing = buildListing({ sale: buildSale({ conversationId: 77 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("common.message")).toBeTruthy();
  });
});

// ── Units sold — docs/SPIKE_LISTING_QUANTITY.md §0b ───────────────────────────
//
// The seller's "who bought how much" answer at the single-listing level. Gated
// on the LISTING being multi-unit, not on the quantity being > 1: on a 15-bag
// listing "1 unit" is meaningful, on a single-item listing it is noise.

describe("SaleBuyerCard — units sold", () => {
  it("shows how many units the buyer took on a multi-unit listing", () => {
    const listing = buildListing({ multiUnit: true, sale: buildSale({ quantity: 3 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.unitsSold")).toBeTruthy();
    expect(screen.getByText("listing.stock.unitsCount")).toBeTruthy();
  });

  it("shows it even for a single unit of a batch — '1 of 15' is what the seller needs", () => {
    const listing = buildListing({ multiUnit: true, sale: buildSale({ quantity: 1 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByText("listing.sale.unitsSold")).toBeTruthy();
  });

  it("shows nothing on a single-item listing — the majority case is untouched", () => {
    const listing = buildListing({ multiUnit: false, sale: buildSale({ quantity: 1 }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByText("listing.sale.unitsSold")).toBeNull();
  });

  it("shows nothing when the payload predates the column", () => {
    const sale = buildSale();
    delete (sale as { quantity?: number }).quantity;
    const listing = buildListing({ multiUnit: true, sale });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByText("listing.sale.unitsSold")).toBeNull();
  });
});

// ── SF-M5 (docs/SELL_FLOW_REDESIGN.md §9) — "+N more · View all sales" link ──
//
// This card only ever shows the LATEST sale (`sale`) — once a listing has
// more than one, `salesCount` is the cheap signal that a seller who only
// glances at this card would otherwise never learn a second buyer exists.

describe("SaleBuyerCard — '+N more · View all sales' link (SF-M5)", () => {
  it("shows the link when salesCount > 1 on a sold listing", () => {
    const listing = buildListing({
      status: "sold",
      salesCount: 3,
      sale: buildSale({ status: "sold" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.getByTestId("sale-buyer-more-sales-link")).toBeTruthy();
    expect(screen.getByText("listing.sale.moreBuyers")).toBeTruthy();
  });

  it("hides the link when salesCount is 1 (the common case — one buyer)", () => {
    const listing = buildListing({
      status: "sold",
      salesCount: 1,
      sale: buildSale({ status: "sold" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByTestId("sale-buyer-more-sales-link")).toBeNull();
  });

  it("hides the link when salesCount is absent (payload predates the field)", () => {
    const listing = buildListing({ status: "sold", sale: buildSale({ status: "sold" }) });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByTestId("sale-buyer-more-sales-link")).toBeNull();
  });

  it("hides the link for a still-open hold, even if salesCount > 1 from an earlier sold-out cycle", () => {
    const listing = buildListing({
      status: "reserved",
      salesCount: 2,
      sale: buildSale({ status: "reserved" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    expect(screen.queryByTestId("sale-buyer-more-sales-link")).toBeNull();
  });

  it("navigates to the per-listing Sales screen when tapped", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    const listing = buildListing({
      id: 501,
      status: "sold",
      salesCount: 3,
      sale: buildSale({ status: "sold" }),
    });
    render(<SaleBuyerCard listing={listing} />);

    fireEvent.press(screen.getByTestId("sale-buyer-more-sales-link"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/listing/501/sales");
  });
});
