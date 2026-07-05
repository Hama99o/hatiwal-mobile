/**
 * meetupBody — pure helpers for encoding/decoding the free-form `body` string
 * used by `kind: "meetup_proposal"` messages.
 *
 * Format (backward compatible, no backend/schema change):
 *   "<place> | <time>"                     — legacy 2-part (always supported)
 *   "<place> | <time> | <lat>,<long>"      — 3-part, appended only when the
 *                                             proposer pinned an exact spot
 *
 * `parseMeetupBody` tolerates missing/malformed input: a bad or missing 3rd
 * part simply yields `coords: null` (falls back to legacy text-only display).
 */

export interface MeetupCoords {
  lat: number;
  long: number;
}

export interface ParsedMeetupBody {
  place: string;
  time: string;
  coords: MeetupCoords | null;
}

/**
 * Builds the message body for a meetup proposal.
 * Appends "| <lat>,<long>" only when `coords` is a valid finite pair —
 * otherwise the body is the plain legacy "place | time" string.
 */
export function encodeMeetupBody(
  place: string,
  time: string,
  coords?: MeetupCoords | null
): string {
  const base = `${place} | ${time}`;
  if (
    coords &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.long)
  ) {
    return `${base} | ${coords.lat},${coords.long}`;
  }
  return base;
}

/**
 * Parses a meetup_proposal message body. Tolerates:
 *  - the legacy 2-part "place | time" format (coords: null)
 *  - the 3-part "place | time | lat,long" format
 *  - malformed/garbage 3rd parts (falls back to coords: null)
 *  - empty/null body (returns empty place/time, coords: null)
 */
export function parseMeetupBody(body: string | null | undefined): ParsedMeetupBody {
  const raw = body ?? "";
  const parts = raw.split("|").map((s) => s.trim());
  const place = parts[0] ?? raw;
  const time = parts[1] ?? "";

  let coords: MeetupCoords | null = null;
  if (parts.length >= 3 && parts[2]) {
    const coordParts = parts[2].split(",").map((s) => s.trim());
    if (coordParts.length === 2) {
      const lat = Number(coordParts[0]);
      const long = Number(coordParts[1]);
      if (Number.isFinite(lat) && Number.isFinite(long)) {
        coords = { lat, long };
      }
    }
  }

  return { place, time, coords };
}
