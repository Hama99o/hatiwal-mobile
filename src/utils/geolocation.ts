import * as Location from "expo-location";

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
 * Cross-platform geolocation via `expo-location` — works on iOS, Android and
 * web from a single code path. On native it shows the OS permission dialog
 * (the usage strings in app.json are required); on web it uses the browser's
 * geolocation prompt.
 *
 * Returns a typed result instead of firing Alert.alert (unreliable on web) so
 * the caller can render the message inline.
 */
export const isGeolocationAvailable = (): boolean => true;

export const getCurrentLocation = async (): Promise<GeoResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { coords: null, error: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
      },
    };
  } catch (error) {
    console.warn("Geolocation error:", error);
    return { coords: null, error: "unavailable" };
  }
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
