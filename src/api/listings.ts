import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";
import type { Transaction } from "./transactions";

// Uploads: full-res phone photos are ~8 MB each (a 3-photo listing is ~27 MB),
// which blows past the request timeout on mobile connections and fails the
// publish. Downscale to a web-friendly size + re-encode as JPEG so a whole
// listing uploads in seconds instead of minutes.
const MAX_UPLOAD_WIDTH = 1600;
const UPLOAD_JPEG_QUALITY = 0.7;
// Multipart uploads need far more headroom than the default 20s API timeout.
const UPLOAD_TIMEOUT_MS = 120_000;

// Analytics types
export interface ListingAnalyticsEntry {
  date: string;   // ISO date string, e.g. "2026-06-17"
  count: number;  // distinct viewer count for that day
}

export interface ListingAnalyticsResponse {
  entries: ListingAnalyticsEntry[]; // 7 entries, oldest → newest
}

async function appendImageUri(form: FormData, uri: string, field: string): Promise<void> {
  // Resize + compress before upload. On failure (e.g. an unusual URI) fall back
  // to the original so a listing can still be created, just slower.
  let uploadUri = uri;
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_UPLOAD_WIDTH } }],
      { compress: UPLOAD_JPEG_QUALITY, format: SaveFormat.JPEG }
    );
    uploadUri = result.uri;
  } catch {
    uploadUri = uri;
  }
  const filename = (uploadUri.split("/").pop()?.split("?")[0] ?? "photo.jpg").replace(/\.\w+$/, ".jpg");
  form.append(field, { uri: uploadUri, name: filename, type: "image/jpeg" } as unknown as Blob);
}

async function submitListingMultipart(
  method: "POST" | "PUT",
  path: string,
  form: FormData
): Promise<{ listing: Record<string, unknown> }> {
  const config = {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  };
  const res = method === "POST" ? await http.post(path, form, config) : await http.put(path, form, config);
  return res.data;
}

// Item condition — mirrors the backend `Listing#condition` enum (prefix :condition).
export type ListingCondition = "brand_new" | "like_new" | "good" | "fair";
export const LISTING_CONDITIONS: ListingCondition[] = ["brand_new", "like_new", "good", "fair"];


// TASK-R418 — owner-only "who is the buyer for this reservation/sale" block.
// Only ever present on owner-scoped views (My::Listings index/show and the
// reserve/sold lifecycle response) — NEVER on the public listing detail/list.
// nil when the listing has no Transaction yet (draft/active) or was
// reserved/sold via the legacy buyer-less path.
export interface ListingSale {
  id: number;
  status: "reserved" | "sold";
  finalPrice: number;
  currency: string;
  completedAt: string | null;
  buyer: {
    id: number;
    name: string;
    avatarUrl: string | null;
    verified: boolean;
  };
  /** The buyer's conversation on this listing, or null if none exists. */
  conversationId: number | null;
}

