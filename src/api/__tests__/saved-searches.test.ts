import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { savedSearchesAPI } from "../saved-searches";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

const BASE = "http://localhost:3007/api/v1";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const MOCK_SAVED_SEARCH_SNAKE = {
  id: 1,
  location: "Kabul",
  category_id: 3,
  category_name: "Electronics",
  price_min: 1000,
  price_max: 50000,
  latitude: 34.5553,
  longitude: 69.2075,
  radius: 10,
  location_based: true,
  created_at: "2026-01-01T00:00:00Z",
  last_viewed_at: null,
  new_matches_count: 2,
};

const MOCK_SAVED_SEARCH_CAMEL = {
  id: 1,
  location: "Kabul",
  categoryId: 3,
  categoryName: "Electronics",
  priceMin: 1000,
  priceMax: 50000,
  latitude: 34.5553,
  longitude: 69.2075,
  radius: 10,
  locationBased: true,
  createdAt: "2026-01-01T00:00:00Z",
  lastViewedAt: null,
  newMatchesCount: 2,
};

// ─── savedSearchesAPI.list ────────────────────────────────────────────────────

describe("savedSearchesAPI.list", () => {
  it("returns a camelCased SavedSearch[] from a snake_case server response", async () => {
    server.use(
      http.get(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ saved_searches: [MOCK_SAVED_SEARCH_SNAKE] })
      )
    );

    const result = await savedSearchesAPI.list();

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item.id).toBe(1);
    expect(item.location).toBe("Kabul");
    // snake_case -> camelCase conversion
    expect(item.categoryId).toBe(3);
    expect(item.categoryName).toBe("Electronics");
    expect(item.priceMin).toBe(1000);
    expect(item.priceMax).toBe(50000);
    expect(item.locationBased).toBe(true);
    expect(item.createdAt).toBe("2026-01-01T00:00:00Z");
    expect(item.newMatchesCount).toBe(2);
    expect(item.lastViewedAt).toBeNull();
    // no snake_case keys leak through
    expect((item as Record<string, unknown>).category_id).toBeUndefined();
    expect((item as Record<string, unknown>).price_min).toBeUndefined();
    expect((item as Record<string, unknown>).location_based).toBeUndefined();
    expect((item as Record<string, unknown>).new_matches_count).toBeUndefined();
    expect((item as Record<string, unknown>).last_viewed_at).toBeUndefined();
  });

  it("returns multiple items in order", async () => {
    const second = { ...MOCK_SAVED_SEARCH_SNAKE, id: 2, location: "Kandahar", category_id: null, category_name: null };
    server.use(
      http.get(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ saved_searches: [MOCK_SAVED_SEARCH_SNAKE, second] })
      )
    );

    const result = await savedSearchesAPI.list();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
    expect(result[1].categoryId).toBeNull();
    expect(result[1].categoryName).toBeNull();
  });

  it("returns [] when saved_searches key is absent from the response", async () => {
    server.use(
      http.get(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({})
      )
    );

    const result = await savedSearchesAPI.list();

    expect(result).toEqual([]);
  });

  it("returns [] when saved_searches is an empty array", async () => {
    server.use(
      http.get(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ saved_searches: [] })
      )
    );

    const result = await savedSearchesAPI.list();

    expect(result).toEqual([]);
  });

  it("throws on a 401 server error", async () => {
    server.use(
      http.get(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    await expect(savedSearchesAPI.list()).rejects.toThrow();
  });
});

// ─── savedSearchesAPI.create ─────────────────────────────────────────────────

