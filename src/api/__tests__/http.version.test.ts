import { http, clientVersionHeaders } from "../http";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "9.8.7" } },
}));

describe("client version headers", () => {
  it("reports the app.json version and the platform", () => {
    expect(clientVersionHeaders()).toEqual({ "X-App-Version": "9.8.7", "X-App-Platform": expect.any(String) });
  });

  it("are sent on every request by default", () => {
    const headers = http.defaults.headers as unknown as Record<string, string>;
    expect(headers["X-App-Version"]).toBe("9.8.7");
    expect(headers["X-App-Platform"]).toBeTruthy();
  });
});
