import AsyncStorage from "@react-native-async-storage/async-storage";
import { rememberRoute, saveRouteForRestart, consumeSavedRoute } from "@/lib/routeMemory";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockSet = AsyncStorage.setItem as jest.Mock;
const mockGet = AsyncStorage.getItem as jest.Mock;
const mockRemove = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("routeMemory", () => {
  it("saves the remembered in-app route", async () => {
    rememberRoute("/(main)/(tabs)/chat");
    await saveRouteForRestart();
    expect(mockSet).toHaveBeenCalledWith("restore-route", "/(main)/(tabs)/chat");
  });

  // An auth route would fight bootstrapAuth on the way back up, and restoring
  // the login screen for a user who is now signed in is worse than the default.
  it("does not save a route outside the app shell", async () => {
    rememberRoute("/(auth)/login");
    await saveRouteForRestart();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("returns the saved route and clears it, so it cannot fire twice", async () => {
    mockGet.mockResolvedValueOnce("/(main)/listing/42");
    expect(await consumeSavedRoute()).toBe("/(main)/listing/42");
    expect(mockRemove).toHaveBeenCalledWith("restore-route");
  });

  it("clears a stale non-restorable entry rather than returning it", async () => {
    mockGet.mockResolvedValueOnce("/(auth)/login");
    expect(await consumeSavedRoute()).toBeNull();
    expect(mockRemove).toHaveBeenCalled();
  });

  // A restart must never be blocked by storage: the app still comes back, it
  // just lands on the default route.
  it("survives a storage failure on save", async () => {
    mockSet.mockRejectedValueOnce(new Error("disk full"));
    rememberRoute("/(main)/(tabs)/saved");
    await expect(saveRouteForRestart()).resolves.toBeUndefined();
  });

  it("survives a storage failure on read", async () => {
    mockGet.mockRejectedValueOnce(new Error("nope"));
    expect(await consumeSavedRoute()).toBeNull();
  });
});
