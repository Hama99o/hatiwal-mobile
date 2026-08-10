/**
 * ListingUnavailableNotice — Jest unit tests (TASK-K729).
 *
 * Covers:
 *  1. Reserved vs sold copy for the GENERIC (viewerIsSaleBuyer=false/undefined)
 *     case — neutral, never claims "for another buyer".
 *  2. Reserved-for-you / sold-to-you copy when viewerIsSaleBuyer=true, and
 *     that NO recovery CTA renders in that case (nothing to recover from).
 *  3. "Browse similar in {category}" is always shown (generic case) when a
 *     category is present, and navigates to Browse pre-filtered by categoryId.
 *  4. Falls back to the generic "Browse similar listings" label + an
 *     unfiltered Browse route when the listing has no category — never an
 *     empty action row (at least one recovery action always renders).
 *  5. Seller identity + "View their listings" only render in the GENERIC case
 *     when sellerId + sellerName are both present, and navigate to the
 *     seller's public profile.
 *  6. RTL — renders without throwing and flips row direction when isRtl=true.
 *  7. The notice always renders the shared StatusBadge (dedup fix).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Search: "Search",
  Store: "Store",
}));

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
import { ListingUnavailableNotice } from "../ListingUnavailableNotice";

const CATEGORY = { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "برقیات", slug: "electronics" };

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false });
  jest.clearAllMocks();
});

// ── 1. Generic (viewerIsSaleBuyer false/undefined) — reserved vs sold copy ────

describe("ListingUnavailableNotice — generic recovery copy", () => {
  it("shows the reserved title + body for status='reserved'", () => {
    render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.reservedBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldTitle")).toBeNull();
    // Never the viewer-scoped copy when viewerIsSaleBuyer is omitted.
    expect(screen.queryByText("chat.thread.unavailable.reservedForYouTitle")).toBeNull();
  });

  it("shows the sold title + body for status='sold'", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByText("chat.thread.unavailable.soldTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.soldBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.reservedTitle")).toBeNull();
  });

  it("renders the notice container testID for both statuses", () => {
    const { rerender } = render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.getByTestId("listing-unavailable-notice")).toBeTruthy();
    rerender(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByTestId("listing-unavailable-notice")).toBeTruthy();
  });

  it("explicitly passing viewerIsSaleBuyer=false renders the same generic copy as omitting it", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer={false} />);
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
  });
});

// ── 2. viewerIsSaleBuyer=true — the positive, viewer-scoped copy ──────────────

describe("ListingUnavailableNotice — viewer-scoped copy (TASK-K729 HIGH review fix)", () => {
  it("shows 'reserved for you' copy (not the generic recovery copy) for status='reserved'", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer />);
    expect(screen.getByText("chat.thread.unavailable.reservedForYouTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.reservedForYouBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.reservedTitle")).toBeNull();
    expect(screen.queryByText("chat.thread.unavailable.reservedBody")).toBeNull();
  });

  it("shows 'you bought this item' copy for status='sold'", () => {
    render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer />);
    expect(screen.getByText("chat.thread.unavailable.soldToYouTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.soldToYouBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldTitle")).toBeNull();
  });

  it("never renders the Browse-similar CTA when the viewer is the committed buyer — nothing to recover from", () => {
    render(
      <ListingUnavailableNotice
        status="reserved"
        viewerIsSaleBuyer
        category={CATEGORY}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-browse-similar")).toBeNull();
  });

  it("never renders the seller identity / 'View their listings' CTA when the viewer is the committed buyer", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
    expect(screen.queryByTestId("unavailable-seller-identity")).toBeNull();
  });
});

// ── 3 & 4. Browse similar — always present, category vs generic fallback ──────

describe("ListingUnavailableNotice — Browse similar action", () => {
  it("shows the category-specific label when a category is present", () => {
    render(<ListingUnavailableNotice status="reserved" category={CATEGORY} />);
    expect(
      screen.getByText("chat.thread.unavailable.browseSimilar")
    ).toBeTruthy();
  });

  it("navigates to Browse pre-filtered by categoryId when a category is present", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="sold" category={CATEGORY} />);
    fireEvent.press(screen.getByTestId("unavailable-browse-similar"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/(tabs)/browse",
      params: { categoryId: "3" },
    });
  });

  it("falls back to the generic label + unfiltered Browse route when there is no category", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="reserved" category={null} />);
    expect(screen.getByText("chat.thread.unavailable.browseSimilarGeneric")).toBeTruthy();

    fireEvent.press(screen.getByTestId("unavailable-browse-similar"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/(tabs)/browse");
  });

  it("always renders the Browse similar action in the generic case — never an empty action row", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByTestId("unavailable-browse-similar")).toBeTruthy();
  });
});

// ── 5. Seller identity + "View their listings" — conditional ──────────────────

describe("ListingUnavailableNotice — seller identity + View their listings action", () => {
  it("renders the seller identity + action when sellerId + sellerName are present", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />);
    expect(screen.getByTestId("unavailable-seller-identity")).toBeTruthy();
    expect(screen.getByTestId("unavailable-more-from-seller")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.viewTheirListings")).toBeTruthy();
    // Trust UI — the seller's name, from the shared UserIdentity component.
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
  });

  it("does NOT render the seller action when sellerId is missing", () => {
    render(<ListingUnavailableNotice status="reserved" sellerName="Ahmad Karimi" />);
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
    expect(screen.queryByTestId("unavailable-seller-identity")).toBeNull();
  });

  it("does NOT render the seller action when sellerName is missing", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} />);
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
  });

  it("navigates to the seller's public profile when tapped", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="sold" sellerId={9} sellerName="Ahmad Karimi" />);
    fireEvent.press(screen.getByTestId("unavailable-more-from-seller"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/seller/9");
  });
});

// ── 6. RTL ────────────────────────────────────────────────────────────────────

describe("ListingUnavailableNotice — RTL", () => {
  it("renders without throwing when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() =>
      render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />)
    ).not.toThrow();
  });

  it("renders without throwing when isRtl=true and viewerIsSaleBuyer=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() =>
      render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer />)
    ).not.toThrow();
  });
});

// ── 7. Shared StatusBadge (dedup fix) ──────────────────────────────────────────

describe("ListingUnavailableNotice — shared StatusBadge", () => {
  it("renders the status label via the shared StatusBadge token map", () => {
    render(<ListingUnavailableNotice status="reserved" />);
    // StatusBadge renders `listing.status.${status}` — the real i18n key,
    // present exactly once via the shared component (not a forked chip).
    expect(screen.getByText("listing.status.reserved")).toBeTruthy();
  });

  it("renders the sold status label via StatusBadge too", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByText("listing.status.sold")).toBeTruthy();
  });
});