export interface Listing {
  id: number;
  title: string;
  description: string | null;
  price: number;
  currency: "AFN" | "USD" | "EUR";
  condition?: ListingCondition | null;
  status: "draft" | "active" | "reserved" | "sold";
  categoryId: number;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
  imageUrls?: string[];
  images?: string[];
  // {id: blob signed_id, url} — detailed view only; lets the edit form remove
  // specific photos via removed_image_ids without wiping the gallery.
  imageAttachments?: { id: string; url: string }[];
  viewsCount: number;
  conversationsCount?: number;
  /**
   * Total number of users who have saved/bookmarked this listing — an
   * integer only, no saver identities. Only present on the :detailed view.
   */
  savesCount?: number;
  isSaved?: boolean;
  isViewed?: boolean;
  /** TASK-N071: true by default; when explicitly false the offer composer is hidden. */
  negotiable?: boolean | null;
  expiresAt?: string | null;
  expired?: boolean;
  // Price-drop badge — present on :list, :seller_list, and :detailed views; both null if no recent drop.
  priceDroppedAt?: string | null;
  priceDropPercent?: number | null;
  /**
   * Per-buyer "price dropped since you saved it" data (TASK-Y316) — only
   * present on GET /my/saved_listings (:list view + saved_by_listing_id
   * option). Distinct from priceDropPercent/priceDroppedAt above, which are
   * the listing's own price-history badge (TASK-N804) shown to every buyer.
   */
  priceAtSave?: number | null;
  priceDropped?: boolean;
  priceDropAmount?: number | null;
  // Canonical share URL — https when PUBLIC_SHARE_BASE_URL is configured on the backend, else nil.
  // Only present on the :detailed view. Mobile falls back to hatiwal://listing/:id when absent.
  shareUrl?: string | null;
  // TASK-R418 — owner-only buyer identity for a reserved/sold listing. Only
  // present on :seller_list / :owner_detailed (My Listings + reserve/sold
  // lifecycle response); undefined/null everywhere else (public detail/list).
  sale?: ListingSale | null;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: number;
    name: string;
    city: string | null;
    phone?: string | null;
    verified?: boolean;
    avatarUrl?: string | null;
    /** Percentage of conversations replied within 24h. null = threshold not met. */
    responseRatePercent?: number | null;
    /** One of: "within_one_hour" | "within_a_day" | "within_a_few_days" — or null. */
    responseTimeLabel?: "within_one_hour" | "within_a_day" | "within_a_few_days" | null;
    /** Privacy-safe recency label: "today" | "this_week" | "this_month" | null. */
    lastActiveLabel?: "today" | "this_week" | "this_month" | null;
    /**
     * True when the seller has set an away_until date that is still in the future.
     * Only present on the :detailed view.
     */
    sellerIsAway?: boolean;
    /**
     * ISO-8601 datetime string when the seller is currently away; null otherwise.
     * Only present on the :detailed view when sellerIsAway is true.
     */
    sellerAwayUntil?: string | null;
  };
  category: {
    id: number;
    nameEn: string;
    namePs: string;
    nameFa: string;
    slug: string;
  };
}

export interface ListingsResponse {
  items: Listing[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export type ListingSort =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "most_viewed"
  | "nearest";

export interface ListingParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  condition?: ListingCondition;
  userId?: number;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  sort?: ListingSort;
  /** When set, restricts results to listings whose seller's last_sign_in_at is within this many days. */
  sellerActiveDays?: number;
  /** TASK-B384: when true, restricts results to listings with a recent price drop (the "Deals" filter). */
  priceDropped?: boolean;
}

export const listingsAPI = {
  getListings: async (params?: ListingParams): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.search)     query.append("search",       params.search);
    if (params?.categoryId) query.append("category_id",  String(params.categoryId));
    if (params?.condition)  query.append("condition",    params.condition);
    if (params?.userId)     query.append("user_id",      String(params.userId));
    if (params?.status)     query.append("status",       params.status);
    if (params?.priceMin != null) query.append("price_min", String(params.priceMin));
    if (params?.priceMax != null) query.append("price_max", String(params.priceMax));
    if (params?.latitude != null && params?.longitude != null && params?.radius != null) {
      query.append("latitude",  String(params.latitude));
      query.append("longitude", String(params.longitude));
      query.append("radius",    String(params.radius));
    } else if (params?.sort === "nearest" && params?.latitude != null && params?.longitude != null) {
      // sort=nearest works across the whole feed too — radius is optional.
      query.append("latitude",  String(params.latitude));
      query.append("longitude", String(params.longitude));
    } else if (params?.location) {
      query.append("location", params.location);
    }
    if (params?.sort && params.sort !== "newest") query.append("sort", params.sort);
    if (params?.sellerActiveDays != null) query.append("seller_active_days", String(params.sellerActiveDays));
    if (params?.priceDropped) query.append("price_dropped", "true");

    const response = await http.get(`/listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },

  getListing: async (id: number): Promise<Listing> => {
    const response = await http.get(`/listings/${id}`);
    const raw = convertKeysToCamel(response.data.listing) as Listing;
    // is_saved comes from backend as boolean; camelCase converts it correctly
    return raw;
  },

  // GET /listings/:id/similar — returns up to 8 browsable, same-category listings
  // excluding the source listing. Public — works without authentication.
  getSimilarListings: async (id: number): Promise<Listing[]> => {
    const response = await http.get(`/listings/${id}/similar`);
    return (response.data.listings ?? []).map(
      (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
    );
  },

  getMyListing: async (id: number): Promise<Listing> => {
    const response = await http.get(`/my/listings/${id}`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  saveListing: async (id: number): Promise<void> => {
    await http.post(`/listings/${id}/save`);
  },

  unsaveListing: async (id: number): Promise<void> => {
    await http.delete(`/listings/${id}/unsave`);
  },

  // "Not interested" — hides a listing from the current user's own Browse
  // feed only. Distinct from save/unsave and from the seen/viewed badge.
  hideListing: async (id: number): Promise<void> => {
    await http.post(`/listings/${id}/hide`);
  },

  unhideListing: async (id: number): Promise<void> => {
    await http.delete(`/listings/${id}/unhide`);
  },

  // Seller (my listings)
  getMyListings: async (params?: ListingParams): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.status)     query.append("status",        params.status);
    if (params?.search)     query.append("search",        params.search);
    if (params?.categoryId) query.append("category_id",   String(params.categoryId));

    const response = await http.get(`/my/listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },

