import { useQuery } from "@tanstack/react-query";
import { categoriesAPI, type Category } from "@/api/categories";

/**
 * Categories rarely change, so cache them for an hour. Centralizing the query
 * here (one queryKey, one staleTime) avoids the previous drift where each
 * screen declared its own `useQuery(["categories"])` with a different staleTime.
 */
const CATEGORIES_STALE_TIME = 1000 * 60 * 60;

/** Shared categories query — use everywhere instead of a local useQuery. */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: categoriesAPI.getCategories,
    staleTime: CATEGORIES_STALE_TIME,
  });
}
