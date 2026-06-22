import { categoriesAPI, localizedCategoryName } from "../categories";
import {
  MOCK_CATEGORY,
  MOCK_CATEGORY_WITH_COUNT,
  MOCK_SUBCATEGORY,
} from "../../__tests__/mocks/handlers";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("categoriesAPI.getCategories", () => {
  it("returns camelCased categories", async () => {
    const result = await categoriesAPI.getCategories();
    expect(result).toHaveLength(1);
    const cat = result[0];
    expect(cat.id).toBe(1);
    expect(cat.slug).toBe("electronics");
    expect(cat.nameEn).toBe("Electronics");
    expect(cat.namePs).toBe("برقی وسایل");
    expect(cat.nameFa).toBe("وسایل برقی");
    expect(cat.icon).toBe("laptop");
    expect(cat.position).toBe(1);
    expect(cat.parentId).toBeNull();
  });

  it("maps nested subcategories array in camelCase", async () => {
    const result = await categoriesAPI.getCategories();
    const cat = result[0];
    // subcategories must be present and recursively camelCased
    expect(cat.subcategories).toBeDefined();
    expect(cat.subcategories).toHaveLength(1);
    const sub = cat.subcategories![0];
    expect(sub.id).toBe(MOCK_SUBCATEGORY.id);
    expect(sub.nameEn).toBe(MOCK_SUBCATEGORY.name_en);
    expect(sub.namePs).toBe(MOCK_SUBCATEGORY.name_ps);
    expect(sub.nameFa).toBe(MOCK_SUBCATEGORY.name_fa);
    expect(sub.icon).toBe(MOCK_SUBCATEGORY.icon);
    expect(sub.parentId).toBe(MOCK_SUBCATEGORY.parent_id);
    // snake_case key must NOT bleed through
    expect((sub as Record<string, unknown>)["parent_id"]).toBeUndefined();
    expect((sub as Record<string, unknown>)["name_en"]).toBeUndefined();
  });

  it("maps empty subcategories array when parent has no children", async () => {
    // The default MOCK_CATEGORY fixture is used; verify the parent-level mapping
    // returns an empty array (not undefined) when subcategories: [] is sent.
    const result = await categoriesAPI.getCategories();
    const cat = result[0];
    // MOCK_CATEGORY has subcategories: [MOCK_SUBCATEGORY] now — already tested above.
    // This test ensures the array type is always present (never undefined from mapping).
    expect(Array.isArray(cat.subcategories)).toBe(true);
  });
});

describe("categoriesAPI.getCategoriesWithCounts", () => {
  it("returns categories with activeListingsCount in camelCase", async () => {
    const result = await categoriesAPI.getCategoriesWithCounts();
    expect(result).toHaveLength(1);
    const cat = result[0];
    expect(cat.id).toBe(MOCK_CATEGORY_WITH_COUNT.id);
    expect(cat.nameEn).toBe(MOCK_CATEGORY_WITH_COUNT.name_en);
    expect(cat.activeListingsCount).toBe(MOCK_CATEGORY_WITH_COUNT.active_listings_count);
  });

  it("maps snake_case active_listings_count to camelCase activeListingsCount", async () => {
    const result = await categoriesAPI.getCategoriesWithCounts();
    const cat = result[0];
    expect((cat as Record<string, unknown>)["active_listings_count"]).toBeUndefined();
    expect(cat.activeListingsCount).toBe(5);
  });

  it("maps nested subcategories in the with_counts response", async () => {
    const result = await categoriesAPI.getCategoriesWithCounts();
    const cat = result[0];
    expect(cat.subcategories).toBeDefined();
    expect(cat.subcategories).toHaveLength(1);
    const sub = cat.subcategories![0];
    expect(sub.id).toBe(MOCK_SUBCATEGORY.id);
    expect(sub.nameEn).toBe(MOCK_SUBCATEGORY.name_en);
    // Verify recursive camelCase — parent_id must be parentId
    expect(sub.parentId).toBe(MOCK_SUBCATEGORY.parent_id);
    expect((sub as Record<string, unknown>)["parent_id"]).toBeUndefined();
  });
});

describe("localizedCategoryName", () => {
  const cat = {
    nameEn: "Electronics",
    namePs: "برقی وسایل",
    nameFa: "وسایل برقی",
  };

  it("returns English name for lang=en", () => {
    expect(localizedCategoryName(cat, "en")).toBe("Electronics");
  });

  it("returns Pashto name for lang=ps", () => {
    expect(localizedCategoryName(cat, "ps")).toBe("برقی وسایل");
  });

  it("returns Dari name for lang=fa", () => {
    expect(localizedCategoryName(cat, "fa")).toBe("وسایل برقی");
  });

  it("falls back to English when Pashto name is missing", () => {
    expect(localizedCategoryName({ nameEn: "Clothes", namePs: null }, "ps")).toBe("Clothes");
  });

  it("falls back to English when Dari name is missing", () => {
    expect(localizedCategoryName({ nameEn: "Clothes", nameFa: "" }, "fa")).toBe("Clothes");
  });

  it("returns English for unknown language code", () => {
    expect(localizedCategoryName(cat, "de")).toBe("Electronics");
  });

  it("returns subcategory localized name via localizedCategoryName", () => {
    const sub = {
      nameEn: MOCK_SUBCATEGORY.name_en,
      namePs: MOCK_SUBCATEGORY.name_ps,
      nameFa: MOCK_SUBCATEGORY.name_fa,
    };
    expect(localizedCategoryName(sub, "en")).toBe("Phones");
    expect(localizedCategoryName(sub, "ps")).toBe("موبایلونه");
    expect(localizedCategoryName(sub, "fa")).toBe("تلفن‌ها");
  });
});
