/**
 * Free-text place search (forward geocoding) and reverse geocoding via
 * OpenStreetMap Nominatim — keyless and covers villages, towns, landmarks and
 * marketplaces, not just the 34 provinces.
 *
 * Results are scoped to Afghanistan (countrycodes=af). Nominatim allows CORS
 * (works in the browser) and React Native fetch. For production-scale traffic a
 * dedicated geocoding provider with an API key should replace this.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy REQUIRES a descriptive User-Agent identifying the
// app — requests without one are rejected (which is why search returned nothing
// on a native build, while the browser worked because it sends its own UA).
// `accept-language` asks for place names in Pashto/Dari first, then English, so
// results and labels are localized for Afghan users. Both are sent on every call.
const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Hatiwal/1.0 (https://hatiwal.multimagics.com)",
  "Accept-Language": "ps,fa,en",
};

export interface GeocodeResult {
  label: string; // short, human-friendly name (e.g. "Jalalabad")
  detail: string; // fuller context (e.g. "Nangarhar, Afghanistan")
  latitude: number;
  longitude: number;
}

function shorten(displayName: string): { label: string; detail: string } {
  const parts = displayName.split(",").map((p) => p.trim());
  return {
    label: parts[0] ?? displayName,
    detail: parts.slice(1, 3).join(", "),
  };
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=0&limit=8` +
    `&accept-language=ps,fa,en&countrycodes=af&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((d: any) => {
      const { label, detail } = shorten(String(d.display_name ?? ""));
      return {
        label,
        detail,
        latitude: parseFloat(d.lat),
        longitude: parseFloat(d.lon),
      };
    });
  } catch {
    return [];
  }
}

/** Turn coordinates into a readable place name (used after dropping a pin). */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&zoom=14&addressdetails=0` +
    `&accept-language=ps,fa,en&lat=${latitude}&lon=${longitude}`;
  try {
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.display_name) return null;
    const { label, detail } = shorten(String(data.display_name));
    return detail ? `${label}, ${detail}` : label;
  } catch {
    return null;
  }
}
