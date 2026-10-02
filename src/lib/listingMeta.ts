/**
 * Compact meta for listing cards: "2d · 10th District, Kabul".
 * Pattern from Nextdoor / Facebook Marketplace (docs/design/LISTING_CARDS.md).
 */

/**
 * Shortens a reverse-geocoded location for a card. The server string often
 * repeats itself ("10th District, Kabul, Kabul District"), which filled the
 * card's one meta line with the same city twice. Parts whose name repeats an
 * earlier part (ignoring a trailing "District" / "Province" and their Dari and
 * Pashto words) are dropped, then at most `maxParts` are kept.
 */
export function shortLocation(location: string | null | undefined, maxParts = 2): string | null {
  if (!location) return null;
  const parts = location
    .split(/\s*[,،]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const part of parts) {
    const key = part
      .toLowerCase()
      .replace(/\b(district|province)\b/g, "")
      .replace(/(ولسوالی|ولسوالۍ|ولایت|ناحیه|ناحیې)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (key && seen.has(key)) continue;
    seen.add(key);
    kept.push(part);
  }
  return kept.slice(0, maxParts).join(", ") || null;
}

export type AgoUnit = "now" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";

/** How long ago `date` was, as one unit + count — the caller translates it. */
export function agoParts(
  date: string | Date | null | undefined,
  now: Date = new Date()
): { unit: AgoUnit; n: number } | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (Number.isNaN(secs)) return null;
  if (secs < 60) return { unit: "now", n: 0 };
  const mins = Math.floor(secs / 60);
  if (mins < 60) return { unit: "minutes", n: mins };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { unit: "hours", n: hours };
  const days = Math.floor(hours / 24);
  if (days < 7) return { unit: "days", n: days };
  if (days < 30) return { unit: "weeks", n: Math.floor(days / 7) };
  if (days < 365) return { unit: "months", n: Math.floor(days / 30) };
  return { unit: "years", n: Math.floor(days / 365) };
}
