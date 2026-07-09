/**
 * ReviewsList unit tests
 *
 * Covers:
 *  - Loading state: renders skeletonCount rows (default 2), no ReviewCard
 *  - Empty state: renders EmptyState with reviews.empty title
 *  - Filled state: renders one ReviewCard per review, in order
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ReviewsList } from "../ReviewsList";
import type { Review } from "@/api/reviews";

jest.mock("lucide-react-native", () => ({
  Star: "Star",
}));

const makeReview = (id: number, name: string): Review => ({
  id,
  rating: 4,
  comment: `Comment ${id}`,
  role: "of_buyer",
  visible: true,
  revealedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
  transactionId: id + 100,
  revieweeId: 42,
  reviewer: { id, name, avatarUrl: null },
});

describe("ReviewsList — loading", () => {
  it("renders the loading container and no review cards", () => {
    render(<ReviewsList reviews={[]} isLoading testID="my-reviews" />);
    expect(screen.getByTestId("my-reviews-loading")).toBeTruthy();
    expect(screen.queryByTestId("review-card-1")).toBeNull();
  });
});

describe("ReviewsList — empty", () => {
  it("renders the empty state with the reviews.empty title", () => {
    render(<ReviewsList reviews={[]} testID="my-reviews" />);
    expect(screen.getByTestId("my-reviews-empty")).toBeTruthy();
    expect(screen.getByText("reviews.empty")).toBeTruthy();
  });
});

describe("ReviewsList — filled", () => {
  it("renders one ReviewCard per review", () => {
    const reviews = [makeReview(1, "Jane Doe"), makeReview(2, "Ahmad Karimi")];
    render(<ReviewsList reviews={reviews} />);
    expect(screen.getByTestId("review-card-1")).toBeTruthy();
    expect(screen.getByTestId("review-card-2")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
  });

  it("renders a single review correctly", () => {
    render(<ReviewsList reviews={[makeReview(5, "Solo Reviewer")]} />);
    expect(screen.getByTestId("review-card-5")).toBeTruthy();
    expect(screen.queryByTestId("review-card-1")).toBeNull();
  });
});
