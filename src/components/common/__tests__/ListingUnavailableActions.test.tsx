/**
 * ListingUnavailableActions — Jest unit tests (TASK-N317).
 *
 * Covers:
 *   1. Keeps the existing localized sold/reserved notice sentence; reserved
 *      additionally shows the "may free up" line, sold does not.
 *   2. Three-step degrade: band (similar stock inside it) → category-only
 *      (stock exists, none inside the band) → no category CTA at all (the
 *      `similar` rail is empty) with the seller CTA promoted to primary.
 *   3. Null guards: no category → seller-only; no seller → category-only;
 *      neither → no button row at all (never throws, never an empty row).
 *   4. Navigation: "See similar" pushes Browse with categoryId (+ band when
 *      present); "More from seller" pushes the seller's public profile.
 *   5. RTL — renders without throwing when isRtl=true.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

// useCategoryName is a thin wrapper around localizedCategoryName — stub it to
// avoid pulling in @/api/categories (and its http/axios import chain) here.
jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: { nameEn: string }) => cat.nameEn,
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// Import AFTER mocks
import { ListingUnavailableActions } from "../ListingUnavailableActions";

const CATEGORY = { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "برقیات", slug: "electronics" };

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false });
  jest.clearAllMocks();
});

// ── 1. Status sentence + "may free up" line ──────────────────────────────────

describe("ListingUnavailableActions — status sentence", () => {
  it("shows the sold notice for status='sold' and never the may-free-up line", () => {
    render(<ListingUnavailableActions status="sold" similarPrices={[]} />);
    expect(screen.getByText("listing.detail.soldNotice")).toBeTruthy();
    expect(screen.queryByText("listing.detail.reservedMayFreeUp")).toBeNull();
    expect(screen.queryByTestId("unavailable-reserved-may-free-up")).toBeNull();
  });

  it("shows the reserved notice AND the may-free-up line for status='reserved'", () => {
    render(<ListingUnavailableActions status="reserved" similarPrices={[]} />);
    expect(screen.getByText("listing.detail.reservedNotice")).toBeTruthy();
    expect(screen.getByText("listing.detail.reservedMayFreeUp")).toBeTruthy();
    expect(screen.getByTestId("unavailable-reserved-may-free-up")).toBeTruthy();
  });

  it("renders the container testID for both statuses", () => {
    const { rerender } = render(<ListingUnavailableActions status="sold" similarPrices={[]} />);
    expect(screen.getByTestId("listing-unavailable-actions")).toBeTruthy();
    rerender(<ListingUnavailableActions status="reserved" similarPrices={[]} />);
    expect(screen.getByTestId("listing-unavailable-actions")).toBeTruthy();
  });
});

// ── 2. Three-step degrade ─────────────────────────────────────────────────────

describe("ListingUnavailableActions — three-step degrade", () => {
  it("step 1: shows 'See similar in {category}' WITH a price band when similar stock falls inside it", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({ push: mockPush });

    render(
      <ListingUnavailableActions
        status="sold"
        category={CATEGORY}
        price={70000}
        currency="AFN"
        similarPrices={[90000]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.getByText("listing.detail.seeSimilarIn")).toBeTruthy();

    fireEvent.press(screen.getByTestId("unavailable-see-similar"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/(tabs)/browse",
      params: { categoryId: "3", priceMin: "49000", priceMax: "91000" },
    });
  });

  it("step 2: shows 'See similar in {category}' WITHOUT a band when stock exists but none falls inside it", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({ push: mockPush });

    render(
      <ListingUnavailableActions
        status="sold"
        category={CATEGORY}
        price={8000}
        currency="AFN"
        similarPrices={[1200]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    fireEvent.press(screen.getByTestId("unavailable-see-similar"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/(tabs)/browse",
      params: { categoryId: "3" },
    });
  });

  it("step 2: also drops the band for a non-AFN price even when stock is inside the numeric range", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({ push: mockPush });

    render(
      <ListingUnavailableActions
        status="sold"
        category={CATEGORY}
        price={900}
        currency="USD"
        similarPrices={[900]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    fireEvent.press(screen.getByTestId("unavailable-see-similar"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/(tabs)/browse",
      params: { categoryId: "3" },
    });
  });

  it("step 3: omits the category CTA entirely when the similar rail is empty, and promotes the seller CTA to primary", () => {
    render(
      <ListingUnavailableActions
        status="sold"
        category={CATEGORY}
        price={70000}
        currency="AFN"
        similarPrices={[]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-see-similar")).toBeNull();
    const sellerButton = screen.getByTestId("unavailable-more-from-seller");
    expect(sellerButton).toBeTruthy();
    // Promoted to primary weight — primaryForeground text color, not muted.
    const label = screen.getByText("listing.detail.moreFromSellerNamed");
    const flatStyle = StyleSheet.flatten(label.props.style) as Record<string, unknown>;
    expect(flatStyle.color).toBe("hsl(0,0%,100%)");
  });
});

// ── 3. Null guards ────────────────────────────────────────────────────────────

describe("ListingUnavailableActions — null guards", () => {
  it("omits the category CTA when category is null — seller CTA only", () => {
    render(
      <ListingUnavailableActions
        status="reserved"
        category={null}
        similarPrices={[]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-see-similar")).toBeNull();
    expect(screen.getByTestId("unavailable-more-from-seller")).toBeTruthy();
  });

  it("omits the seller CTA when sellerId is null — category CTA only", () => {
    render(
      <ListingUnavailableActions
        status="reserved"
        category={CATEGORY}
        price={70000}
        currency="AFN"
        similarPrices={[90000]}
        sellerId={null}
      />
    );
    expect(screen.getByTestId("unavailable-see-similar")).toBeTruthy();
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
  });

  it("renders neither CTA — never throws, never an empty button row — when both are absent", () => {
    expect(() =>
      render(<ListingUnavailableActions status="sold" category={null} similarPrices={[]} sellerId={null} />)
    ).not.toThrow();
    expect(screen.queryByTestId("unavailable-see-similar")).toBeNull();
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
    // The status sentence is still there.
    expect(screen.getByText("listing.detail.soldNotice")).toBeTruthy();
  });
});

// ── 4. Navigation ─────────────────────────────────────────────────────────────

describe("ListingUnavailableActions — navigation", () => {
  it("navigates to the seller's public profile when 'More from seller' is tapped", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({ push: mockPush });

    render(
      <ListingUnavailableActions
        status="sold"
        category={null}
        similarPrices={[]}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    fireEvent.press(screen.getByTestId("unavailable-more-from-seller"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/seller/9");
  });

  it("falls back to the generic 'More from this Seller' label when sellerName is missing", () => {
    render(
      <ListingUnavailableActions status="sold" category={null} similarPrices={[]} sellerId={9} sellerName={null} />
    );
    expect(screen.getByText("listing.detail.moreFromSeller")).toBeTruthy();
    expect(screen.queryByText("listing.detail.moreFromSellerNamed")).toBeNull();
  });
});

// ── 5. RTL ────────────────────────────────────────────────────────────────────

describe("ListingUnavailableActions — RTL", () => {
  it("renders without throwing when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() =>
      render(
        <ListingUnavailableActions
          status="reserved"
          category={CATEGORY}
          price={70000}
          currency="AFN"
          similarPrices={[90000]}
          sellerId={9}
          sellerName="Ahmad Karimi"
        />
      )
    ).not.toThrow();
  });
});
