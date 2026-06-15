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
});
