import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { listingsAPI } from "../listings";
import { MOCK_LISTING } from "../../__tests__/mocks/handlers";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("listingsAPI.getListings", () => {
  it("returns camelCased items and pagination", async () => {
    const result = await listingsAPI.getListings();
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.id).toBe(10);
    expect(item.thumbnailUrl).toBeNull();
    expect(item.viewsCount).toBe(10);
    expect(item.seller.avatarUrl).toBeNull();
    expect(item.category.nameEn).toBe("Electronics");
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
  });

  it("passes search param as query string", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ search: "iPhone", pageNumber: 2 });
    expect(capturedUrl).toContain("search=iPhone");
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
  });

  it("passes category_id filter", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ categoryId: 3 });
    expect(capturedUrl).toContain("category_id=3");
  });

  it("passes sort=price_asc as query param", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sort: "price_asc" });
    expect(capturedUrl).toContain("sort=price_asc");
  });

  it("passes sort=price_desc as query param", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sort: "price_desc" });
    expect(capturedUrl).toContain("sort=price_desc");
  });

  it("passes sort=oldest as query param", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sort: "oldest" });
    expect(capturedUrl).toContain("sort=oldest");
  });

  it("does NOT append sort param for newest (server default)", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sort: "newest" });
    expect(capturedUrl).not.toContain("sort=");
  });

  it("returns empty items on empty response", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings", () =>
        HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } })
      )
    );
    const result = await listingsAPI.getListings();
    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalCount).toBe(0);
  });
});

describe("listingsAPI.getListing", () => {
  it("returns a single listing with camelCase keys", async () => {
    const listing = await listingsAPI.getListing(10);
    expect(listing.id).toBe(10);
    expect(listing.isSaved).toBe(false);
    expect(listing.seller.avatarUrl).toBeNull();
  });

  it("throws on 404", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/999", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(listingsAPI.getListing(999)).rejects.toThrow();
  });
});

describe("listingsAPI.saveListing / unsaveListing", () => {
  it("saveListing resolves on 201", async () => {
    await expect(listingsAPI.saveListing(10)).resolves.toBeUndefined();
  });

  it("unsaveListing resolves on 200", async () => {
    await expect(listingsAPI.unsaveListing(10)).resolves.toBeUndefined();
  });
});

describe("listingsAPI.createListing", () => {
  it("sends snake_case body and returns camelCased listing", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/my/listings", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ listing: MOCK_LISTING }, { status: 201 });
      })
    );
    const listing = await listingsAPI.createListing({
      title: "iPhone 12",
      price: 25000,
      categoryId: 1,
    });
    expect(listing.id).toBe(10);
    // Body should be snake_case
    expect((capturedBody as any).listing.category_id).toBe(1);
  });
});

describe("listingsAPI.updateListing", () => {
  it("sends snake_case and returns camelCased result", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("http://localhost:3007/api/v1/my/listings/10", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ listing: { ...MOCK_LISTING, title: "Updated" } });
      })
    );
    const listing = await listingsAPI.updateListing(10, { title: "Updated", categoryId: 1 });
    expect(listing.title).toBe("Updated");
    expect((capturedBody as any).listing.category_id).toBe(1);
  });
});

describe("listingsAPI.deleteListing", () => {
  it("resolves on 204", async () => {
    await expect(listingsAPI.deleteListing(10)).resolves.toBeUndefined();
  });
});

describe("listingsAPI lifecycle transitions", () => {
  it("publishListing returns active listing", async () => {
    const listing = await listingsAPI.publishListing(10);
    expect(listing.status).toBe("active");
  });

  it("unpublishListing returns draft listing", async () => {
    const listing = await listingsAPI.unpublishListing(10);
    expect(listing.status).toBe("draft");
  });

  it("reserveListing returns reserved listing", async () => {
    const listing = await listingsAPI.reserveListing(10);
    expect(listing.status).toBe("reserved");
  });

  it("activateListing returns active listing", async () => {
    const listing = await listingsAPI.activateListing(10);
    expect(listing.status).toBe("active");
  });

  it("markSold returns sold listing", async () => {
    const listing = await listingsAPI.markSold(10);
    expect(listing.status).toBe("sold");
  });
});

