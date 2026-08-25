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
 * "live" mode (TASK-P736, review fix, cross-client contract) — saving an
 * ALREADY-active listing in place. This must NOT simply reuse the "publish"
 * rule set: hatiwal-web's listing form (and the API's `publish?` policy)
 * never required a photo or exact coordinates, so a listing published from
 * the web (or a legacy mobile listing from before this card) can be
 * photo-less and/or pin-less and still be genuinely live server-side. If
 * "live" hard-required both like "publish" does, a seller opening that
 * listing on mobile just to fix a typo in the title would be PERMANENTLY
 * blocked from saving ANY edit until they also backfilled a photo and
 * dropped a map pin — punishing them for something they never regressed.
 * So "live" only enforces what the mobile client itself would be
 * regressing in THIS session:
 *   - photos: required only if `hadPhotosPreEdit` is true (the listing HAD
 *     ≥1 photo when this edit session started) — i.e. the seller may not
 *     strip a live listing down to zero photos, but isn't forced to add one
 *     to a listing that never had any.
 *   - location: never required — dropped entirely for "live", matching the
 *     web form and the API policy exactly.
 * Every other rule (title/price/category) still applies unconditionally —
 * a live listing can never be left with a blank title either.
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
   * silent no-op.
   * "live" (TASK-P736, review fix, cross-client contract) — "Save" on an
   * ALREADY-active listing. The location rule is always exempted (dropped
   * entirely, matching hatiwal-web + the API policy). The photo rule is
   * exempted UNLESS `hadPhotosPreEdit` is true — see that field's doc and
   * the file header for why "publish"'s rules can't just be reused here.
   */
  mode?: "publish" | "draft" | "live";
  /**
   * TASK-P736 (review fix, cross-client contract) — only meaningful when
   * `mode: "live"`: whether the listing already had ≥1 photo when this edit
   * session started (i.e. BEFORE any photo the seller just removed in this
   * session). When true, "live" requires ≥1 photo (the seller may not strip
   * a live listing down to zero); when false/omitted, "live" never reports
   * "photos" — a listing that was already photo-less server-side (e.g.
   * created via hatiwal-web, which has no photo requirement) isn't blocked
   * from an unrelated edit just because it has no photo.
   */
  hadPhotosPreEdit?: boolean;
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
  hadPhotosPreEdit = false,
  fieldErrors,
}: GetPublishBlockersInput): PublishBlocker[] {
  const blockers = new Set<PublishBlocker>();

  // TASK-P736 (review fix, cross-client contract) — "publish" always
  // requires a photo; "live" only requires one if the listing already had
  // one before this edit session (see `hadPhotosPreEdit`'s doc); "draft"
  // never requires one.
  const requiresPhoto = mode === "publish" || (mode === "live" && hadPhotosPreEdit);
  if (requiresPhoto && (!photos || photos.length === 0)) {
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
  // requires exact coordinates. TASK-P736 (review fix, cross-client
  // contract) — "live" no longer requires them either: hatiwal-web's form
  // and the API's publish policy never did, so a web-created or legacy
  // pin-less active listing must stay editable on mobile.
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

/**
 * The blocker -> short field-name key map, and the per-mode toast key.
 *
 * These lived inside ListingForm, which meant only that screen could phrase
 * "you cannot publish yet, and here is what is missing". `useListingLifecycle`
 * — the hook behind the Publish button on the owner-detail screen and the
 * seller card — had no readiness check at all: it offered Publish on any draft,
 * fired the request, and let the API's own `photo_required_to_publish` come
 * back 422, surfaced only as a ~3s toast. QA caught the whole path:
 * `PUT /my/listings/505/publish -> 422` while the screen sat on "Draft" with
 * the Publish button still sitting there.
 */
const BLOCKER_LABEL_KEY: Record<PublishBlocker, string> = {
  photos: "common.photos",
  title: "listing.title",
  price: "common.price",
  category: "common.category",
  location: "common.location",
};

export type PublishBlockerMode = "publish" | "draft" | "live";

const TOAST_KEY: Record<PublishBlockerMode, string> = {
  publish: "listing.form.publishBlocked",
  draft: "listing.form.draftBlocked",
  live: "listing.form.liveBlocked",
};

/**
 * Build the user-facing "cannot publish yet" message for a blocker list.
 *
 * `common.listSeparator` is "، " for ps/fa and ", " for en, so the join always
 * uses the locale's own list punctuation — a bare Latin ", " between RTL runs
 * invites bidi-reordering artifacts and reads wrong.
 *
 * `t` is passed in so this file keeps its "no React, no RN imports" promise and
 * stays unit-testable in plain Node.
 */
export function publishBlockedMessage(
  blockers: PublishBlocker[],
  mode: PublishBlockerMode,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const fields = blockers
    .map((b) => t(BLOCKER_LABEL_KEY[b]))
    .join(t("common.listSeparator"));
  return t(TOAST_KEY[mode], { fields });
}
