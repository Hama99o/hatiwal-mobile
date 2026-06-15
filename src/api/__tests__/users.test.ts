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