describe("listingsAPI.getSavedListings", () => {
  it("returns camelCased items with totalCount", async () => {
    const result = await listingsAPI.getSavedListings();
    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.items[0].id).toBe(10);
  });
});

describe("listingsAPI.getMyListings", () => {
  it("returns camelCased items and pagination", async () => {
    const result = await listingsAPI.getMyListings();
    expect(result.items).toHaveLength(1);
    expect(result.pagination.currentPage).toBe(1);
  });

  it("passes status filter", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getMyListings({ status: "draft" });
    expect(capturedUrl).toContain("status=draft");
  });
});

// ─── Filter / sort query-param serialization (TASK-Q037) ────────────────────

// Helper: intercept the next GET /listings and return an empty list, capturing
// the full request URL so tests can assert exact query-param names and values.
function interceptListingsUrl(onUrl: (url: string) => void) {
  server.use(
    http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
      onUrl(request.url);
      return HttpResponse.json({
        listings: [],
        meta: {
          pagination: {
            current_page: 1,
            next_page: null,
            prev_page: null,
            total_count: 0,
            total_pages: 0,
          },
        },
      });
    })
  );
}

describe("listingsAPI.getListings — filter/sort query-param serialization", () => {
  it("serializes priceMin as price_min", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ priceMin: 1000 });
    expect(url).toContain("price_min=1000");
  });

  it("serializes priceMax as price_max", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ priceMax: 50000 });
    expect(url).toContain("price_max=50000");
  });

  it("serializes priceMin=0 (zero is a valid bound — not treated as falsy)", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ priceMin: 0 });
    expect(url).toContain("price_min=0");
  });

  it("serializes condition as 'condition'", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ condition: "like_new" });
    expect(url).toContain("condition=like_new");
  });

  it("serializes categoryId as category_id", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ categoryId: 5 });
    expect(url).toContain("category_id=5");
  });

  it("serializes search as 'search'", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ search: "laptop" });
    expect(url).toContain("search=laptop");
  });

  it("serializes sort=price_asc as 'sort'", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ sort: "price_asc" });
    expect(url).toContain("sort=price_asc");
  });

  it("serializes sort=price_desc as 'sort'", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ sort: "price_desc" });
    expect(url).toContain("sort=price_desc");
  });

  it("omits sort param when sort=newest (server default — no param needed)", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ sort: "newest" });
    expect(url).not.toContain("sort=");
  });

  it("serializes latitude, longitude, and radius together for geo search", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ latitude: 34.5, longitude: 69.2, radius: 10 });
    expect(url).toContain("latitude=34.5");
    expect(url).toContain("longitude=69.2");
    expect(url).toContain("radius=10");
  });

  it("omits geo params when only latitude is provided (incomplete geo triple)", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ latitude: 34.5 });
    expect(url).not.toContain("latitude=");
    expect(url).not.toContain("longitude=");
    expect(url).not.toContain("radius=");
  });

  it("sends location string when geo triple is absent", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({ location: "Kabul" });
    expect(url).toContain("location=Kabul");
  });

  it("prefers geo triple over location string when both are provided", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({
      latitude: 34.5,
      longitude: 69.2,
      radius: 5,
      location: "Kabul",
    });
    expect(url).toContain("latitude=34.5");
    expect(url).toContain("longitude=69.2");
    expect(url).toContain("radius=5");
    // location text param is omitted when geo triple is present
    expect(url).not.toContain("location=");
  });

  it("omits undefined filter values — no 'undefined' string in query", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({
      priceMin: undefined,
      priceMax: undefined,
      condition: undefined,
      categoryId: undefined,
      sort: undefined,
      location: undefined,
    });
    expect(url).not.toContain("undefined");
    expect(url).not.toContain("price_min=");
    expect(url).not.toContain("price_max=");
    expect(url).not.toContain("condition=");
    expect(url).not.toContain("category_id=");
    expect(url).not.toContain("sort=");
    expect(url).not.toContain("location=");
  });

  it("omits null filter values — no 'null' string in query", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    // ListingParams types are optional (not nullable), but runtime callers can
    // pass null through. Verify the guard (`!= null`) handles it correctly.
    await listingsAPI.getListings({
      priceMin: null as unknown as number,
      priceMax: null as unknown as number,
    });
    expect(url).not.toContain("null");
    expect(url).not.toContain("price_min=");
    expect(url).not.toContain("price_max=");
  });

  it("combines multiple filters in a single request", async () => {
    let url = "";
    interceptListingsUrl((u) => { url = u; });
    await listingsAPI.getListings({
      search: "phone",
      categoryId: 1,
      condition: "good",
      priceMin: 5000,
      priceMax: 30000,
      sort: "price_asc",
      pageNumber: 2,
      pageSize: 20,
    });
    expect(url).toContain("search=phone");
    expect(url).toContain("category_id=1");
    expect(url).toContain("condition=good");
    expect(url).toContain("price_min=5000");
    expect(url).toContain("price_max=30000");
    expect(url).toContain("sort=price_asc");
    expect(url).toContain("page%5Bnumber%5D=2");
    expect(url).toContain("page%5Bsize%5D=20");
  });
});

