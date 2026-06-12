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
}

export const categoriesAPI = {
  getCategories: async (): Promise<Category[]> => {
    const response = await http.get("/categories");
    return (response.data.categories ?? []).map(
      (c: Record<string, unknown>) => convertKeysToCamel(c) as Category
    );
  },
};
