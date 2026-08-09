/**
 * publishReadiness — TASK-P736
 *
 * Pure, UI-agnostic rules for what blocks "Publish" on the listing form.
 *
 * This is the single source of truth for two things that MUST always agree:
 *   1. the toast copy ("add title, price to publish this listing")
 *   2. the scroll target (the first blocking field, in on-screen order)
 *
 * Why this needs to exist outside `zod`:
 *   `listingSchema` (ListingForm.tsx) validates title/price/currency/category/
 *   lat/long, but photos are managed as separate React state — not a form
 *   field — so zod can never see "0 photos". Anything that needs to reason
 *   about "is this listing publish-ready" (the form's onPublish handler,
 *   future screens, tests) should call `getPublishBlockers`, never
 *   re-implement these checks.
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
   * "publish" (default) — every rule applies, including "≥1 photo".
   * "draft" — the photo rule is exempted (a draft may legitimately have zero
   * photos); every other rule still applies. Used by the pure-function tests
   * to document/lock in the draft exemption described in the spec — the
   * screen's actual "Save Draft" button does not call this function at all
   * (it is intentionally left untouched), but "Save" on an already-published
   * listing (editing in place) DOES run the "publish" rules, since a listing
   * that is already live must never be left with zero photos either.
   */
  mode?: "publish" | "draft";
}

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
 * Returns the ordered list of blockers currently preventing Publish.
 * An empty array means the listing is fully publish-ready.
 */
export function getPublishBlockers({
  values,
  photos,
  mode = "publish",
}: GetPublishBlockersInput): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];

  if (mode === "publish" && (!photos || photos.length === 0)) {
    blockers.push("photos");
  }
  if (isBlankTitle(values.title)) {
    blockers.push("title");
  }
  if (!isPositiveFiniteNumber(values.price)) {
    blockers.push("price");
  }
  if (!isPositiveFiniteNumber(values.categoryId)) {
    blockers.push("category");
  }
  if (!isFiniteCoordinate(values.latitude) || !isFiniteCoordinate(values.longitude)) {
    blockers.push("location");
  }

  return blockers;
}