describe("savedSearchesAPI.create", () => {
  it("returns a camelCased SavedSearch from the server response", async () => {
    server.use(
      http.post(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ saved_search: MOCK_SAVED_SEARCH_SNAKE }, { status: 201 })
      )
    );

    const result = await savedSearchesAPI.create({
      categoryId: 3,
      priceMin: 1000,
      priceMax: 50000,
      location: "Kabul",
      latitude: 34.5553,
      longitude: 69.2075,
      radius: 10,
    });

    expect(result.id).toBe(1);
    expect(result.categoryId).toBe(3);
    expect(result.categoryName).toBe("Electronics");
    expect(result.priceMin).toBe(1000);
    expect(result.priceMax).toBe(50000);
    expect(result.locationBased).toBe(true);
    expect(result.createdAt).toBe("2026-01-01T00:00:00Z");
    // no snake_case keys should leak through
    expect((result as Record<string, unknown>).category_id).toBeUndefined();
    expect((result as Record<string, unknown>).price_min).toBeUndefined();
  });

  it("sends a snake_case request body (convertKeysToSnake)", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE}/users/saved_searches`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ saved_search: MOCK_SAVED_SEARCH_SNAKE }, { status: 201 });
      })
    );

    await savedSearchesAPI.create({
      categoryId: 3,
      priceMin: 1000,
      priceMax: 50000,
      location: "Kabul",
      latitude: 34.5553,
      longitude: 69.2075,
      radius: 10,
    });

    const body = capturedBody as Record<string, unknown>;
    // camelCase inputs must be converted to snake_case on the wire
    expect(body.category_id).toBe(3);
    expect(body.price_min).toBe(1000);
    expect(body.price_max).toBe(50000);
    expect(body.location).toBe("Kabul");
    expect(body.latitude).toBe(34.5553);
    expect(body.longitude).toBe(69.2075);
    expect(body.radius).toBe(10);
    // camelCase keys must NOT be present
    expect(body.categoryId).toBeUndefined();
    expect(body.priceMin).toBeUndefined();
    expect(body.priceMax).toBeUndefined();
  });

  it("works with only a location string (minimal payload)", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE}/users/saved_searches`, async ({ request }) => {
        capturedBody = await request.json();
        const minimal = { id: 9, location: "Mazar", category_id: null, category_name: null, price_min: null, price_max: null, latitude: null, longitude: null, radius: null, location_based: false, created_at: "2026-03-01T00:00:00Z" };
        return HttpResponse.json({ saved_search: minimal }, { status: 201 });
      })
    );

    const result = await savedSearchesAPI.create({ location: "Mazar" });

    expect((capturedBody as Record<string, unknown>).location).toBe("Mazar");
    expect(result.id).toBe(9);
    expect(result.location).toBe("Mazar");
    expect(result.locationBased).toBe(false);
    expect(result.categoryId).toBeNull();
  });

  it("throws on 422 (validation error)", async () => {
    server.use(
      http.post(`${BASE}/users/saved_searches`, () =>
        HttpResponse.json({ errors: ["Filters can't all be blank"] }, { status: 422 })
      )
    );

    await expect(savedSearchesAPI.create({})).rejects.toThrow();
  });
});

// ─── savedSearchesAPI.delete ─────────────────────────────────────────────────

describe("savedSearchesAPI.delete", () => {
  it("issues a DELETE to /users/saved_searches/:id and resolves to void", async () => {
    let hitUrl = "";
    server.use(
      http.delete(`${BASE}/users/saved_searches/:id`, ({ request }) => {
        hitUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const result = await savedSearchesAPI.delete(42);

    expect(result).toBeUndefined();
    expect(hitUrl).toContain("/users/saved_searches/42");
  });

  it("uses the correct numeric id in the URL path", async () => {
    const capturedIds: number[] = [];
    server.use(
      http.delete(`${BASE}/users/saved_searches/:id`, ({ params }) => {
        capturedIds.push(Number(params.id));
        return new HttpResponse(null, { status: 204 });
      })
    );

    await savedSearchesAPI.delete(1);
    await savedSearchesAPI.delete(999);

    expect(capturedIds).toEqual([1, 999]);
  });

  it("throws on 404 (not found or not owned)", async () => {
    server.use(
      http.delete(`${BASE}/users/saved_searches/:id`, () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );

    await expect(savedSearchesAPI.delete(999)).rejects.toThrow();
  });
});

// ─── savedSearchesAPI.markSeen ────────────────────────────────────────────────

const MOCK_AFTER_MARK_SEEN = {
  ...MOCK_SAVED_SEARCH_SNAKE,
  new_matches_count: 0,
  last_viewed_at: "2026-06-26T10:00:00Z",
};

describe("savedSearchesAPI.markSeen", () => {
  it("issues PUT to /users/saved_searches/:id/mark_seen and returns camelCased record", async () => {
    server.use(
      http.put(`${BASE}/users/saved_searches/:id/mark_seen`, () =>
        HttpResponse.json({ saved_search: MOCK_AFTER_MARK_SEEN })
      )
    );

    const result = await savedSearchesAPI.markSeen(1);

    expect(result.id).toBe(1);
    expect(result.newMatchesCount).toBe(0);
    expect(result.lastViewedAt).toBe("2026-06-26T10:00:00Z");
    // No snake_case keys
    expect((result as Record<string, unknown>).new_matches_count).toBeUndefined();
    expect((result as Record<string, unknown>).last_viewed_at).toBeUndefined();
  });

  it("uses the correct id in the URL path", async () => {
    let capturedId = "";
    server.use(
      http.put(`${BASE}/users/saved_searches/:id/mark_seen`, ({ params }) => {
        capturedId = String(params.id);
        return HttpResponse.json({ saved_search: MOCK_AFTER_MARK_SEEN });
      })
    );

    await savedSearchesAPI.markSeen(42);

    expect(capturedId).toBe("42");
  });

  it("throws on 403 (not owner)", async () => {
    server.use(
      http.put(`${BASE}/users/saved_searches/:id/mark_seen`, () =>
        HttpResponse.json({ error: "Forbidden" }, { status: 403 })
      )
    );

    await expect(savedSearchesAPI.markSeen(1)).rejects.toThrow();
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.put(`${BASE}/users/saved_searches/:id/mark_seen`, () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );

    await expect(savedSearchesAPI.markSeen(1)).rejects.toThrow();
  });
});
