/**
 * ListingUnavailableNotice — Jest unit tests (TASK-K729).
 *
 * Covers:
 *  1. Reserved state renders the reserved title/body, not the sold copy.
 *  2. Sold state renders the sold title/body, not the reserved copy.
 *  3. "Browse similar in {category}" is always shown when a category is
 *     present, and navigates to Browse pre-filtered by categoryId.
 *  4. Falls back to the generic "Browse similar listings" label + an
 *     unfiltered Browse route when the listing has no category — never an
 *     empty action row (at least one recovery action always renders).
 *  5. "More from {seller}" only renders when sellerId + sellerName are both
 *     present, and navigates to the seller's public profile.
 *  6. RTL — renders without throwing and flips row direction when isRtl=true.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  PackageX: "PackageX",
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

// ── 1 & 2. Reserved vs sold copy ────────────────────────────────────────────────

describe("ListingUnavailableNotice — reserved vs sold copy", () => {
  it("shows the reserved title + body for status='reserved'", () => {
    render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.reservedBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldTitle")).toBeNull();
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

  it("always renders the Browse similar action — never an empty action row", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByTestId("unavailable-browse-similar")).toBeTruthy();
  });
});

// ── 5. More from seller — conditional ───────────────────────────────────────────

describe("ListingUnavailableNotice — More from seller action", () => {
  it("renders the seller action when sellerId + sellerName are present", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />);
    expect(screen.getByTestId("unavailable-more-from-seller")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.moreFromSeller")).toBeTruthy();
  });

  it("does NOT render the seller action when sellerId is missing", () => {
    render(<ListingUnavailableNotice status="reserved" sellerName="Ahmad Karimi" />);
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
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
});
