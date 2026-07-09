/**
 * PendingReviewsNudge unit tests (REV2 entry point b — "Rate your recent deals").
 *
 * Covers:
 *  - Renders nothing when there are no pending reviews (no false-positive nudge)
 *  - Renders one row per pending transaction, with the COUNTERPARTY (not the
 *    caller) shown — role "seller" → shows the buyer; role "buyer" → shows the seller
 *  - Tapping a row opens the ReviewPromptSheet for that transaction
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("lucide-react-native", () => ({
  Award: "Award",
  ChevronRight: "ChevronRight",
  X: "X",
  CheckCircle2: "CheckCircle2",
  Clock: "Clock",
  Star: "Star",
  Info: "Info",
}));

jest.mock("@/api/reviews", () => ({
  reviewsAPI: {
    getPendingReviews: jest.fn(),
    createReview: jest.fn(),
  },
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

import { PendingReviewsNudge } from "../PendingReviewsNudge";
import { reviewsAPI } from "@/api/reviews";

const mockReviewsAPI = reviewsAPI as jest.Mocked<typeof reviewsAPI>;

function renderNudge() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PendingReviewsNudge />
    </QueryClientProvider>
  );
}

const soldAsSeller = {
  id: 10,
  status: "sold" as const,
  finalPrice: 25000,
  currency: "AFN",
  completedAt: "2026-07-01T00:00:00Z",
  createdAt: "2026-06-30T00:00:00Z",
  role: "seller" as const,
  listing: { id: 5, title: "Lenovo ThinkPad", thumbnailUrl: null, price: 25000, currency: "AFN", status: "sold" },
  buyer: { id: 42, name: "Ahmad Karimi", avatarUrl: null },
  seller: { id: 1, name: "Jane Doe", avatarUrl: null },
};

const soldAsBuyer = {
  ...soldAsSeller,
  id: 11,
  role: "buyer" as const,
  buyer: { id: 1, name: "Jane Doe", avatarUrl: null },
  seller: { id: 99, name: "Omar Noori", avatarUrl: null },
};

const emptyPagination = { currentPage: 1, nextPage: null, prevPage: null, totalCount: 0, totalPages: 0 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PendingReviewsNudge — empty state", () => {
  it("renders nothing when there are no pending transactions", async () => {
    mockReviewsAPI.getPendingReviews.mockResolvedValue({ items: [], pagination: emptyPagination });
    const { toJSON } = renderNudge();
    await waitFor(() => expect(mockReviewsAPI.getPendingReviews).toHaveBeenCalled());
    expect(toJSON()).toBeNull();
  });
});

describe("PendingReviewsNudge — filled state", () => {
  it("shows the counterparty (buyer) when the caller's role was seller", async () => {
    mockReviewsAPI.getPendingReviews.mockResolvedValue({
      items: [soldAsSeller],
      pagination: { ...emptyPagination, totalCount: 1, totalPages: 1 },
    });
    renderNudge();

    await waitFor(() => expect(screen.getByTestId("pending-reviews-nudge")).toBeTruthy());
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
    expect(screen.queryByText("Jane Doe")).toBeNull();
  });

  it("shows the counterparty (seller) when the caller's role was buyer", async () => {
    mockReviewsAPI.getPendingReviews.mockResolvedValue({
      items: [soldAsBuyer],
      pagination: { ...emptyPagination, totalCount: 1, totalPages: 1 },
    });
    renderNudge();

    await waitFor(() => expect(screen.getByTestId("pending-reviews-nudge")).toBeTruthy());
    expect(screen.getByText("Omar Noori")).toBeTruthy();
  });

  it("renders one row per pending transaction", async () => {
    mockReviewsAPI.getPendingReviews.mockResolvedValue({
      items: [soldAsSeller, soldAsBuyer],
      pagination: { ...emptyPagination, totalCount: 2, totalPages: 1 },
    });
    renderNudge();

    await waitFor(() => expect(screen.getByTestId("pending-review-row-10")).toBeTruthy());
    expect(screen.getByTestId("pending-review-row-11")).toBeTruthy();
  });

  it("opens the ReviewPromptSheet for the tapped transaction", async () => {
    mockReviewsAPI.getPendingReviews.mockResolvedValue({
      items: [soldAsSeller],
      pagination: { ...emptyPagination, totalCount: 1, totalPages: 1 },
    });
    renderNudge();

    await waitFor(() => expect(screen.getByTestId("pending-review-row-10")).toBeTruthy());
    fireEvent.press(screen.getByTestId("pending-review-row-10"));

    // The sheet's star input is now present (form step of ReviewPromptSheet).
    await waitFor(() => expect(screen.getByTestId("star-rating-5")).toBeTruthy());
  });
});
