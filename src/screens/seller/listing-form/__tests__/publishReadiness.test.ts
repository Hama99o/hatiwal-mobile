/**
 * publishReadiness unit tests — TASK-P736, extended by TASK-V395
 *
 * Covers:
 *  1. Ordering — blockers always come back in on-screen order
 *     (photos → title → price → category → location), regardless of the
 *     order fields become invalid in.
 *  2. The photo rule — 0 photos blocks Publish; ≥1 photo does not.
 *  3. The draft exemption (TASK-V395) — mode: "draft" never reports "photos"
 *     OR "location", even with zero photos and no coordinates, while every
 *     other rule (title/price/category) still applies. This mirrors
 *     hatiwal-api's Listing validations exactly (title/price/currency/
 *     category — no photo or location requirement at the model level).
 *  4. Individual field rules (title/price/category/location) match the zod
 *     schema's semantics (coerced numbers, positive, finite).
 *  5. A fully valid listing returns an empty array in both modes.
 */

import { getPublishBlockers, PUBLISH_BLOCKER_ORDER, PublishBlocker } from "../publishReadiness";

const validValues = {
  title: "Lenovo ThinkPad X1 Carbon",
  price: 85000,
  categoryId: 3,
  latitude: 34.5,
  longitude: 69.1,
};

const onePhoto = [{ uri: "file:///photo1.jpg" }];

describe("getPublishBlockers — a fully valid listing", () => {
  it("returns an empty array when every field and photos are present", () => {
    expect(getPublishBlockers({ values: validValues, photos: onePhoto })).toEqual([]);
  });
});

describe("getPublishBlockers — ordering", () => {
  it("always returns blockers in on-screen order (photos, title, price, category, location)", () => {
    // Every rule fails at once — the returned order must match PUBLISH_BLOCKER_ORDER exactly.
    const blockers = getPublishBlockers({
      values: { title: "", price: null, categoryId: null, latitude: null, longitude: null },
      photos: [],
    });
    expect(blockers).toEqual(PUBLISH_BLOCKER_ORDER);
  });

  it("keeps on-screen order even when only the later fields are invalid", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, categoryId: null, latitude: null, longitude: null },
      photos: onePhoto,
    });
    expect(blockers).toEqual<PublishBlocker[]>(["category", "location"]);
  });

  it("puts photos first whenever photos are missing, even if other fields are also missing", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, title: "" },
      photos: [],
    });
    expect(blockers[0]).toBe("photos");
    expect(blockers).toEqual<PublishBlocker[]>(["photos", "title"]);
  });
});

describe("getPublishBlockers — the photo rule", () => {
  it("blocks when photos is an empty array", () => {
    expect(getPublishBlockers({ values: validValues, photos: [] })).toContain("photos");
  });

  it("blocks when photos is null/undefined", () => {
    expect(getPublishBlockers({ values: validValues, photos: null })).toContain("photos");
    expect(getPublishBlockers({ values: validValues, photos: undefined })).toContain("photos");
  });

  it("does not block once at least one photo is present", () => {
    expect(getPublishBlockers({ values: validValues, photos: onePhoto })).not.toContain("photos");
  });

  it("does not care how many photos there are beyond one", () => {
    const manyPhotos = [{ uri: "a" }, { uri: "b" }, { uri: "c" }];
    expect(getPublishBlockers({ values: validValues, photos: manyPhotos })).not.toContain("photos");
  });
});

describe("getPublishBlockers — the draft exemption", () => {
  it("never reports 'photos' in draft mode, even with zero photos", () => {
    const blockers = getPublishBlockers({ values: validValues, photos: [], mode: "draft" });
    expect(blockers).not.toContain("photos");
    expect(blockers).toEqual([]);
  });

  it("never reports 'location' in draft mode, even with no coordinates (TASK-V395)", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, latitude: undefined, longitude: undefined },
      photos: [],
      mode: "draft",
    });
    expect(blockers).not.toContain("location");
    expect(blockers).toEqual([]);
  });

  it("a draft with title + price + category, zero photos, and no pin is fully saveable (TASK-V395)", () => {
    // Mirrors hatiwal-api's Listing validations exactly — no photo or
    // location requirement at the model level.
    const blockers = getPublishBlockers({
      values: { title: "Sofa Set", price: 500, categoryId: 3 },
      photos: [],
      mode: "draft",
    });
    expect(blockers).toEqual([]);
  });

  it("still enforces every other rule in draft mode", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, title: "" },
      photos: [],
      mode: "draft",
    });
    expect(blockers).toEqual<PublishBlocker[]>(["title"]);
  });

  it("blocks title, price, AND category together in draft mode, in on-screen order, while never listing photos/location", () => {
    const blockers = getPublishBlockers({
      values: { title: "", price: undefined, categoryId: undefined, latitude: undefined, longitude: undefined },
      photos: [],
      mode: "draft",
    });
    expect(blockers).toEqual<PublishBlocker[]>(["title", "price", "category"]);
  });

  it("defaults to publish mode (photos AND location required) when mode is omitted", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, latitude: undefined, longitude: undefined },
      photos: [],
    });
    expect(blockers).toContain("photos");
    expect(blockers).toContain("location");
  });
});

