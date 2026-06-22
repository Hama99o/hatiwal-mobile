import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { usersAPI } from "../users";
import { MOCK_PUBLIC_PROFILE } from "../../__tests__/mocks/handlers";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("usersAPI.getPublicProfile", () => {
  it("returns a camelCased public profile", async () => {
    const profile = await usersAPI.getPublicProfile(2);
    expect(profile.id).toBe(2);
    expect(profile.name).toBe("Omar Noori");
    expect(profile.avatarUrl).toBeNull();
    expect(profile.city).toBe("Kandahar");
    expect(profile.bio).toBe("Selling quality electronics");
    expect(profile.memberSince).toBe("January 2025");
    expect(profile.soldCount).toBe(5);
    expect(profile.listingsCount).toBe(3);
    expect(profile.verified).toBe(false);
    expect(profile.blocked).toBe(false);
    expect(profile.responseRatePercent).toBe(80);
    expect(profile.responseTimeLabel).toBe("within_one_hour");
    expect(profile.lastActiveLabel).toBe("today");
  });

  it("returns null responseRatePercent and responseTimeLabel when seller is below threshold", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/3/public_profile", () =>
        HttpResponse.json({
          user: {
            ...MOCK_PUBLIC_PROFILE,
            id: 3,
            response_rate_percent: null,
            response_time_label: null,
          },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(3);
    expect(profile.responseRatePercent).toBeNull();
    expect(profile.responseTimeLabel).toBeNull();
  });

  it('returns "this_week" lastActiveLabel when backend sends this_week', async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/5/public_profile", () =>
        HttpResponse.json({
          user: {
            ...MOCK_PUBLIC_PROFILE,
            id: 5,
            last_active_label: "this_week",
          },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(5);
    expect(profile.lastActiveLabel).toBe("this_week");
  });

  it('returns "this_month" lastActiveLabel when backend sends this_month', async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/6/public_profile", () =>
        HttpResponse.json({
          user: {
            ...MOCK_PUBLIC_PROFILE,
            id: 6,
            last_active_label: "this_month",
          },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(6);
    expect(profile.lastActiveLabel).toBe("this_month");
  });

  it("returns null lastActiveLabel for a long-dormant seller", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/7/public_profile", () =>
        HttpResponse.json({
          user: {
            ...MOCK_PUBLIC_PROFILE,
            id: 7,
            last_active_label: null,
          },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(7);
    expect(profile.lastActiveLabel).toBeNull();
  });

  it("exposes full_name as name when name field is missing", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/99/public_profile", () =>
        HttpResponse.json({
          user: { ...MOCK_PUBLIC_PROFILE, id: 99, name: undefined, full_name: "Test Seller" },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(99);
    expect(profile.name).toBe("Test Seller");
  });

  it("throws on 404", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/404/public_profile", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(usersAPI.getPublicProfile(404)).rejects.toThrow();
  });

  it("maps share_url to shareUrl (camelCase conversion) when backend env is set", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/42/public_profile", () =>
        HttpResponse.json({
          user: { ...MOCK_PUBLIC_PROFILE, id: 42, share_url: "https://hatiwal.example.com/u/42" },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(42);
    expect(profile.shareUrl).toBe("https://hatiwal.example.com/u/42");
  });

  it("returns shareUrl as null when share_url is explicitly null from backend (env not set)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/43/public_profile", () =>
        HttpResponse.json({
          user: { ...MOCK_PUBLIC_PROFILE, id: 43, share_url: null },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(43);
    expect(profile.shareUrl).toBeNull();
  });

  it("returns shareUrl as undefined when share_url field is absent (older server response)", async () => {
    // The default MOCK_PUBLIC_PROFILE handler does not include share_url,
    // so getPublicProfile should return shareUrl as undefined (not crashing).
    const profile = await usersAPI.getPublicProfile(2);
    expect(profile.shareUrl).toBeUndefined();
  });
});

describe("usersAPI.getPublicProfile — away mode mapping", () => {
  it("maps is_away: false and null away_until when seller is not away", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/users/20/public_profile", () =>
        HttpResponse.json({
          user: { ...MOCK_PUBLIC_PROFILE, id: 20, is_away: false, away_until: null },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(20);
    expect(profile.isAway).toBe(false);
    expect(profile.awayUntil).toBeNull();
  });

  it("maps is_away: true and non-null away_until when seller is away", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString();
    server.use(
      http.get("http://localhost:3007/api/v1/users/21/public_profile", () =>
        HttpResponse.json({
          user: { ...MOCK_PUBLIC_PROFILE, id: 21, is_away: true, away_until: futureDate },
        })
      )
    );
    const profile = await usersAPI.getPublicProfile(21);
    expect(profile.isAway).toBe(true);
    expect(profile.awayUntil).toBe(futureDate);
  });

  it("returns isAway as undefined when field is absent from server response", async () => {
    // Default MOCK_PUBLIC_PROFILE has no is_away — field omitted entirely
    const profile = await usersAPI.getPublicProfile(2);
    expect(profile.isAway).toBeUndefined();
  });
});

describe("usersAPI.blockUser", () => {
  it("resolves without errors", async () => {
    await expect(usersAPI.blockUser(2)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    server.use(
      http.post("http://localhost:3007/api/v1/users/999/block", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(usersAPI.blockUser(999)).rejects.toThrow();
  });
});

describe("usersAPI.unblockUser", () => {
  it("resolves without errors", async () => {
    await expect(usersAPI.unblockUser(2)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    server.use(
      http.delete("http://localhost:3007/api/v1/users/999/block", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );
    await expect(usersAPI.unblockUser(999)).rejects.toThrow();
  });
});
