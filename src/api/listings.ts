import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export interface Listing {
  id: number;
  title: string;
  description: string | null;
  price: number;
  currency: "AFN" | "USD";
  status: "draft" | "active" | "reserved" | "sold";
  categoryId: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: number;
    name: string;
    city: string | null;
    phone?: string | null;
  };
  category: {
    id: number;
    nameEn: string;
    namePs: string;
    nameFa: string;
    slug: string;
  };
  images?: string[];
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

export interface ListingParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  status?: string;
}

export const listingsAPI = {
  getListings: async (params?: ListingParams): Promise<ListingsResponse> => {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize)   query.append("page[size]",   String(params.pageSize));
    if (params?.search)     query.append("search",       params.search);
    if (params?.categoryId) query.append("category_id",  String(params.categoryId));

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
    return convertKeysToCamel(response.data.listing) as Listing;
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
      currency: "AFN" | "USD";
      categoryId: number;
      location?: string;
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
    form.append("listing[category_id]", String(data.categoryId));
    if (data.location) form.append("listing[location]", data.location);
    if (data.latitude != null) form.append("listing[latitude]", String(data.latitude));
    if (data.longitude != null) form.append("listing[longitude]", String(data.longitude));

    imageUris.forEach((uri) => {
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      form.append("listing[images][]", { uri, name: filename, type } as unknown as Blob);
    });

    const response = await http.post("/my/listings", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  updateListingWithImages: async (
    id: number,
    data: {
      title: string;
      description?: string;
      price: number;
      currency: "AFN" | "USD";
      categoryId: number;
      location?: string;
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
    form.append("listing[category_id]", String(data.categoryId));
    if (data.location) form.append("listing[location]", data.location);
    if (data.latitude != null) form.append("listing[latitude]", String(data.latitude));
    if (data.longitude != null) form.append("listing[longitude]", String(data.longitude));

    imageUris.forEach((uri) => {
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      form.append("listing[images][]", { uri, name: filename, type } as unknown as Blob);
    });

    const response = await http.put(`/my/listings/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  updateListing: async (id: number, data: Partial<Listing>): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}`, {
      listing: convertKeysToSnake(data),
    });
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  deleteListing: async (id: number): Promise<void> => {
    await http.delete(`/my/listings/${id}`);
  },

  publishListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/publish`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  reserveListing: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/reserve`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },

  markSold: async (id: number): Promise<Listing> => {
    const response = await http.put(`/my/listings/${id}/sold`);
    return convertKeysToCamel(response.data.listing) as Listing;
  },
};
