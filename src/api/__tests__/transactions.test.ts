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
  quantity: 1,
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
    expect(txn.buyer?.name).toBe("Ahmad Karimi");
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

  // SF-B5 (docs/SELL_FLOW_REDESIGN.md §9) — the Sales screen's own read:
  // GET /my/transactions?listing_id=42&as=seller&status=sold
  it("passes listing_id and status as query params (SF-B5, the Sales screen's read)", async () => {
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

    await transactionsAPI.getMyTransactions({ listingId: 42, as: "seller", status: "sold" });

    expect(capturedUrl).toContain("listing_id=42");
    expect(capturedUrl).toContain("as=seller");
    expect(capturedUrl).toContain("status=sold");
  });

  it("SF-B3: a null buyer (sold to someone not on Hatiwal) survives the camelCase conversion as null, not dropped or defaulted", async () => {
    server.use(
      http.get(`${BASE}/my/transactions`, () =>
        HttpResponse.json({
          transactions: [{ ...MOCK_TRANSACTION_SNAKE, buyer: null }],
          meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 1, total_pages: 1 } },
        })
      )
    );

    const result = await transactionsAPI.getMyTransactions();
    expect(result.items[0].buyer).toBeNull();
  });

  it("carries the per-sale quantity through camelCase conversion", async () => {
    server.use(
      http.get(`${BASE}/my/transactions`, () =>
        HttpResponse.json({
          transactions: [{ ...MOCK_TRANSACTION_SNAKE, quantity: 3 }],
          meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 1, total_pages: 1 } },
        })
      )
    );

    const result = await transactionsAPI.getMyTransactions();
    expect(result.items[0].quantity).toBe(3);
  });
});

// SF-B4 (docs/SELL_FLOW_REDESIGN.md §8) — correcting/voiding a recorded sale.

describe("transactionsAPI.updateTransaction", () => {
  const MOCK_LISTING_SNAKE = {
    id: 10,
    title: "Lenovo ThinkPad",
    price: 25000,
    currency: "AFN",
    status: "active",
    quantity: 15,
    available_units: 6,
  };

  it("PATCHes /my/transactions/:id with snake_case params and returns the camelCased listing + transaction", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${BASE}/my/transactions/5`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          listing: MOCK_LISTING_SNAKE,
          transaction: { ...MOCK_TRANSACTION_SNAKE, id: 5, quantity: 2 },
        });
      })
    );

    const result = await transactionsAPI.updateTransaction(5, { quantity: 2, finalPrice: 13000 });

    expect(capturedBody).toEqual({ quantity: 2, final_price: 13000 });
    expect(result.listing.id).toBe(10);
    expect(result.listing.availableUnits).toBe(6);
    expect(result.transaction?.quantity).toBe(2);
  });

  it("sends clear_buyer (snake_case) when reassigning to 'someone not on Hatiwal'", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${BASE}/my/transactions/5`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ listing: MOCK_LISTING_SNAKE, transaction: MOCK_TRANSACTION_SNAKE });
      })
    );

    await transactionsAPI.updateTransaction(5, { clearBuyer: true });

    expect(capturedBody).toEqual({ clear_buyer: true });
  });

  it("omits `transaction` from the result when the response has none (should not happen for update, but stay nil-safe)", async () => {
    server.use(
      http.patch(`${BASE}/my/transactions/5`, () =>
        HttpResponse.json({ listing: MOCK_LISTING_SNAKE })
      )
    );

    const result = await transactionsAPI.updateTransaction(5, { quantity: 1 });
    expect(result.transaction).toBeUndefined();
  });
});

describe("transactionsAPI.deleteTransaction", () => {
  const MOCK_LISTING_SNAKE = {
    id: 10,
    title: "Lenovo ThinkPad",
    price: 25000,
    currency: "AFN",
    status: "active",
    quantity: 15,
    available_units: 15,
  };

  it("DELETEs /my/transactions/:id and returns the reopened listing with no transaction", async () => {
    server.use(
      http.delete(`${BASE}/my/transactions/5`, () =>
        HttpResponse.json({ listing: MOCK_LISTING_SNAKE })
      )
    );

    const result = await transactionsAPI.deleteTransaction(5);

    expect(result.listing.status).toBe("active");
    expect(result.listing.availableUnits).toBe(15);
    expect(result.transaction).toBeUndefined();
  });
});