  createListing: async (data: Partial<Listing>): Promise<Listing> => {
    const response = await http.post("/my/listings", {
      listing: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  createListingWithImages: async (
    data: {
      title: string;
      description?: string;
      price: number;
      currency: "AFN" | "USD" | "EUR";
      condition?: ListingCondition;
      categoryId: number;
      location?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      negotiable?: boolean;
    },
    imageUris: string[]
  ): Promise<Listing> => {
    const form = new FormData();
    form.append("listing[title]", data.title);
    if (data.description) form.append("listing[description]", data.description);
    form.append("listing[price]", String(data.price));
    form.append("listing[currency]", data.currency);
    if (data.condition) form.append("listing[condition]", data.condition);
    form.append("listing[category_id]", String(data.categoryId));
    if (data.location) form.append("listing[location]", data.location);
    if (data.address) form.append("listing[address]", data.address);
    if (data.latitude != null) form.append("listing[latitude]", String(data.latitude));
    if (data.longitude != null) form.append("listing[longitude]", String(data.longitude));
    // Always send negotiable so the backend receives an explicit boolean rather than defaulting
    form.append("listing[negotiable]", String(data.negotiable ?? true));

    await Promise.all(imageUris.map((uri) => appendImageUri(form, uri, "listing[images][]")));

    const json = await submitListingMultipart("POST", "/my/listings", form);
    return convertKeysToCamel(json.listing) as Listing;
  },

  updateListingWithImages: async (
    id: number,
    data: {
      title: string;
      description?: string;
      price: number;
      currency: "AFN" | "USD" | "EUR";
      condition?: ListingCondition;
      categoryId: number;
      location?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      negotiable?: boolean;
    },
    imageUris: string[],
    // signed_ids of existing photos the user removed — purged server-side.
    removedImageIds: string[] = []
  ): Promise<Listing> => {
    const form = new FormData();
    form.append("listing[title]", data.title);
    if (data.description) form.append("listing[description]", data.description);
    form.append("listing[price]", String(data.price));
    form.append("listing[currency]", data.currency);
    if (data.condition) form.append("listing[condition]", data.condition);
    form.append("listing[category_id]", String(data.categoryId));
    if (data.location) form.append("listing[location]", data.location);
    if (data.address) form.append("listing[address]", data.address);
    if (data.latitude != null) form.append("listing[latitude]", String(data.latitude));
    if (data.longitude != null) form.append("listing[longitude]", String(data.longitude));
    form.append("listing[negotiable]", String(data.negotiable ?? true));

    await Promise.all(imageUris.map((uri) => appendImageUri(form, uri, "listing[images][]")));
    removedImageIds.forEach((sid) => form.append("listing[removed_image_ids][]", sid));

    const json = await submitListingMultipart("PUT", `/my/listings/${id}`, form);
    return convertKeysToCamel(json.listing) as Listing;
  },

  updateListing: async (id: number, data: Partial<Listing>): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}`, {
      listing: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // GET /users/:userId/sold_listings — public, works for guests.
  // Returns a paginated list of sold listings for a given seller.
  getSoldListings: async (
    userId: number,
    page?: number
  ): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (page) query.append("page[number]", String(page));

    const response = await http.get(`/users/${userId}/sold_listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },

  getSavedListings: async (page?: number): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (page) query.append("page[number]", String(page));

    const response = await http.get(`/my/saved_listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },

  // GET /my/hidden_listings — paginated list of listings the current user has
  // dismissed via "Not interested". Mirrors getSavedListings.
  getHiddenListings: async (page?: number): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (page) query.append("page[number]", String(page));

    const response = await http.get(`/my/hidden_listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },

  deleteListing: async (id: number): Promise<void> => {
    await http.delete(`/my/listings/${id}`);
  },

  publishListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/publish`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // active → draft (take a published listing offline)
  unpublishListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/unpublish`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // TASK-TX01: `opts.buyerId` (+ optional `opts.finalPrice`) identifies the
  // buyer from one of the listing's conversations — when given, the backend
  // creates/advances a Transaction and the response includes it. Omitting
  // `opts` preserves the legacy bare-call behavior (no Transaction).
  reserveListing: async (
    id: number,
    opts?: { buyerId?: number; finalPrice?: number; clearBuyer?: boolean }
  ): Promise<{ listing: Listing; transaction?: Transaction }> => {
    const response = await http.put(
      `/my/listings/${id}/reserve`,
      opts?.buyerId || opts?.clearBuyer
        ? convertKeysToSnake({ buyerId: opts.buyerId, finalPrice: opts.finalPrice, clearBuyer: opts.clearBuyer })
        : undefined
    );
    return {
      listing: convertKeysToCamel(response.data.listing) as Listing,
      transaction: response.data.transaction
        ? (convertKeysToCamel(response.data.transaction) as Transaction)
        : undefined,
    };
  },

  // reserved → active (undo a reservation)
  activateListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/activate`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // TASK-TX01: see reserveListing — same optional buyer_id/final_price
  // contract. `opts.clearBuyer` (TASK-TX02 review fix, MAJOR) is sent when
  // the seller explicitly tapped BuyerPickerSheet's "Someone else / skip" —
  // WITHOUT it, an empty body is indistinguishable on the wire from a legacy
  // client that never knew about buyer_id at all, and the backend would
  // silently close out a still-reserved Transaction against the wrong
  // buyer. See Listing#sold_with_buyer! (hatiwal-api).
  markSold: async (
    id: number,
    opts?: { buyerId?: number; finalPrice?: number; clearBuyer?: boolean }
  ): Promise<{ listing: Listing; transaction?: Transaction }> => {
    const response = await http.put(
      `/my/listings/${id}/sold`,
      opts?.buyerId || opts?.clearBuyer
        ? convertKeysToSnake({ buyerId: opts.buyerId, finalPrice: opts.finalPrice, clearBuyer: opts.clearBuyer })
        : undefined
    );
    return {
      listing: convertKeysToCamel(response.data.listing) as Listing,
      transaction: response.data.transaction
        ? (convertKeysToCamel(response.data.transaction) as Transaction)
        : undefined,
    };
  },

  // Restart the 30-day expiry clock on an active (possibly expired) listing.
  renewListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/renew`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // GET /my/listings/:id/analytics
  // Returns 7-day daily view counts for the listing (owner only).
  getListingAnalytics: async (id: number): Promise<ListingAnalyticsResponse> => {
    const response = await http.get(`/my/listings/${id}/analytics`);
    const raw = (response.data.analytics ?? []) as Array<{ date: string; count: number }>;
    return {
      entries: raw.map((entry) => convertKeysToCamel(entry) as ListingAnalyticsEntry),
    };
  },

  // GET /my/listings/status_counts — returns per-status listing counts for the
  // signed-in seller. One fast grouped query on the backend; no N+1.
  // The "active" count excludes expired-active listings (mirrors for_status_filter).
  // The "expired" bucket counts active listings that have passed their 30-day clock.
  getMyListingStatusCounts: async (): Promise<{
    all: number;
    draft: number;
    active: number;
    expired: number;
    reserved: number;
    sold: number;
  }> => {
    const response = await http.get("/my/listings/status_counts");
    return convertKeysToCamel(response.data) as {
      all: number;
      draft: number;
      active: number;
      expired: number;
      reserved: number;
      sold: number;
    };
  },

  // GET /my/viewed_listings — paginated list of listings the current user has
  // previously opened, ordered by last_viewed_at desc (most recent first).
  // Requires authentication. Browsable-only: draft/sold/reserved/expired/removed
  // listings are excluded server-side.
  getViewedListings: async (page?: number): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (page) query.append("page[number]", String(page));

    const response = await http.get(`/my/viewed_listings?${query}`);
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ListingsResponse["pagination"],
    };
  },
};
