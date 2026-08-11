import { http } from "./http";
import { convertKeysToCamel } from "@/utils/case-styles";

export interface Category {
  id: number;
  slug: string;
  nameEn: string;
  namePs: string;
  nameFa: string;
  icon: string;
  position: number;
  parentId?: number | null;
  subcategories?: Category[];
  /** Present only when fetched with ?with_counts=true */
  activeListingsCount?: number;
}

/**
 * Minimal shape needed to resolve a localized name — satisfied by `Category`
 * and by the embedded `listing.category` object on a listing detail.
 */
export interface LocalizedNames {
  nameEn: string;
  namePs?: string | null;
  nameFa?: string | null;
}

/**
 * The category shape `CategorySerializer.render_as_hash` renders (default
 * view) when a category is EMBEDDED on another payload (a conversation's
 * pinned listing, the chat thread's reserved/sold recovery notice) rather
 * than fetched from `/categories` directly.
 *
 * TASK-K729 (review fix, LOW): the wire payload's default view is
 * `fields :id, :slug, :icon, :position` plus the three localized names
 * (see `CategorySerializer`) — it DOES carry `icon`/`position`, it just
 * omits `subcategories` and the count-view fields (`:with_count`/
 * `:with_counts`), which only render under those explicit views. This type
 * is narrower than the actual payload (harmless — extra wire fields TS
 * doesn't know about are simply ignored), but declare it accurately so the
 * next reader doesn't assume `icon`/`position` are truly absent.
 *
 * TASK-K729 (review fix, MEDIUM): ONE shared type instead of two identical
 * hand-declared aliases (`ConversationListingCategory` in api/conversations.ts
 * and `ListingUnavailableNoticeCategory` in ListingUnavailableNotice.tsx) —
 * both now import this instead of redeclaring it.
 */
export type EmbeddedCategory = LocalizedNames & {
  id: number;
  slug?: string;
  icon?: string | null;
  position?: number;
};

/**
 * Pick a category's name for the given language, falling back to English when
 * the translated name is missing or empty. Single source of truth — replaces
 * the `lang === 'ps' ? namePs : ...` ternary that was copied across screens.
 */
export function localizedCategoryName(cat: LocalizedNames, lang: string): string {
  if (lang === "ps") return cat.namePs || cat.nameEn;
  if (lang === "fa") return cat.nameFa || cat.nameEn;
  return cat.nameEn;
}

export const categoriesAPI = {
  getCategories: async (): Promise<Category[]> => {
    const response = await http.get("/categories");
    return (response.data.categories ?? []).map(
      (c: Record<string, unknown>) => convertKeysToCamel(c) as Category
    );
  },

  getCategoriesWithCounts: async (): Promise<Category[]> => {
    const response = await http.get("/categories?with_counts=true");
    return (response.data.categories ?? []).map(
      (c: Record<string, unknown>) => convertKeysToCamel(c) as Category
    );
  },
};
