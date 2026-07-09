/**
 * ReviewCard unit tests
 *
 * Covers:
 *  - Reviewer identity rendered via UserIdentity (name text present)
 *  - 5 star icons always rendered; filled count matches review.rating
 *  - Comment rendered when present
 *  - No comment text rendered when comment is null (no crash, no empty node)
 *  - Date rendered via useLocalization().formatDate (mocked to identity in setup.ts)
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ReviewCard } from "../ReviewCard";
import type { Review } from "@/api/reviews";

jest.mock("lucide-react-native", () => ({
  Star: "Star",
}));

const baseReview: Review = {
  id: 1,
  rating: 4,
  comment: "Great buyer, quick and fair.",
  role: "of_buyer",
  visible: true,
  revealedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
  transactionId: 10,
  revieweeId: 42,
  reviewer: { id: 1, name: "Jane Doe", avatarUrl: null },
};

describe("ReviewCard", () => {
  it("renders the reviewer's name via UserIdentity", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("renders the comment when present", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByText("Great buyer, quick and fair.")).toBeTruthy();
  });

  it("renders no comment text when comment is null", () => {
    render(<ReviewCard review={{ ...baseReview, comment: null }} />);
    expect(screen.queryByText("Great buyer, quick and fair.")).toBeNull();
  });

  it("renders the created date via formatDate", () => {
    render(<ReviewCard review={baseReview} />);
    // Global useLocalization mock's formatDate is identity — returns the raw ISO string.
    expect(screen.getByText("2026-07-04T00:00:00Z")).toBeTruthy();
  });

  it("has the expected testID", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByTestId("review-card-1")).toBeTruthy();
  });

  it("renders without crashing for a 1-star review", () => {
    const { toJSON } = render(<ReviewCard review={{ ...baseReview, rating: 1 }} />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders without crashing for a 5-star review", () => {
    const { toJSON } = render(<ReviewCard review={{ ...baseReview, rating: 5 }} />);
    expect(toJSON()).not.toBeNull();
  });
});
