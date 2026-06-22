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

  it("passes seller_active_days as query param when sellerActiveDays is set", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sellerActiveDays: 7 });
    expect(capturedUrl).toContain("seller_active_days=7");
  });

  it("does NOT append seller_active_days when sellerActiveDays is undefined", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ search: "phone" });
    expect(capturedUrl).not.toContain("seller_active_days");
  });

  it("composes sellerActiveDays with other filters", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [], meta: { pagination: { current_page: 1, next_page: null, prev_page: null, total_count: 0, total_pages: 0 } } });
      })
    );
    await listingsAPI.getListings({ sellerActiveDays: 7, categoryId: 2, search: "bike" });
    expect(capturedUrl).toContain("seller_active_days=7");
    expect(capturedUrl).toContain("category_id=2");
    expect(capturedUrl).toContain("search=bike");
  });
});

describe("listingsAPI.getListing", () => {
  it("returns a single listing with camelCase keys", async () => {
    const listing = await listingsAPI.getListing(10);
    expect(listing.id).toBe(10);
    expect(listing.isSaved).toBe(false);
    expect(listing.seller.avatarUrl).toBeNull();
  });

  it("maps share_url to shareUrl (camelCase conversion)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/42", () =>
        HttpResponse.json({
          listing: {
            ...MOCK_LISTING,
            id: 42,
            share_url: "https://hatiwal.example.com/l/42",
          },
        })
      )
    );
    const listing = await listingsAPI.getListing(42);
    expect(listing.shareUrl).toBe("https://hatiwal.example.com/l/42");
  });

  it("returns shareUrl as undefined when share_url is absent (backend env not set)", async () => {
    // The default MOCK_LISTING handler does not include share_url,
    // so getListing should return shareUrl as undefined (not crashing).
    const listing = await listingsAPI.getListing(10);
    expect(listing.shareUrl).toBeUndefined();
  });

  it("returns shareUrl as null when share_url is explicitly null from backend", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/43", () =>
        HttpResponse.json({
          listing: { ...MOCK_LISTING, id: 43, share_url: null },
        })
      )
    );
    const listing = await listingsAPI.getListing(43);
    expect(listing.shareUrl).toBeNull();
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

// ─── listingsAPI.getListing — seller away mode mapping ───────────────────────

describe("listingsAPI.getListing — seller away mode (sellerIsAway / sellerAwayUntil)", () => {
  it("maps seller_is_away: false and null seller_away_until when seller is not away", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/50", () =>
        HttpResponse.json({
          listing: {
            ...MOCK_LISTING,
            id: 50,
            seller: {
              ...MOCK_LISTING.seller,
              seller_is_away: false,
              seller_away_until: null,
            },
          },
        })
      )
    );
    const listing = await listingsAPI.getListing(50);
    expect(listing.seller.sellerIsAway).toBe(false);
    expect(listing.seller.sellerAwayUntil).toBeNull();
  });

  it("maps seller_is_away: true and an ISO-8601 seller_away_until when seller is away", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    server.use(
      http.get("http://localhost:3007/api/v1/listings/51", () =>
        HttpResponse.json({
          listing: {
            ...MOCK_LISTING,
            id: 51,
            seller: {
              ...MOCK_LISTING.seller,
              seller_is_away: true,
              seller_away_until: futureDate,
            },
          },
        })
      )
    );
    const listing = await listingsAPI.getListing(51);
    expect(listing.seller.sellerIsAway).toBe(true);
    expect(listing.seller.sellerAwayUntil).toBe(futureDate);
  });

  it("returns sellerIsAway as undefined when field is absent (older backend response)", async () => {
    // Default MOCK_LISTING handler has no seller_is_away — field absent entirely
    const listing = await listingsAPI.getListing(10);
    expect(listing.seller.sellerIsAway).toBeUndefined();
    expect(listing.seller.sellerAwayUntil).toBeUndefined();
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
  it("returns camelCased items and pagination", async () => {
    const result = await listingsAPI.getSavedListings();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(10);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.nextPage).toBeNull();
  });

  it("passes page[number] param when page is provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/saved_listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          listings: [],
          meta: {
            pagination: {
              current_page: 2,
              next_page: null,
              prev_page: 1,
              total_count: 25,
              total_pages: 2,
            },
          },
        });
      })
    );
    const result = await listingsAPI.getSavedListings(2);
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.prevPage).toBe(1);
  });

  it("does not append page param when page is not provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/saved_listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          listings: [],
          meta: {
            pagination: {
              current_page: 1,
              next_page: null,
              prev_page: null,
              total_count: 0,
              total_pages: 1,
            },
          },
        });
      })
    );
    await listingsAPI.getSavedListings();
    expect(capturedUrl).not.toContain("page%5Bnumber%5D");
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

