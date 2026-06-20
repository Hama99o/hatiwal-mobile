import { http as mswHttp, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { warningsAPI } from "../warnings";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("warningsAPI.list", () => {
  it("maps warnings + meta to camelCase", async () => {
    server.use(
      mswHttp.get("http://localhost:3007/api/v1/users/warnings", () =>
        HttpResponse.json({
          warnings: [
            {
              id: 1,
              category: "spam",
              reason: "Spam listings",
              created_at: "2026-06-01T00:00:00Z",
              expires_at: "2026-07-01T00:00:00Z",
              acknowledged_at: null,
              active: true,
            },
          ],
          meta: { active_count: 1, threshold: 3 },
        })
      )
    );

    const result = await warningsAPI.list();

    expect(result.activeCount).toBe(1);
    expect(result.threshold).toBe(3);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      reason: "Spam listings",
      expiresAt: "2026-07-01T00:00:00Z",
      active: true,
    });
  });

  it("defaults gracefully when meta is absent", async () => {
    server.use(
      mswHttp.get("http://localhost:3007/api/v1/users/warnings", () =>
        HttpResponse.json({ warnings: [] })
      )
    );

    const result = await warningsAPI.list();
    expect(result.activeCount).toBe(0);
    expect(result.threshold).toBe(0);
    expect(result.warnings).toEqual([]);
  });
});

describe("warningsAPI.markSeen", () => {
  it("PUTs to the mark_seen endpoint", async () => {
    server.use(
      mswHttp.put("http://localhost:3007/api/v1/users/warnings/mark_seen", () =>
        HttpResponse.json({ acknowledged: true })
      )
    );

    await expect(warningsAPI.markSeen()).resolves.toBeUndefined();
  });
});
