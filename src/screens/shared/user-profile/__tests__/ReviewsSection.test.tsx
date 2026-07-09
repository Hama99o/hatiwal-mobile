/**
 * ReviewsSection unit tests.
 *
 * Covers:
 *  - Renders the section title
 *  - Renders reviews returned from reviewsAPI.getUserReviews
 *  - Shows "View all reviews" only when totalCount exceeds the preview count
 *  - Hides "View all reviews" when everything already fits in the preview
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("lucide-react-native", () => ({
  Star: "Star",
}));

jest.mock("@/api/reviews", () => ({
  reviewsAPI: { getUserReviews: jest.fn() },
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

import { ReviewsSection } from "../ReviewsSection";
import { reviewsAPI } from "@/api/reviews";

const mockReviewsAPI = reviewsAPI as jest.Mocked<typeof reviewsAPI>;

function renderSection(onViewAll = jest.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ReviewsSection userId={1} onViewAll={onViewAll} />
    </QueryClientProvider>
  );
  return { onViewAll };
}

const review = {
  id: 1,
  rating: 5,
  comment: "Great!",
  role: "of_buyer" as const,
  visible: true,
  revealedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
  transactionId: 10,
  revieweeId: 1,
  reviewer: { id: 2, name: "Jane Doe", avatarUrl: null },
};

beforeEach(() => jest.clearAllMocks());

describe("ReviewsSection", () => {
  it("renders the section title", async () => {
    mockReviewsAPI.getUserReviews.mockResolvedValue({
      items: [],
      pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 0, totalPages: 0 },
    });
    renderSection();
    expect(screen.getByText("reviews.sectionTitle")).toBeTruthy();
  });

  it("renders reviews from the API", async () => {
    mockReviewsAPI.getUserReviews.mockResolvedValue({
      items: [review],
      pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 1, totalPages: 1 },
    });
    renderSection();
    await waitFor(() => expect(screen.getByTestId("review-card-1")).toBeTruthy());
  });

  it("shows 'View all reviews' when totalCount exceeds the preview", async () => {
    mockReviewsAPI.getUserReviews.mockResolvedValue({
      items: [review],
      pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 10, totalPages: 4 },
    });
    const { onViewAll } = renderSection();
    await waitFor(() => expect(screen.getByTestId("reviews-section-view-all")).toBeTruthy());
    fireEvent.press(screen.getByTestId("reviews-section-view-all"));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it("hides 'View all reviews' when everything already fits in the preview", async () => {
    mockReviewsAPI.getUserReviews.mockResolvedValue({
      items: [review],
      pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 1, totalPages: 1 },
    });
    renderSection();
    await waitFor(() => expect(screen.getByTestId("review-card-1")).toBeTruthy());
    expect(screen.queryByTestId("reviews-section-view-all")).toBeNull();
  });
});
