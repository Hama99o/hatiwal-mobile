import { Platform } from "react-native";

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type GeoErrorCode = "denied" | "unavailable" | "timeout" | "unsupported";

export interface GeoResult {
  coords: LocationCoords | null;
  error?: GeoErrorCode;
}

/**
 * Cross-platform geolocation using the W3C Geolocation API
 * (`navigator.geolocation`), which is available both in the browser (web) and
 * in the React Native runtime.
 *
 * Returns a typed result instead of firing Alert.alert — Alert is unreliable on
 * react-native-web, so the caller renders the message inline instead.
 */
const geo: Geolocation | undefined =
  typeof navigator !== "undefined" && navigator.geolocation
    ? navigator.geolocation
    : undefined;

export const isGeolocationAvailable = (): boolean => geo !== undefined;

/**
 * On web, when the site's location permission is already "denied" the browser
 * rejects instantly with code 1 and never prompts. Check the Permissions API
 * first (where supported) so we can return a clear, actionable error.
 */
async function isPermissionDenied(): Promise<boolean> {
  try {
    const perms = (navigator as any)?.permissions;
    if (perms?.query) {
      const status = await perms.query({ name: "geolocation" as PermissionName });
      return status.state === "denied";
    }
  } catch {
    /* Permissions API not available — fall through and just try. */
  }
  return false;
}

export const getCurrentLocation = async (): Promise<GeoResult> => {
  if (!geo) return { coords: null, error: "unsupported" };

  if (await isPermissionDenied()) {
    return { coords: null, error: "denied" };
  }

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => {
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const code: GeoErrorCode =
          error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable";
        console.warn(`Geolocation error (code ${error.code}): ${error.message}`);
        resolve({ coords: null, error: code });
      },
      {
        // High accuracy needs real GPS hardware; desktop browsers do better
        // (and avoid spurious failures) with network-based positioning.
        enableHighAccuracy: Platform.OS !== "web",
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
};

// Calculate distance between two coordinates using the Haversine formula (in km)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