describe("getPublishBlockers — title rule", () => {
  it("blocks a missing title", () => {
    expect(getPublishBlockers({ values: { ...validValues, title: undefined }, photos: onePhoto })).toContain("title");
  });

  it("blocks a blank/whitespace-only title", () => {
    expect(getPublishBlockers({ values: { ...validValues, title: "   " }, photos: onePhoto })).toContain("title");
  });

  it("does not block a non-empty title", () => {
    expect(getPublishBlockers({ values: { ...validValues, title: "Sofa" }, photos: onePhoto })).not.toContain("title");
  });
});

describe("getPublishBlockers — price rule", () => {
  it("blocks a missing price", () => {
    expect(getPublishBlockers({ values: { ...validValues, price: undefined }, photos: onePhoto })).toContain("price");
  });

  it("blocks a zero or negative price", () => {
    expect(getPublishBlockers({ values: { ...validValues, price: 0 }, photos: onePhoto })).toContain("price");
    expect(getPublishBlockers({ values: { ...validValues, price: -5 }, photos: onePhoto })).toContain("price");
  });

  it("accepts a numeric string price (API may return decimals as strings)", () => {
    expect(getPublishBlockers({ values: { ...validValues, price: "500.0" }, photos: onePhoto })).not.toContain("price");
  });
});

describe("getPublishBlockers — category rule", () => {
  it("blocks a missing categoryId", () => {
    expect(getPublishBlockers({ values: { ...validValues, categoryId: undefined }, photos: onePhoto })).toContain("category");
  });

  it("accepts a numeric string categoryId", () => {
    expect(getPublishBlockers({ values: { ...validValues, categoryId: "3" }, photos: onePhoto })).not.toContain("category");
  });
});

describe("getPublishBlockers — location rule", () => {
  it("blocks when latitude is missing", () => {
    expect(getPublishBlockers({ values: { ...validValues, latitude: undefined }, photos: onePhoto })).toContain("location");
  });

  it("blocks when longitude is missing", () => {
    expect(getPublishBlockers({ values: { ...validValues, longitude: undefined }, photos: onePhoto })).toContain("location");
  });

  it("accepts decimal-string coordinates (API returns decimal columns as strings)", () => {
    expect(
      getPublishBlockers({ values: { ...validValues, latitude: "34.5", longitude: "69.1" }, photos: onePhoto })
    ).not.toContain("location");
  });

  it("blocks a pin-less listing in publish mode even when every other field is valid (TASK-V395)", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, latitude: undefined, longitude: undefined },
      photos: onePhoto,
      mode: "publish",
    });
    expect(blockers).toEqual<PublishBlocker[]>(["location"]);
  });
});

describe("getPublishBlockers — fieldErrors backstop (review fix, never-silent onInvalid)", () => {
  it("does nothing when there are no fieldErrors and the listing is valid", () => {
    expect(
      getPublishBlockers({ values: validValues, photos: onePhoto, fieldErrors: {} })
    ).toEqual([]);
  });

  it("ignores fieldErrors entries whose value is falsy (react-hook-form clears a field by setting it undefined, not by deleting the key)", () => {
    const blockers = getPublishBlockers({
      values: validValues,
      photos: onePhoto,
      fieldErrors: { title: undefined, price: null },
    });
    expect(blockers).toEqual([]);
  });

  it("folds in a zod-flagged title error even though isBlankTitle sees a non-blank string (e.g. zod's max-length cap tripped on an old/duplicated listing)", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, title: "a".repeat(200) },
      photos: onePhoto,
      fieldErrors: { title: { type: "too_big", message: "..." } },
    });
    expect(blockers).toEqual<PublishBlocker[]>(["title"]);
  });

  it("maps latitude/longitude field errors to the single 'location' blocker, without duplicating it", () => {
    const blockers = getPublishBlockers({
      values: validValues,
      photos: onePhoto,
      mode: "publish",
      fieldErrors: { latitude: { type: "invalid" }, longitude: { type: "invalid" } },
    });
    expect(blockers).toEqual<PublishBlocker[]>(["location"]);
  });

  it("never re-introduces 'location' via fieldErrors in draft mode (latitude/longitude are always zod-optional, so this can't fire in practice, but the exemption must hold regardless)", () => {
    const blockers = getPublishBlockers({
      values: { title: "Sofa", price: 500, categoryId: 3 },
      photos: [],
      mode: "draft",
      fieldErrors: { title: undefined },
    });
    expect(blockers).toEqual([]);
  });

  it("unions business-rule blockers with fieldErrors-derived blockers, in on-screen order, without duplicates", () => {
    const blockers = getPublishBlockers({
      values: { ...validValues, title: "" },
      photos: [],
      fieldErrors: { price: { type: "invalid" } },
    });
    expect(blockers).toEqual<PublishBlocker[]>(["photos", "title", "price"]);
  });

  it("ignores an unmapped field error (e.g. currency) that has no corresponding blocker", () => {
    const blockers = getPublishBlockers({
      values: validValues,
      photos: onePhoto,
      fieldErrors: { currency: { type: "invalid_enum_value" } },
    });
    expect(blockers).toEqual([]);
  });
});
