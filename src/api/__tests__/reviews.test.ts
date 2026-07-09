import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { reviewsAPI } from "../reviews";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

const BASE = "http://localhost:3007/api/v1";

const MOCK_REVIEW_SNAKE = {
  id: 1,
  rating: 5,
  comment: "Great buyer, quick and fair.",
  role: "of_buyer",
  visible: true,
  revealed_at: "2026-07-05T00:00:00Z",
  created_at: "2026-07-04T00:00:00Z",
  transaction_id: 10,
  reviewee_id: 42,
  reviewer: { id: 1, name: "Jane Doe", avatar_url: null },
};

const MOCK_PENDING_TRANSACTION_SNAKE = {
  id: 10,
  status: "sold",
  final_price: 12345,
  currency: "AFN",
  completed_at: "2026-07-02T00:00:00Z",
  created_at: "2026-07-01T00:00:00Z",
  role: "seller",
  listing: { id: 5, title: "Lenovo ThinkPad", thumbnail_url: null, price: 25000, currency: "AFN", status: "sold" },
  buyer: { id: 42, name: "Ahmad Karimi", avatar_url: null },
  seller: { id: 1, name: "Jane Doe", avatar_url: null },
};

const paginationSnake = (overrides = {}) => ({
  current_page: 1,
  next_page: null,
  prev_page: null,
  total_count: 1,
  total_pages: 1,
  ...overrides,
});

describe("reviewsAPI.getUserReviews", () => {
  it("returns camelCased items and pagination", async () => {
    server.use(
      http.get(`${BASE}/users/42/reviews`, () =>
        HttpResponse.json({ reviews: [MOCK_REVIEW_SNAKE], meta: { pagination: paginationSnake() } })
      )
    );

    const result = await reviewsAPI.getUserReviews(42);

    expect(result.items).toHaveLength(1);
    const review = result.items[0];
    expect(review.id).toBe(1);
    expect(review.rating).toBe(5);
    expect(review.role).toBe("of_buyer");
    expect(review.visible).toBe(true);
    expect(review.revealedAt).toBe("2026-07-05T00:00:00Z");
    expect(review.transactionId).toBe(10);
    expect(review.revieweeId).toBe(42);
    expect(review.reviewer.name).toBe("Jane Doe");
    expect(result.pagination.totalCount).toBe(1);
  });

  it("passes the ?role= filter and pagination params as query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE}/users/42/reviews`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ reviews: [], meta: { pagination: paginationSnake({ total_count: 0, total_pages: 0 }) } });
      })
    );

    await reviewsAPI.getUserReviews(42, { role: "of_seller", pageNumber: 2, pageSize: 10 });

    expect(capturedUrl).toContain("role=of_seller");
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(capturedUrl).toContain("page%5Bsize%5D=10");
  });

  it("returns an empty list when the user has no visible reviews", async () => {
    server.use(
      http.get(`${BASE}/users/42/reviews`, () =>
        HttpResponse.json({ reviews: [], meta: { pagination: paginationSnake({ total_count: 0, total_pages: 0 }) } })
      )
    );

    const result = await reviewsAPI.getUserReviews(42);
    expect(result.items).toEqual([]);
    expect(result.pagination.totalCount).toBe(0);
  });
});

describe("reviewsAPI.createReview", () => {
  it("posts snake_cased body under `review` and returns the camelCased review", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post(`${BASE}/transactions/10/reviews`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ review: { ...MOCK_REVIEW_SNAKE, visible: false, revealed_at: null } }, { status: 201 });
      })
    );

    const result = await reviewsAPI.createReview(10, { rating: 5, comment: "Great buyer, quick and fair." });

    expect(capturedBody).toEqual({
      review: { rating: 5, comment: "Great buyer, quick and fair." },
    });
    expect(result.id).toBe(1);
    // Double-blind: hidden until both parties submit / 14-day deadline.
    expect(result.visible).toBe(false);
    expect(result.revealedAt).toBeNull();
  });

  it("returns visible:true when this submit was the second (immediate reveal)", async () => {
    server.use(
      http.post(`${BASE}/transactions/10/reviews`, () =>
        HttpResponse.json({ review: { ...MOCK_REVIEW_SNAKE, visible: true } }, { status: 201 })
      )
    );

    const result = await reviewsAPI.createReview(10, { rating: 5 });
    expect(result.visible).toBe(true);
  });

  it("throws on 422 (duplicate review or bad rating)", async () => {
    server.use(
      http.post(`${BASE}/transactions/10/reviews`, () =>
        HttpResponse.json({ errors: ["You have already reviewed this sale"] }, { status: 422 })
      )
    );

    await expect(reviewsAPI.createReview(10, { rating: 5 })).rejects.toThrow();
  });

  it("throws on 403 (caller not a party / sale not sold)", async () => {
    server.use(
      http.post(`${BASE}/transactions/10/reviews`, () => HttpResponse.json({}, { status: 403 }))
    );

    await expect(reviewsAPI.createReview(10, { rating: 5 })).rejects.toThrow();
  });
});

describe("reviewsAPI.updateReview", () => {
  it("patches snake_cased body under `review` and returns the camelCased review", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(`${BASE}/reviews/1`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ review: { ...MOCK_REVIEW_SNAKE, rating: 4, comment: "Updated" } });
      })
    );

    const result = await reviewsAPI.updateReview(1, { rating: 4, comment: "Updated" });

    expect(capturedBody).toEqual({ review: { rating: 4, comment: "Updated" } });
    expect(result.rating).toBe(4);
    expect(result.comment).toBe("Updated");
  });

  it("throws on 403 once the review has been revealed (locked)", async () => {
    server.use(http.patch(`${BASE}/reviews/1`, () => HttpResponse.json({}, { status: 403 })));

    await expect(reviewsAPI.updateReview(1, { rating: 3 })).rejects.toThrow();
  });
});

describe("reviewsAPI.getPendingReviews", () => {
  it("returns camelCased pending transactions and pagination", async () => {
    server.use(
      http.get(`${BASE}/my/reviews/pending`, () =>
        HttpResponse.json({ transactions: [MOCK_PENDING_TRANSACTION_SNAKE], meta: { pagination: paginationSnake() } })
      )
    );

    const result = await reviewsAPI.getPendingReviews();

    expect(result.items).toHaveLength(1);
    const txn = result.items[0];
    expect(txn.id).toBe(10);
    expect(txn.role).toBe("seller");
    expect(txn.buyer.name).toBe("Ahmad Karimi");
    expect(txn.listing?.title).toBe("Lenovo ThinkPad");
    expect(result.pagination.totalCount).toBe(1);
  });

  it("returns an empty list when there are no pending reviews", async () => {
    server.use(
      http.get(`${BASE}/my/reviews/pending`, () =>
        HttpResponse.json({ transactions: [], meta: { pagination: paginationSnake({ total_count: 0, total_pages: 0 }) } })
      )
    );

    const result = await reviewsAPI.getPendingReviews();
    expect(result.items).toEqual([]);
    expect(result.pagination.totalCount).toBe(0);
  });

  it("passes pagination params as query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE}/my/reviews/pending`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ transactions: [], meta: { pagination: paginationSnake({ total_count: 0, total_pages: 0 }) } });
      })
    );

    await reviewsAPI.getPendingReviews({ pageNumber: 2, pageSize: 5 });

    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(capturedUrl).toContain("page%5Bsize%5D=5");
  });
});
