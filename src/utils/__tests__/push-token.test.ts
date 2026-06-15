/**
 * Unit tests for src/utils/push-token.ts
 *
 * All native modules (expo-notifications, expo-constants, AsyncStorage,
 * authAPI) are mocked so tests run in a pure JS environment.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        eas: { projectId: "test-project-id" },
      },
    },
    easConfig: null,
  },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("@/api/auth", () => ({
  authAPI: {
    updateMe: jest.fn().mockResolvedValue({}),
  },
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import * as Notifications from "expo-notifications";
import { authAPI } from "@/api/auth";
import { registerPushToken, clearCachedPushToken } from "../push-token";

const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetExpoPushToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockUpdateMe = authAPI.updateMe as jest.Mock;
const STORAGE_KEY = "hatiwal_push_token";

describe("registerPushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it("returns null silently when permission is denied", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "denied" });

    const result = await registerPushToken();

    expect(result).toBeNull();
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it("registers the token and stores it when permission is granted and no cached token exists", async () => {
    const token = "ExponentPushToken[test-abc-123]";
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockResolvedValue({ data: token });

    const result = await registerPushToken();

    expect(result).toBe(token);
    expect(mockUpdateMe).toHaveBeenCalledWith({ pushToken: token });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, token);
  });

  it("skips the PUT call when the cached token matches the current token", async () => {
    const token = "ExponentPushToken[unchanged-token]";
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockResolvedValue({ data: token });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(token);

    const result = await registerPushToken();

    expect(result).toBe(token);
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it("sends the new token and updates cache when the token has rotated", async () => {
    const oldToken = "ExponentPushToken[old-token]";
    const newToken = "ExponentPushToken[new-token]";
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockResolvedValue({ data: newToken });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(oldToken);

    const result = await registerPushToken();

    expect(result).toBe(newToken);
    expect(mockUpdateMe).toHaveBeenCalledWith({ pushToken: newToken });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, newToken);
  });

  it("returns null silently when getExpoPushTokenAsync throws (e.g. simulator)", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockRejectedValue(
      new Error("projectId is required to retrieve an Expo push token")
    );

    const result = await registerPushToken();

    expect(result).toBeNull();
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it("returns null silently when updateMe throws a network error", async () => {
    const token = "ExponentPushToken[network-fail]";
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetExpoPushToken.mockResolvedValue({ data: token });
    mockUpdateMe.mockRejectedValue(new Error("Network Error"));

    const result = await registerPushToken();

    expect(result).toBeNull();
  });
});

describe("clearCachedPushToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it("removes the push token from AsyncStorage", async () => {
    await clearCachedPushToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("resolves without throwing when AsyncStorage.removeItem fails", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(
      new Error("Storage unavailable")
    );
    await expect(clearCachedPushToken()).resolves.toBeUndefined();
  });
});
