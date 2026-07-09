/**
 * REV2 — Ratings & Reviews (double-blind).
 *
 * A Review hangs off a SOLD Transaction. It is created HIDDEN (`visible: false`)
 * and only becomes visible once BOTH parties have submitted (or 14 days pass —
 * a daily backend sweep reveals the lone review). While hidden, only its own
 * author can see it; the public/index endpoint only ever returns visible rows.
 *
 * Endpoints (REV1 backend — already shipped, see hatiwal-api):
 *   POST  /api/v1/transactions/:transaction_id/reviews   — leave a review
 *   GET   /api/v1/users/:user_id/reviews?role=...        — a user's VISIBLE reviews
 *   PATCH /api/v1/reviews/:id                            — edit your own review while hidden
 *   GET   /api/v1/my/reviews/pending                      — sold sales the caller still owes a review on
 */
import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";
import type { Transaction } from "./transactions";

/** What the REVIEWEE was in the sale (the reviewer is always the other side). */
export type ReviewRole = "of_seller" | "of_buyer";

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  role: ReviewRole;
  /**
   * False while the review is hidden (double-blind) — the caller only ever
   * sees this as `false` on their OWN just-submitted review before reveal;
   * the public index never returns hidden rows at all.
   */
  visible: boolean;
  revealedAt: string | null;
  createdAt: string;
  transactionId: number;
  revieweeId: number;
  reviewer: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
}

export interface ReviewsResponse {
  items: Review[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export interface PendingReviewsResponse {
  items: Transaction[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export const reviewsAPI = {
  /** A user's VISIBLE reviews. `role` optionally filters "as seller" vs "as buyer". */
  getUserReviews: async (
    userId: number,
    params?: { role?: ReviewRole; pageNumber?: number; pageSize?: number }
  ): Promise<ReviewsResponse> => {
    const query = new URLSearchParams();
    if (params?.role) query.append("role", params.role);
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize) query.append("page[size]", String(params.pageSize));

    const response = await http.get(`/users/${userId}/reviews?${query}`);
    return {
      items: (response.data.reviews ?? []).map(
        (r: Record<string, unknown>) => convertKeysToCamel(r) as Review
      ),
      pagination: convertKeysToCamel(response.data.meta.pagination) as ReviewsResponse["pagination"],
    };
  },

  /** Leave a review on a sold transaction. 403 if not a party / not sold; 422 on duplicate or bad rating. */
  createReview: async (
    transactionId: number,
    data: { rating: number; comment?: string }
  ): Promise<Review> => {
    const response = await http.post(`/transactions/${transactionId}/reviews`, {
      review: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.review) as Review;
  },

  /** Edit your own review — only while it is still hidden (403 once revealed). */
  updateReview: async (
    id: number,
    data: { rating?: number; comment?: string }
  ): Promise<Review> => {
    const response = await http.patch(`/reviews/${id}`, {
      review: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.review) as Review;
  },

  /** Sold transactions the caller hasn't reviewed yet — drives the "rate your recent deals" prompt. */
  getPendingReviews: async (params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PendingReviewsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize) query.append("page[size]", String(params.pageSize));

    const response = await http.get(`/my/reviews/pending?${query}`);
    return {
      items: (response.data.transactions ?? []).map(
        (t: Record<string, unknown>) => convertKeysToCamel(t) as Transaction
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as PendingReviewsResponse["pagination"],
    };
  },
};
