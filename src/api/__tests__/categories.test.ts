import { categoriesAPI, localizedCategoryName } from "../categories";
import { MOCK_CATEGORY } from "../../__tests__/mocks/handlers";

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
    expect(cat.subcategories).toEqual([]);
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
});
