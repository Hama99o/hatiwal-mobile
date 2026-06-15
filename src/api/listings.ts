import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

// Analytics types
export interface ListingAnalyticsEntry {
  date: string;   // ISO date string, e.g. "2026-06-17"
  count: number;  // distinct viewer count for that day
}

export interface ListingAnalyticsResponse {
  entries: ListingAnalyticsEntry[]; // 7 entries, oldest → newest
}

function appendImageUri(form: FormData, uri: string, field: string): void {
  const filename = uri.split("/").pop()?.split("?")[0] ?? "photo.jpg";
  const ext = (/\.(\w+)$/.exec(filename) ?? [])[1] ?? "jpg";
  const type = `image/${ext === "jpg" ? "jpeg" : ext}`;
  form.append(field, { uri, name: filename, type } as unknown as Blob);
}

async function submitListingMultipart(
  method: "POST" | "PUT",
  path: string,
  form: FormData
): Promise<{ listing: Record<string, unknown> }> {
  const res =
    method === "POST"
      ? await http.post(path, form, { headers: { "Content-Type": "multipart/form-data" } })
      : await http.put(path, form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
}

// Item condition — mirrors the backend `Listing#condition` enum (prefix :condition).
export type ListingCondition = "brand_new" | "like_new" | "good" | "fair";
export const LISTING_CONDITIONS: ListingCondition[] = ["brand_new", "like_new", "good", "fair"];


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
  isSaved?: boolean;
  isViewed?: boolean;
  expiresAt?: string | null;
  expired?: boolean;
  // Price-drop badge — only present on :detailed view; both null if no recent drop.
  priceDroppedAt?: string | null;
  priceDropPercent?: number | null;
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

export type ListingSort = "newest" | "oldest" | "price_asc" | "price_desc";

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
    } else if (params?.location) {
      query.append("location", params.location);
    }
    if (params?.sort && params.sort !== "newest") query.append("sort", params.sort);

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

  getSavedListings: async (): Promise<{ items: Listing[]; totalCount: number }> => {
    const response = await http.get("/my/saved_listings");
    return {
      items: (response.data.listings ?? []).map(
        (l: Record<string, unknown>) => convertKeysToCamel(l) as Listing
      ),
      totalCount: response.data.meta?.total_count ?? 0,
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

  reserveListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/reserve`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  // reserved → active (undo a reservation)
  activateListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/activate`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  markSold: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/sold`);
    return convertKeysToCamel(response.data.listing) as Listing;
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
};
