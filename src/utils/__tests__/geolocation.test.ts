/**
 * Unit tests for src/utils/geolocation.ts
 *
 * Covers:
 *  - calculateDistance: Haversine formula, Earth radius 6371 km
 *    · identical coords → ~0
 *    · known Afghan city pair (Kabul → Jalalabad, ~115 km) within tolerance
 *    · symmetry: distance(a,b) === distance(b,a)
 *  - isGeolocationAvailable: always returns true
 *  - getCurrentLocation:
 *    · 'denied' path — permission denied by requestForegroundPermissionsAsync
 *    · 'unavailable' path — getCurrentPositionAsync throws an error
 *    · does NOT throw — all errors are returned as typed GeoResult
 */

// expo-location must be mocked before the module under test is imported.
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

import * as Location from "expo-location";
import {
  calculateDistance,
  getCurrentLocation,
  isGeolocationAvailable,
} from "../geolocation";

const mockRequestPermissions = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockGetCurrentPosition = Location.getCurrentPositionAsync as jest.Mock;

// ---------------------------------------------------------------------------
// calculateDistance
// ---------------------------------------------------------------------------

describe("calculateDistance", () => {
  it("returns ~0 for identical coordinates", () => {
    const result = calculateDistance(34.5553, 69.2075, 34.5553, 69.2075);
    expect(result).toBeCloseTo(0, 5);
  });

  it("returns approximately 115 km for Kabul → Jalalabad", () => {
    // Kabul: 34.5553, 69.2075
    // Jalalabad: 34.4265, 70.4515
    // Accepted reference distance: ~115 km (allow ±10 km tolerance)
    const dist = calculateDistance(34.5553, 69.2075, 34.4265, 70.4515);
    expect(dist).toBeGreaterThan(105);
    expect(dist).toBeLessThan(125);
  });

  it("is symmetric: distance(a→b) equals distance(b→a)", () => {
    const kabul = { lat: 34.5553, lon: 69.2075 };
    const jalalabad = { lat: 34.4265, lon: 70.4515 };

    const forward = calculateDistance(kabul.lat, kabul.lon, jalalabad.lat, jalalabad.lon);
    const reverse = calculateDistance(jalalabad.lat, jalalabad.lon, kabul.lat, kabul.lon);

    expect(forward).toBeCloseTo(reverse, 8);
  });

  it("uses Earth radius 6371 km (validates a short known distance)", () => {
    // 1 degree of latitude ≈ 111.195 km at the equator (6371 * π / 180)
    // Shift lat by 1 degree on the equator (lon stays 0):
    const dist = calculateDistance(0, 0, 1, 0);
    expect(dist).toBeCloseTo(111.195, 0);
  });
});

// ---------------------------------------------------------------------------
// isGeolocationAvailable
// ---------------------------------------------------------------------------

describe("isGeolocationAvailable", () => {
  it("returns true", () => {
    expect(isGeolocationAvailable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCurrentLocation
// ---------------------------------------------------------------------------

describe("getCurrentLocation", () => {
  beforeEach(() => {
    mockRequestPermissions.mockReset();
    mockGetCurrentPosition.mockReset();
  });

  it("returns error 'denied' when permission is not granted", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "denied" });

    const result = await getCurrentLocation();

    expect(result.coords).toBeNull();
    expect(result.error).toBe("denied");
    // Should not attempt to get the actual position after denial
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it("returns error 'denied' when permission status is 'undetermined'", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "undetermined" });

    const result = await getCurrentLocation();

    expect(result.coords).toBeNull();
    expect(result.error).toBe("denied");
  });

  it("returns error 'unavailable' when getCurrentPositionAsync throws", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetCurrentPosition.mockRejectedValue(new Error("Location unavailable"));

    const result = await getCurrentLocation();

    expect(result.coords).toBeNull();
    expect(result.error).toBe("unavailable");
  });

  it("does NOT throw when permission is denied — returns GeoResult instead", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "denied" });

    // Must resolve, not reject
    await expect(getCurrentLocation()).resolves.toMatchObject({
      coords: null,
      error: "denied",
    });
  });

  it("does NOT throw when position fetch fails — returns GeoResult instead", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetCurrentPosition.mockRejectedValue(new Error("GPS timeout"));

    await expect(getCurrentLocation()).resolves.toMatchObject({
      coords: null,
      error: "unavailable",
    });
  });

  it("returns coords on success", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetCurrentPosition.mockResolvedValue({
      coords: {
        latitude: 34.5553,
        longitude: 69.2075,
        accuracy: 10,
      },
    });

    const result = await getCurrentLocation();

    expect(result.error).toBeUndefined();
    expect(result.coords).toEqual({
      latitude: 34.5553,
      longitude: 69.2075,
      accuracy: 10,
    });
  });

  it("handles null accuracy from native (converts to undefined)", async () => {
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetCurrentPosition.mockResolvedValue({
      coords: {
        latitude: 34.5553,
        longitude: 69.2075,
        accuracy: null,
      },
    });

    const result = await getCurrentLocation();

    expect(result.coords?.accuracy).toBeUndefined();
  });
});