describe("listingsAPI.getListings — camel-in response mapping", () => {
  it("maps snake_case listing fields to camelCase", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings", () =>
        HttpResponse.json({
          listings: [
            {
              id: 42,
              title: "Test Phone",
              description: "Works great",
              price: 15000,
              currency: "AFN",
              condition: "good",
              status: "active",
              category_id: 2,
              location: "Herat",
              address: null,
              latitude: null,
              longitude: null,
              thumbnail_url: "https://example.com/thumb.jpg",
              image_urls: ["https://example.com/1.jpg"],
              views_count: 5,
              conversations_count: 1,
              is_saved: true,
              is_viewed: true,
              created_at: "2026-03-01T00:00:00Z",
              updated_at: "2026-03-01T00:00:00Z",
              seller: {
                id: 7,
                name: "Seller Name",
                city: "Herat",
                phone: null,
                verified: true,
                avatar_url: "https://example.com/avatar.jpg",
              },
              category: {
                id: 2,
                name_en: "Phones",
                name_ps: "موبایلونه",
                name_fa: "تلفن‌ها",
                slug: "phones",
              },
            },
          ],
          meta: {
            pagination: {
              current_page: 2,
              next_page: 3,
              prev_page: 1,
              total_count: 50,
              total_pages: 5,
            },
          },
        })
      )
    );

    const result = await listingsAPI.getListings();

    // Top-level camelCase fields
    const item = result.items[0];
    expect(item.id).toBe(42);
    expect(item.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(item.viewsCount).toBe(5);
    expect(item.conversationsCount).toBe(1);
    expect(item.isSaved).toBe(true);
    expect(item.isViewed).toBe(true);
    expect(item.categoryId).toBe(2);

    // Nested seller
    expect(item.seller.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(item.seller.verified).toBe(true);

    // Nested category
    expect(item.category.nameEn).toBe("Phones");
    expect(item.category.namePs).toBe("موبایلونه");
    expect(item.category.nameFa).toBe("تلفن‌ها");

    // Pagination camelCase
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.nextPage).toBe(3);
    expect(result.pagination.prevPage).toBe(1);
    expect(result.pagination.totalCount).toBe(50);
    expect(result.pagination.totalPages).toBe(5);
  });

  it("maps is_saved=false and is_viewed=false correctly", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings", () =>
        HttpResponse.json({
          listings: [
            {
              id: 99,
              title: "Old Radio",
              description: null,
              price: 500,
              currency: "AFN",
              condition: null,
              status: "active",
              category_id: 3,
              location: "Jalalabad",
              address: null,
              latitude: null,
              longitude: null,
              thumbnail_url: null,
              image_urls: [],
              views_count: 0,
              conversations_count: 0,
              is_saved: false,
              is_viewed: false,
              created_at: "2026-01-10T00:00:00Z",
              updated_at: "2026-01-10T00:00:00Z",
              seller: { id: 3, name: "Test", city: null, phone: null, verified: false, avatar_url: null },
              category: { id: 3, name_en: "Other", name_ps: "نور", name_fa: "دیگر", slug: "other" },
            },
          ],
          meta: {
            pagination: {
              current_page: 1,
              next_page: null,
              prev_page: null,
              total_count: 1,
              total_pages: 1,
            },
          },
        })
      )
    );

    const result = await listingsAPI.getListings();
    const item = result.items[0];
    expect(item.isSaved).toBe(false);
    expect(item.isViewed).toBe(false);
    expect(item.seller.avatarUrl).toBeNull();
    expect(item.category.nameEn).toBe("Other");
  });
});

