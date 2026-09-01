import i18n from "@/i18n";
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
// `accept-language` asks for place names in the user's CHOSEN language first (see
// acceptLanguage below) — it used to always ask for Pashto first. Both headers are
// sent on every call.
// Place names come back in the language the USER chose, not always Pashto.
//
// This header was the fixed string "ps,fa,en", so an English-UI user picking a
// location on the map got the label back in Pashto script — e.g. confirming Kabul
// city centre produced "لسمه ناحیه, کابل, کابل ښاروالی" and that is what was then
// shown in the filter row and stored on the listing. Correct for a Pashto user,
// wrong for the other two, and the app's default language is English (CLAUDE.md).
//
// The chosen language goes first and the other two follow, so a name missing in
// one language still resolves instead of coming back empty.
const LANGUAGE_FALLBACKS: Record<string, string> = {
  en: "en,ps,fa",
  ps: "ps,fa,en",
  fa: "fa,ps,en",
};

function acceptLanguage(): string {
  const lang = (i18n.language || "en").split("-")[0];
  return LANGUAGE_FALLBACKS[lang] ?? LANGUAGE_FALLBACKS.en;
}

// Nominatim's usage policy REQUIRES a descriptive User-Agent (see above), so the
// headers are built per call rather than being a frozen constant.
function nominatimHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": "Hatiwal/1.0 (https://hatiwal.com)",
    "Accept-Language": acceptLanguage(),
  };
}

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
    `&accept-language=${acceptLanguage()}&countrycodes=af&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { headers: nominatimHeaders() });
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
  longitude: number,
  options?: {
    /**
     * True when the result will be PERSISTED on a listing rather than shown
     * once in this user's own UI.
     *
     * The header above asks for names in the user's chosen language, which is
     * right for a label they read immediately (the filter row, the picker's own
     * confirmation). It is wrong for a STORED address, because that string is
     * then shown to every other viewer in whatever language its creator
     * happened to be using: a real listing in production reads
     * "لسمه ناحیه، کابل، کابل شاروالي." on the ENGLISH page, and another shows
     * the city as "پاريس" — unreadable to two thirds of a three-locale
     * audience, and a Dari buyer cannot tell a Pashto street name from a typo.
     *
     * So a stored address asks for English FIRST (the app's default language,
     * per CLAUDE.md), with ps/fa as fallbacks so a place missing an English
     * name still resolves instead of coming back empty. The city label shown in
     * the UI stays localized — this only affects the free-text address.
     */
    canonical?: boolean;
  }
): Promise<string | null> {
  const lang = options?.canonical ? "en,ps,fa" : acceptLanguage();
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&zoom=14&addressdetails=0` +
    `&accept-language=${lang}&lat=${latitude}&lon=${longitude}`;
  try {
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.display_name) return null;
    const { label, detail } = shorten(String(data.display_name));
    return detail ? `${label}, ${detail}` : label;
  } catch {
    return null;
  }
}
