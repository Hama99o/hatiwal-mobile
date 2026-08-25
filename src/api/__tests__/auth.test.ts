import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { authAPI } from "../auth";
import { MOCK_USER } from "../../__tests__/mocks/handlers";

// secureStorage is mocked via the jest.mock in setup.ts (expo-secure-store)
jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("authAPI.login", () => {
  it("returns camelCased user on success", async () => {
    const user = await authAPI.login({ email: "buyer@hatiwal.test", password: "Password123!" });
    expect(user.email).toBe("buyer@hatiwal.test");
    expect(user.fullName).toBe("Ahmad Karimi");
    expect(user.preferredLanguage).toBe("en");
    expect(user.avatarUrl).toBeNull();
  });

  it("throws on 401 invalid credentials", async () => {
    server.use(
      http.post("http://localhost:3007/api/v1/auth/sign_in", () =>
        HttpResponse.json({ errors: ["Invalid credentials"] }, { status: 401 })
      )
    );
    await expect(authAPI.login({ email: "x@test.com", password: "wrong" })).rejects.toThrow();
  });
});

describe("authAPI.register", () => {
  it("returns camelCased user on success", async () => {
    const user = await authAPI.register({
      email: "buyer@hatiwal.test",
      password: "Password123!",
      passwordConfirmation: "Password123!",
      firstname: "Ahmad",
      lastname: "Karimi",
    });
    expect(user.id).toBe(1);
    expect(user.firstname).toBe("Ahmad");
  });

  it("sends preferred_language, snake_cased, when the caller passes one", async () => {
    // `preferred_language` defaults to "ps" in the database, so omitting it made
    // every new account Pashto and flipped the app's language AND direction the
    // moment it was created — after a sign-up completed entirely in English.
    let capturedBody: any;
    server.use(
      http.post("http://localhost:3007/api/v1/auth/", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: MOCK_USER });
      })
    );
    await authAPI.register({
      email: "new@hatiwal.test",
      password: "Password123!",
      passwordConfirmation: "Password123!",
      firstname: "Ahmad",
      lastname: "Karimi",
      preferredLanguage: "en",
    });
    expect(capturedBody.preferred_language).toBe("en");
  });

  it("throws on 422 validation error", async () => {
    server.use(
      http.post("http://localhost:3007/api/v1/auth/", () =>
        HttpResponse.json({ errors: { email: ["already taken"] } }, { status: 422 })
      )
    );
    await expect(
      authAPI.register({
        email: "taken@test.com",
        password: "Password123!",
        passwordConfirmation: "Password123!",
        firstname: "A",
        lastname: "B",
      })
    ).rejects.toThrow();
  });
});

describe("authAPI.logout", () => {
  it("resolves without error", async () => {
    await expect(authAPI.logout()).resolves.toBeUndefined();
  });
});

describe("authAPI.deleteAccount", () => {
  it("calls DELETE /auth and resolves", async () => {
    server.use(
      http.delete("http://localhost:3007/api/v1/auth", () =>
        HttpResponse.json({ status: "success" }, { status: 200 })
      )
    );
    await expect(authAPI.deleteAccount()).resolves.toBeUndefined();
  });
});

describe("authAPI.restoreAccount", () => {
  it("calls POST /users/me/restore and returns the restored user", async () => {
    server.use(
      http.post("http://localhost:3007/api/v1/users/me/restore", () =>
        HttpResponse.json(
          { user: { id: 1, email: "buyer@hatiwal.test", firstname: "A", lastname: "B", deletion_scheduled_at: null } },
          { status: 200 }
        )
      )
    );
    const user = await authAPI.restoreAccount();
    expect(user.id).toBe(1);
    expect(user.deletionScheduledAt).toBeNull();
  });
});

describe("authAPI.me", () => {
  it("returns camelCased user", async () => {
    const user = await authAPI.me();
    expect(user.email).toBe("buyer@hatiwal.test");
    expect(user.sellerMode).toBe(false);
  });
});

describe("authAPI.validateToken", () => {
  it("returns camelCased user when token is valid", async () => {
    const user = await authAPI.validateToken();
    expect(user.id).toBe(1);
  });

  it("throws 401 when token is invalid", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/auth/validate_token", () =>
        HttpResponse.json({ errors: ["Unauthorized"] }, { status: 401 })
      )
    );
    await expect(authAPI.validateToken()).rejects.toThrow();
  });
});

describe("authAPI.updateMe", () => {
  it("sends snake_case body and returns camelCased user", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("http://localhost:3007/api/v1/users/me", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ user: { ...MOCK_USER, firstname: "NewName" } });
      })
    );
    const user = await authAPI.updateMe({ firstname: "NewName" });
    expect(user.firstname).toBe("NewName");
    // Body should be snake_case wrapped in `user`
    expect((capturedBody as any).user.firstname).toBe("NewName");
  });

  it("sends away_until (snake_case) when awayUntil is provided", async () => {
    const futureDate = "2026-08-01T23:59:59.000Z";
    let capturedBody: unknown;
    server.use(
      http.put("http://localhost:3007/api/v1/users/me", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          user: { ...MOCK_USER, away_until: futureDate, is_away: true },
        });
      })
    );
    const user = await authAPI.updateMe({ awayUntil: futureDate });
    // Body must have snake_case key
    expect((capturedBody as any).user.away_until).toBe(futureDate);
    // Response is camelCased
    expect(user.awayUntil).toBe(futureDate);
    expect(user.isAway).toBe(true);
  });

  it("sends away_until: null (to clear) when awayUntil is null", async () => {
    let capturedBody: unknown;
    server.use(
      http.put("http://localhost:3007/api/v1/users/me", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          user: { ...MOCK_USER, away_until: null, is_away: false },
        });
      })
    );
    const user = await authAPI.updateMe({ awayUntil: null });
    // Explicit null must be sent so the backend clears the column
    expect((capturedBody as any).user).toHaveProperty("away_until");
    expect((capturedBody as any).user.away_until).toBeNull();
    expect(user.isAway).toBe(false);
    expect(user.awayUntil).toBeNull();
  });
});
