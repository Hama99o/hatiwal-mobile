import { convertKeysToCamel, convertKeysToSnake } from "../case-styles";

describe("convertKeysToCamel", () => {
  it("converts snake_case keys to camelCase", () => {
    expect(convertKeysToCamel({ full_name: "Ahmad", created_at: "2026-01-01" })).toEqual({
      fullName: "Ahmad",
      createdAt: "2026-01-01",
    });
  });

  it("handles nested objects", () => {
    const input = { listing_id: 1, seller_info: { first_name: "Omar", avatar_url: null } };
    expect(convertKeysToCamel(input)).toEqual({
      listingId: 1,
      sellerInfo: { firstName: "Omar", avatarUrl: null },
    });
  });

  it("handles arrays of objects", () => {
    const input = [{ item_id: 1 }, { item_id: 2 }];
    expect(convertKeysToCamel(input)).toEqual([{ itemId: 1 }, { itemId: 2 }]);
  });

  it("handles arrays nested in objects", () => {
    const input = { image_urls: ["a.jpg", "b.jpg"] };
    expect(convertKeysToCamel(input)).toEqual({ imageUrls: ["a.jpg", "b.jpg"] });
  });

  it("passes through primitives unchanged", () => {
    expect(convertKeysToCamel(42)).toBe(42);
    expect(convertKeysToCamel("hello")).toBe("hello");
    expect(convertKeysToCamel(null)).toBeNull();
    expect(convertKeysToCamel(true)).toBe(true);
  });

  it("handles already-camelCase keys without changing them", () => {
    expect(convertKeysToCamel({ firstName: "Ahmad" })).toEqual({ firstName: "Ahmad" });
  });

  it("handles multiple underscores in a key", () => {
    expect(convertKeysToCamel({ access_token_expires_at: "2026" })).toEqual({
      accessTokenExpiresAt: "2026",
    });
  });
});

describe("convertKeysToSnake", () => {
  it("converts camelCase keys to snake_case", () => {
    expect(convertKeysToSnake({ fullName: "Ahmad", createdAt: "2026-01-01" })).toEqual({
      full_name: "Ahmad",
      created_at: "2026-01-01",
    });
  });

  it("handles nested objects", () => {
    const input = { listingId: 1, sellerInfo: { firstName: "Omar", avatarUrl: null } };
    expect(convertKeysToSnake(input)).toEqual({
      listing_id: 1,
      seller_info: { first_name: "Omar", avatar_url: null },
    });
  });

  it("handles arrays of objects", () => {
    const input = [{ itemId: 1 }, { itemId: 2 }];
    expect(convertKeysToSnake(input)).toEqual([{ item_id: 1 }, { item_id: 2 }]);
  });

  it("passes through primitives unchanged", () => {
    expect(convertKeysToSnake(42)).toBe(42);
    expect(convertKeysToSnake("hello")).toBe("hello");
    expect(convertKeysToSnake(null)).toBeNull();
  });

  it("already-snake_case keys are unchanged (no double underscore)", () => {
    const result = convertKeysToSnake({ full_name: "Ahmad" }) as Record<string, unknown>;
    expect(result.full_name).toBe("Ahmad");
  });
});

describe("round-trip", () => {
  it("camel→snake→camel returns original shape for typical API payload", () => {
    const original = {
      id: 1,
      fullName: "Ahmad Karimi",
      preferredLanguage: "en",
      avatarUrl: null,
      sellerInfo: { firstName: "Omar", avatarUrl: "http://img.test/1.jpg" },
    };
    const snaked = convertKeysToSnake(original);
    const camelAgain = convertKeysToCamel(snaked);
    expect(camelAgain).toEqual(original);
  });
});
