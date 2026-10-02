import type { MapCanvasCoords } from "@/components/common/map/MapCanvas.types";
import { DEFAULT_CENTER } from "@/components/common/map/MapCanvas.types";
import { getProvinceByValue } from "@/data/afghan_provinces";

/**
 * Where a map should open when nothing more specific is known (owner's rule,
 * 2026-10-02):
 *   1. GPS, when the user has ALREADY granted location (never prompts), done
 *      by the caller because it is async;
 *   2. otherwise the user's PROFILE address: their saved map point, else the
 *      capital of their province, else of the province named as their city;
 *   3. otherwise Kabul (DEFAULT_CENTER), last.
 * A saved pin (editing a listing, a chosen search area) always wins over all
 * three, and is also the caller's business.
 */

type ProfileLocation = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  city?: string | null;
  province?: string | null;
} | null | undefined;

/** The API serializes coordinates as decimal STRINGS ("34.500000"). */
function toCoord(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** The profile's own point, or its province/city capital; null when the profile says nothing usable. */
export function profileCenter(user: ProfileLocation): MapCanvasCoords | null {
  if (!user) return null;
  const lat = toCoord(user.latitude);
  const lng = toCoord(user.longitude);
  // 0,0 is "never set" in practice, not a place in the Gulf of Guinea.
  if (lat !== null && lng !== null && !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { latitude: lat, longitude: lng };
  }
  const p = getProvinceByValue(user.province) ?? getProvinceByValue(user.city);
  return p ? { latitude: p.lat, longitude: p.lng } : null;
}

/** Profile address, else Kabul: the start point before (optional) GPS refines it. */
export function fallbackCenter(user: ProfileLocation): MapCanvasCoords {
  return profileCenter(user) ?? DEFAULT_CENTER;
}

export function sameCoords(a: MapCanvasCoords, b: MapCanvasCoords): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}
