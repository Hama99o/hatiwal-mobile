import { http as mswHttp, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { http, blockedNoticeFromResponse } from "../http";
import { useAuthStore } from "@/stores/auth.store";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("blockedNoticeFromResponse", () => {
  it("detects a banned 403 with a reason", () => {
    expect(blockedNoticeFromResponse(403, { status: "banned", reason: "Spam" })).toEqual({
      status: "banned",
      reason: "Spam",
    });
  });

  it("detects a suspended 403 with no reason", () => {
    expect(blockedNoticeFromResponse(403, { status: "suspended" })).toEqual({
      status: "suspended",
      reason: null,
    });
  });

  it("ignores non-403 responses", () => {
    expect(blockedNoticeFromResponse(401, { status: "banned" })).toBeNull();
  });

  it("ignores a 403 that is not a block (e.g. plain Forbidden)", () => {
    expect(blockedNoticeFromResponse(403, { error: "Forbidden" })).toBeNull();
  });
});

describe("http interceptor on a blocked response", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({ id: 1 } as never);
    useAuthStore.getState().setBlockedNotice(null);
  });

  it("clears the session and records a blocked notice", async () => {
    server.use(
      mswHttp.get("http://localhost:3007/api/v1/users/me", () =>
        HttpResponse.json(
          { error: "account_banned", status: "banned", reason: "Fraud" },
          { status: 403 }
        )
      )
    );

    await expect(http.get("/users/me")).rejects.toBeDefined();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().blockedNotice).toEqual({ status: "banned", reason: "Fraud" });
  });

  it("leaves the session alone on an ordinary 403", async () => {
    server.use(
      mswHttp.get("http://localhost:3007/api/v1/users/me", () =>
        HttpResponse.json({ error: "Forbidden" }, { status: 403 })
      )
    );

    await expect(http.get("/users/me")).rejects.toBeDefined();
    expect(useAuthStore.getState().blockedNotice).toBeNull();
  });
});
