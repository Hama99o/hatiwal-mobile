import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { localizedCategoryName, type LocalizedNames } from "@/api/categories";

/**
 * Returns a function that resolves a category's name in the active language
 * (with English fallback). Re-renders when the language changes.
 *
 *   const categoryName = useCategoryName();
 *   <Text>{categoryName(cat)}</Text>
 */
export function useCategoryName() {
  const { i18n } = useTranslation();
  return useCallback(
    (cat: LocalizedNames) => localizedCategoryName(cat, i18n.language),
    [i18n.language]
  );
}
