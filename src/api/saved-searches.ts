import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export interface SavedSearch {
  id: number;
  location: string | null;
  categoryId: number | null;
  categoryName: string | null;
  priceMin: number | null;
  priceMax: number | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  locationBased: boolean;
  createdAt: string;
  lastViewedAt: string | null;
  newMatchesCount: number;
}

export interface SavedSearchesResponse {
  items: SavedSearch[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export const savedSearchesAPI = {
  list: async (): Promise<SavedSearch[]> => {
    const response = await http.get("/users/saved_searches");
    return (response.data.saved_searches ?? []).map(
      (s: Record<string, unknown>) => convertKeysToCamel(s) as SavedSearch
    );
  },

  create: async (filters: {
    location?: string;
    categoryId?: number;
    priceMin?: number;
    priceMax?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }): Promise<SavedSearch> => {
    const response = await http.post(
      "/users/saved_searches",
      convertKeysToSnake(filters)
    );
    return convertKeysToCamel(response.data.saved_search) as SavedSearch;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/users/saved_searches/${id}`);
  },

  markSeen: async (id: number): Promise<SavedSearch> => {
    const response = await http.put(`/users/saved_searches/${id}/mark_seen`);
    return convertKeysToCamel(response.data.saved_search) as SavedSearch;
  },
};
