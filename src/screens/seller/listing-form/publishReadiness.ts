/**
 * publishReadiness — TASK-P736, extended by TASK-V395
 *
 * Pure, UI-agnostic rules for what blocks "Publish" — and, since TASK-V395,
 * "Save draft" too — on the listing form.
 *
 * This is the single source of truth for two things that MUST always agree,
 * for BOTH submit paths:
 *   1. the toast copy ("add title, price to publish this listing" /
 *      "add title, price to save this draft")
 *   2. the scroll target (the first blocking field, in on-screen order)
 *
 * The draft contract (TASK-V395) mirrors hatiwal-api's `Listing` model
 * validations exactly (app/models/listing.rb: `title`, `price > 0`,
 * `currency`, `category` — nothing else): a DRAFT only needs title + price +
 * category. Publishing additionally needs ≥1 photo and exact map
 * coordinates (latitude/longitude) — the server is happy to store a
 * pin-less, photo-less draft; only the client enforces the stricter
 * "ready to go live" bar, and only for Publish.
 *
 * Why this needs to exist outside `zod`:
 *   `listingSchema` (ListingForm.tsx) validates title/price/currency/category
 *   unconditionally, and latitude/longitude only loosely (optional — a draft
 *   may have no pin), but photos are managed as separate React state — not a
 *   form field — so zod can never see "0 photos" either way. Anything that
 *   needs to reason about "is this listing publish-ready" or "is this listing
 *   draft-saveable" (the form's onPublish/onSaveDraft handlers, future
 *   screens, tests) should call `getPublishBlockers`, never re-implement
 *   these checks.
 *
 * No React, no RN imports — keep this fully unit-testable in plain Node.
 */

export type PublishBlocker = "photos" | "title" | "price" | "category" | "location";

/**
 * On-screen order of the fields as they appear in ListingForm:
 *   1. Photos
 *   2. Title
 *   3. Price
 *   4. Category
 *   (condition + description are optional — never blockers)
 *   5. Location
 *
 * `getPublishBlockers` always returns blockers in this order, so the first
 * entry is always the correct "scroll to" target.
 */
export const PUBLISH_BLOCKER_ORDER: readonly PublishBlocker[] = [
  "photos",
  "title",
  "price",
  "category",
  "location",
];

export interface PublishReadinessValues {
  title?: string | null;
  price?: number | string | null;
  categoryId?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface GetPublishBlockersInput {
  values: PublishReadinessValues;
  /** Any photo-like array (PhotoItem[] in the screen) — only `.length` matters here. */
  photos: unknown[] | null | undefined;
  /**
   * "publish" (default) — every rule applies, including "≥1 photo" and
   * "exact map coordinates".
   * "draft" (TASK-V395) — the photo rule AND the location rule are exempted
   * (a draft may legitimately have zero photos and no map pin — it mirrors
   * only the backend's `title`/`price`/`currency`/`category` validations);
   * every other rule still applies. The screen's "Save Draft" button calls
   * this function with `mode: "draft"` (both to pre-check before mutating
   * and inside its zod `onInvalid` handler), so a blocked draft always
   * produces the same toast + scroll UX as a blocked Publish — never a
   * silent no-op. "Save" on an already-published listing (editing in place)
   * DOES run the "publish" rules, since a listing that is already live must
   * never be left with zero photos or no coordinates either.
   */
  mode?: "publish" | "draft";
  /**
   * TASK-P736 (review fix) — react-hook-form's `formState.errors`, keyed by
   * field name (only truthiness of each value is read; pass it straight
   * through, e.g. `fieldErrors: errors`). `zod` enforces a couple of rules
   * this file intentionally does NOT re-implement (e.g. title's 150-char
   * cap) — an old or duplicated listing whose title predates that cap can
   * trip the zod resolver's `onInvalid` while every business rule below
   * sees nothing wrong, which previously made `handlePublishBlockers` in
   * ListingForm early-return on an EMPTY blocker list — a genuine
   * validation failure with NO toast and NO scroll. Passing `fieldErrors`
   * here folds any such zod-flagged field into the returned list too, so
   * the `onInvalid` handler can never go silent just because this file's
   * rules and zod's schema rules don't 100% overlap.
   */
  fieldErrors?: Partial<Record<string, unknown>> | null;
}

// Maps a react-hook-form field name to the PublishBlocker it corresponds to
// on-screen — only for fields `getPublishBlockers`'s own rules might not
// independently flag under every possible zod failure (see `fieldErrors`
// above). `currency`/`condition`/`description`/`address` have no destructive
// UI slot on the form (currency/condition are picker-driven and effectively
// never invalid; description/address are optional), so they're intentionally
// not mapped here.
const FIELD_ERROR_TO_BLOCKER: Record<string, PublishBlocker> = {
  title: "title",
  price: "price",
  categoryId: "category",
  latitude: "location",
  longitude: "location",
};

function isBlankTitle(title: PublishReadinessValues["title"]): boolean {
  return typeof title !== "string" || title.trim().length === 0;
}

/** price / categoryId must coerce to a finite number > 0 (mirrors the zod rules). */
function isPositiveFiniteNumber(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** latitude / longitude must coerce to a finite number (mirrors `z.coerce.number().finite()`). */
function isFiniteCoordinate(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return false;
  return Number.isFinite(Number(value));
}

/**
 * Returns the ordered list of blockers currently preventing Publish (or,
 * in "draft" mode, the smaller set of blockers preventing Save draft).
 * An empty array means the listing is ready for that mode.
 */
export function getPublishBlockers({
  values,
  photos,
  mode = "publish",
  fieldErrors,
}: GetPublishBlockersInput): PublishBlocker[] {
  const blockers = new Set<PublishBlocker>();

  if (mode === "publish" && (!photos || photos.length === 0)) {
    blockers.add("photos");
  }
  if (isBlankTitle(values.title)) {
    blockers.add("title");
  }
  if (!isPositiveFiniteNumber(values.price)) {
    blockers.add("price");
  }
  if (!isPositiveFiniteNumber(values.categoryId)) {
    blockers.add("category");
  }
  // TASK-V395 — a draft may legitimately have no map pin yet; only Publish
  // (and "Save" on an already-published listing, which always runs in
  // "publish" mode) requires exact coordinates.
  if (
    mode === "publish" &&
    (!isFiniteCoordinate(values.latitude) || !isFiniteCoordinate(values.longitude))
  ) {
    blockers.add("location");
  }

  // TASK-P736 (review fix) — defensive backstop: fold in any zod-flagged
  // field the rules above don't independently catch (see `fieldErrors` on
  // `GetPublishBlockersInput`), so a genuine zod `onInvalid` can never be
  // silently dropped just because the two rule sets disagree.
  if (fieldErrors) {
    for (const key of Object.keys(fieldErrors)) {
      const mapped = FIELD_ERROR_TO_BLOCKER[key];
      if (mapped && fieldErrors[key]) blockers.add(mapped);
    }
  }

  return PUBLISH_BLOCKER_ORDER.filter((b) => blockers.has(b));
}