describe("listingsAPI.getMyListing — owner detail with analytics", () => {
  it("returns a single listing with camelCase keys", async () => {
    const listing = await listingsAPI.getMyListing(10);
    expect(listing.id).toBe(10);
    expect(listing.title).toBe("iPhone 12 Pro");
  });

  it("returns views_count and conversations_count as numbers", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/10", () =>
        HttpResponse.json({
          listing: {
            ...MOCK_LISTING,
            id: 10,
            views_count: 42,
            conversations_count: 7,
          },
        })
      )
    );
    const listing = await listingsAPI.getMyListing(10);
    expect(listing.viewsCount).toBe(42);
    expect(listing.conversationsCount).toBe(7);
  });

  it("camelCases nested seller and category", async () => {
    const listing = await listingsAPI.getMyListing(10);
    expect(listing.seller.avatarUrl).toBeNull();
    expect(listing.category.nameEn).toBe("Electronics");
  });

  it("throws on 404 (other user's listing)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/999", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(listingsAPI.getMyListing(999)).rejects.toThrow();
  });
});

describe("listingsAPI.getListingAnalytics", () => {
  const MOCK_ANALYTICS = [
    { date: "2026-06-11", count: 0 },
    { date: "2026-06-12", count: 2 },
    { date: "2026-06-13", count: 5 },
    { date: "2026-06-14", count: 1 },
    { date: "2026-06-15", count: 0 },
    { date: "2026-06-16", count: 3 },
    { date: "2026-06-17", count: 7 },
  ];

  beforeEach(() => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/42/analytics", () =>
        HttpResponse.json({ analytics: MOCK_ANALYTICS })
      )
    );
  });

  it("returns 7 entries with date and count", async () => {
    const result = await listingsAPI.getListingAnalytics(42);
    expect(result.entries).toHaveLength(7);
    expect(result.entries[0]).toEqual({ date: "2026-06-11", count: 0 });
    expect(result.entries[6]).toEqual({ date: "2026-06-17", count: 7 });
  });

  it("camelCases entry keys (date and count stay the same)", async () => {
    const result = await listingsAPI.getListingAnalytics(42);
    // date and count are already camelCase-compatible — verify they survive conversion
    expect(typeof result.entries[0].date).toBe("string");
    expect(typeof result.entries[0].count).toBe("number");
  });

  it("returns empty entries array when analytics is missing from response", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/99/analytics", () =>
        HttpResponse.json({})
      )
    );
    const result = await listingsAPI.getListingAnalytics(99);
    expect(result.entries).toEqual([]);
  });

  it("throws on 404 (not the owner)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/999/analytics", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(listingsAPI.getListingAnalytics(999)).rejects.toThrow();
  });
});
