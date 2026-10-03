/**
 * reloadApp must reload through EXPO, not react-native-restart.
 *
 * QA 2026-10-03: after RNRestart on Android, Expo modules that launch an
 * Activity for a result (the image picker) were left with an unregistered
 * launcher, so after any language or theme change "Gallery" on Create Listing
 * did nothing. These tests pin the fix: Expo's reload first, RNRestart only as
 * the fallback, and nothing at all in Expo Go.
 */
const mockReloadAppAsync = jest.fn();
const mockRestart = jest.fn();
let mockExecutionEnvironment = "standalone";

jest.mock("expo", () => ({ reloadAppAsync: (...a: unknown[]) => mockReloadAppAsync(...a) }));
jest.mock("react-native-restart", () => ({ __esModule: true, default: { restart: () => mockRestart() } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone", Bare: "bare" },
  default: {
    get executionEnvironment() {
      return mockExecutionEnvironment;
    },
  },
}));

import { reloadApp } from "@/lib/reloadApp";

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  mockReloadAppAsync.mockReset();
  mockRestart.mockReset();
  mockExecutionEnvironment = "standalone";
});

it("reloads through Expo, so Expo modules re-register their activity launchers", async () => {
  mockReloadAppAsync.mockResolvedValue(undefined);
  reloadApp();
  await flush();
  expect(mockReloadAppAsync).toHaveBeenCalledTimes(1);
  expect(mockRestart).not.toHaveBeenCalled();
});

it("falls back to react-native-restart only when Expo's reload fails", async () => {
  mockReloadAppAsync.mockRejectedValue(new Error("unavailable"));
  reloadApp();
  await flush();
  expect(mockRestart).toHaveBeenCalledTimes(1);
});

it("never throws when both reloads fail — the change applies on next launch", async () => {
  mockReloadAppAsync.mockRejectedValue(new Error("unavailable"));
  mockRestart.mockImplementation(() => {
    throw new Error("no native module");
  });
  expect(() => reloadApp()).not.toThrow();
  await flush();
});

it("is a no-op in Expo Go", async () => {
  mockExecutionEnvironment = "storeClient";
  reloadApp();
  await flush();
  expect(mockReloadAppAsync).not.toHaveBeenCalled();
  expect(mockRestart).not.toHaveBeenCalled();
});
