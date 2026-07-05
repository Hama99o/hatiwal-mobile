import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { transactionsAPI } from "../transactions";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

const BASE = "http://localhost:3007/api/v1";

const MOCK_TRANSACTION_SNAKE = {
  id: 1,
  status: "sold",
  final_price: 12345,
  currency: "AFN",
  completed_at: "2026-07-02T00:00:00Z",
  created_at: "2026-07-01T00:00:00Z",
  role: "seller",
  listing: { id: 10, title: "Lenovo ThinkPad", thumbnail_url: null, price: 25000, currency: "AFN", status: "sold" },
  buyer: { id: 42, name: "Ahmad Karimi", avatar_url: null },
  seller: { id: 1, name: "Jane Doe", avatar_url: null },
};

describe("transactionsAPI.getMyTransactions", () => {
  it("returns camelCased items and pagination", async () => {
    server.use(
      http.get(`${BASE}/my/transactions`, () =>
        HttpResponse.json({
          transactions: [MOCK_TRANSACTION_SNAKE],
          meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 1, total_pages: 1 } },
        })
      )
    );

    const result = await transactionsAPI.getMyTransactions();

    expect(result.items).toHaveLength(1);
    const txn = result.items[0];
    expect(txn.id).toBe(1);
    expect(txn.finalPrice).toBe(12345);
    expect(txn.completedAt).toBe("2026-07-02T00:00:00Z");
    expect(txn.role).toBe("seller");
    expect(txn.buyer.name).toBe("Ahmad Karimi");
    expect(txn.seller.name).toBe("Jane Doe");
    expect(txn.listing?.title).toBe("Lenovo ThinkPad");
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
  });

  it("passes the ?as= role filter and pagination params as query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${BASE}/my/transactions`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          transactions: [],
          meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } },
        });
      })
    );

    await transactionsAPI.getMyTransactions({ as: "buyer", pageNumber: 2, pageSize: 10 });

    expect(capturedUrl).toContain("as=buyer");
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(capturedUrl).toContain("page%5Bsize%5D=10");
  });

  it("returns an empty list when the caller has no transactions", async () => {
    server.use(
      http.get(`${BASE}/my/transactions`, () =>
        HttpResponse.json({
          transactions: [],
          meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } },
        })
      )
    );

    const result = await transactionsAPI.getMyTransactions();
    expect(result.items).toEqual([]);
    expect(result.pagination.totalCount).toBe(0);
  });
});
