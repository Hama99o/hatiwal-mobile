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
};
