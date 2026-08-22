/**
 * `hasLocationPermission` / `getCurrentLocationIfPermitted` — the pair that lets
 * a screen centre on the user BY DEFAULT without ever prompting.
 *
 * Why they exist: LocationRangePicker always opened at DEFAULT_CENTER, which is
 * Kabul city centre, and "Use my location" was the only way to move it. A seller
 * in Herat or Kandahar who had ALREADY granted permission still got a Kabul pin,
 * and if they did not notice they published a listing pinned to the wrong city —
 * a data bug on a marketplace where buyers filter by area and meet in person.
 *
 * The no-prompt guarantee is the whole point. Firing the OS permission dialog
 * because a sheet opened is worse than the bug it fixes, and a dialog shown at
 * the wrong moment gets denied — which then poisons the setting for the button
 * that legitimately asks.
 */
import * as Location from "expo-location";
import {
  hasLocationPermission,
  getCurrentLocationIfPermitted,
} from "../geolocation";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const mockLoc = Location as unknown as {
  getForegroundPermissionsAsync: jest.Mock;
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};

beforeEach(() => jest.clearAllMocks());

describe("hasLocationPermission", () => {
  it("is true when already granted", async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    await expect(hasLocationPermission()).resolves.toBe(true);
  });

  it.each(["denied", "undetermined"])("is false when %s", async (status) => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status });
    await expect(hasLocationPermission()).resolves.toBe(false);
  });

  it("is false — not a throw — when the check itself fails", async () => {
    mockLoc.getForegroundPermissionsAsync.mockRejectedValue(new Error("no provider"));
    await expect(hasLocationPermission()).resolves.toBe(false);
  });

  // THE GUARANTEE: it must never show the OS dialog.
  it("never calls requestForegroundPermissionsAsync", async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    await hasLocationPermission();
    expect(mockLoc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("getCurrentLocationIfPermitted", () => {
  it("returns coords when permission is already granted", async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLoc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 34.34, longitude: 62.2, accuracy: 10 },
    });

    await expect(getCurrentLocationIfPermitted()).resolves.toEqual({
      latitude: 34.34,
      longitude: 62.2,
      accuracy: 10,
    });
  });

  it("returns null WITHOUT prompting when permission is not granted", async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status: "undetermined" });

    await expect(getCurrentLocationIfPermitted()).resolves.toBeNull();
    expect(mockLoc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLoc.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("returns null when the fix itself fails, so the caller keeps its default", async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockLoc.getCurrentPositionAsync.mockRejectedValue(new Error("timeout"));

    await expect(getCurrentLocationIfPermitted()).resolves.toBeNull();
  });
});