describe("listingsAPI.getSimilarListings", () => {
  it("returns camelCased listing array from /listings/:id/similar", async () => {
    const result = await listingsAPI.getSimilarListings(10);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    // Source listing is excluded — IDs should differ from 10
    expect(result.map((l) => l.id)).not.toContain(10);
    const first = result[0];
    expect(first.thumbnailUrl).toBeNull();
    expect(first.viewsCount).toBe(10);
    expect(first.seller.avatarUrl).toBeNull();
    expect(first.category.nameEn).toBe("Electronics");
  });

  it("returns an empty array when the backend returns no similar listings", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/99/similar", () =>
        HttpResponse.json({ listings: [] })
      )
    );
    const result = await listingsAPI.getSimilarListings(99);
    expect(result).toEqual([]);
  });

  it("calls the correct endpoint URL", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/listings/42/similar", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ listings: [] });
      })
    );
    await listingsAPI.getSimilarListings(42);
    expect(capturedUrl).toContain("/listings/42/similar");
  });

  it("throws on 404 for a non-existent listing", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/listings/0/similar", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(listingsAPI.getSimilarListings(0)).rejects.toThrow();
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

// ─── getSoldListings ──────────────────────────────────────────────────────────

const MOCK_SOLD_PAGINATION = {
  current_page: 1,
  next_page: null,
  prev_page: null,
  total_count: 2,
  total_pages: 1,
};

const MOCK_SOLD_LISTING = {
  id: 77,
  title: "Old Phone",
  price: "500.0",
  currency: "AFN",
  status: "sold",
  location: "Kabul",
  address: null,
  condition: "good",
  views_count: 8,
  category_id: 3,
  thumbnail_url: null,
  image_urls: [],
  is_viewed: false,
  price_drop_percent: null,
  price_dropped_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-02-01T00:00:00.000Z",
  seller: {
    id: 5,
    name: "Ahmad Shah",
    city: "Kabul",
    verified: true,
    avatar_url: null,
  },
  category: {
    id: 3,
    name_en: "Electronics",
    name_ps: "الکترونیکي",
    name_fa: "الکترونیک",
    slug: "electronics",
  },
};

describe("listingsAPI.getSoldListings", () => {
  beforeEach(() => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/5/sold_listings", () =>
        HttpResponse.json({
          listings: [MOCK_SOLD_LISTING, { ...MOCK_SOLD_LISTING, id: 78 }],
          meta: { pagination: MOCK_SOLD_PAGINATION },
        })
      )
    );
  });

  it("returns camelCased items and pagination", async () => {
    const result = await listingsAPI.getSoldListings(5);
    expect(result.items).toHaveLength(2);
    const item = result.items[0];
    expect(item.id).toBe(77);
    expect(item.status).toBe("sold");
    expect(item.viewsCount).toBe(8);
    expect(item.seller.avatarUrl).toBeNull();
    expect(item.category.nameEn).toBe("Electronics");
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(2);
  });

  it("passes page[number] query param when provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/users/5/sold_listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          listings: [],
          meta: { pagination: { ...MOCK_SOLD_PAGINATION, total_count: 0 } },
        });
      })
    );
    await listingsAPI.getSoldListings(5, 2);
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
  });

  it("returns empty items array when listings is absent from response", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/99/sold_listings", () =>
        HttpResponse.json({
          listings: [],
          meta: { pagination: { ...MOCK_SOLD_PAGINATION, total_count: 0, total_pages: 0 } },
        })
      )
    );
    const result = await listingsAPI.getSoldListings(99);
    expect(result.items).toEqual([]);
  });

  it("throws on 404 (non-existent or deleted user)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/0/sold_listings", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(listingsAPI.getSoldListings(0)).rejects.toThrow();
  });
});

describe("listingsAPI.getViewedListings", () => {
  it("returns camelCased items and pagination", async () => {
    const result = await listingsAPI.getViewedListings();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(10);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.nextPage).toBeNull();
  });

  it("passes page[number] param when page is provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/viewed_listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          listings: [],
          meta: {
            pagination: {
              current_page: 2,
              next_page: null,
              prev_page: 1,
              total_count: 25,
              total_pages: 2,
            },
          },
        });
      })
    );
    const result = await listingsAPI.getViewedListings(2);
    expect(capturedUrl).toContain("page%5Bnumber%5D=2");
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.prevPage).toBe(1);
  });

  it("does not append page param when page is not provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/viewed_listings", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          listings: [],
          meta: {
            pagination: {
              current_page: 1,
              next_page: null,
              prev_page: null,
              total_count: 0,
              total_pages: 1,
            },
          },
        });
      })
    );
    await listingsAPI.getViewedListings();
    expect(capturedUrl).not.toContain("page%5Bnumber%5D");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/viewed_listings", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(listingsAPI.getViewedListings()).rejects.toThrow();
  });

  it("converts snake_case fields to camelCase (views_count -> viewsCount)", async () => {
    const result = await listingsAPI.getViewedListings();
    const item = result.items[0];
    expect(item.viewsCount).toBe(10);
    expect(item.thumbnailUrl).toBeNull();
    expect(item.categoryId).toBe(1);
  });
});

// ── getMyListingStatusCounts ──────────────────────────────────────────────────

describe("listingsAPI.getMyListingStatusCounts", () => {
  it("calls GET /my/listings/status_counts and returns camelCased counts", async () => {
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/status_counts", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          all: 10,
          draft: 2,
          active: 3,
          expired: 1,
          reserved: 2,
          sold: 2,
        });
      })
    );

    const result = await listingsAPI.getMyListingStatusCounts();

    expect(capturedUrl).toContain("/my/listings/status_counts");
    expect(result.all).toBe(10);
    expect(result.draft).toBe(2);
    expect(result.active).toBe(3);
    expect(result.expired).toBe(1);
    expect(result.reserved).toBe(2);
    expect(result.sold).toBe(2);
  });

  it("returns zero counts when the seller has no listings", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/status_counts", () =>
        HttpResponse.json({ all: 0, draft: 0, active: 0, expired: 0, reserved: 0, sold: 0 })
      )
    );

    const result = await listingsAPI.getMyListingStatusCounts();

    expect(result.all).toBe(0);
    expect(result.draft).toBe(0);
    expect(result.active).toBe(0);
    expect(result.expired).toBe(0);
    expect(result.reserved).toBe(0);
    expect(result.sold).toBe(0);
  });

  it("throws on 401 (unauthenticated guest)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/my/listings/status_counts", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    await expect(listingsAPI.getMyListingStatusCounts()).rejects.toThrow();
  });
});
