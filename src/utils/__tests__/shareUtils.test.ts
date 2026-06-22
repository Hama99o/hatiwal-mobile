import { resolveShareUrl, buildShareBody, resolveProfileShareUrl, buildProfileShareBody } from "../shareUtils";

// A simple stub for Linking.createURL that mirrors expo-linking behaviour
// for the "hatiwal" scheme: createURL("listing/123") → "hatiwal://listing/123"
const mockCreateUrl = (path: string) => `hatiwal://${path}`;

describe("resolveShareUrl", () => {
  describe("when shareUrl is a non-empty string (backend env configured)", () => {
    it("returns the server-provided https URL", () => {
      const url = resolveShareUrl(
        "https://hatiwal.example.com/l/42",
        42,
        mockCreateUrl
      );
      expect(url).toBe("https://hatiwal.example.com/l/42");
    });

    it("does NOT call createUrl (deep link is not needed)", () => {
      const createUrl = jest.fn().mockReturnValue("hatiwal://listing/42");
      resolveShareUrl("https://hatiwal.example.com/l/42", 42, createUrl);
      expect(createUrl).not.toHaveBeenCalled();
    });
  });

  describe("when shareUrl is null (backend env not set)", () => {
    it("falls back to hatiwal:// deep link containing the listing id", () => {
      const url = resolveShareUrl(null, 99, mockCreateUrl);
      expect(url).toContain("99");
    });

    it("generates a hatiwal:// scheme URL", () => {
      const url = resolveShareUrl(null, 5, mockCreateUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
    });

    it("includes 'listing' segment in the path", () => {
      const url = resolveShareUrl(null, 5, mockCreateUrl);
      expect(url).toContain("listing");
    });
  });

  describe("when shareUrl is undefined (older server / field absent)", () => {
    it("falls back to hatiwal:// deep link", () => {
      const url = resolveShareUrl(undefined, 7, mockCreateUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
      expect(url).toContain("7");
    });
  });

  describe("when shareUrl is an empty string", () => {
    it("falls back to hatiwal:// deep link (treats empty string as falsy)", () => {
      const url = resolveShareUrl("", 12, mockCreateUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
    });
  });
});

describe("buildShareBody", () => {
  describe("when the server provides an https share URL", () => {
    it("includes the https URL in the message body", () => {
      const body = buildShareBody(
        "iPhone 12 Pro",
        "AFN 45,000",
        "https://hatiwal.example.com/l/42"
      );
      expect(body).toContain("https://hatiwal.example.com/l/42");
    });

    it("includes the listing title in the message body", () => {
      const body = buildShareBody("iPhone 12 Pro", "AFN 45,000", "https://hatiwal.example.com/l/42");
      expect(body).toContain("iPhone 12 Pro");
    });

    it("includes the formatted price in the message body", () => {
      const body = buildShareBody("iPhone 12 Pro", "AFN 45,000", "https://hatiwal.example.com/l/42");
      expect(body).toContain("AFN 45,000");
    });
  });

  describe("when the server shareUrl is absent — deep link fallback", () => {
    it("includes the hatiwal:// deep link in the message body", () => {
      const deepLink = mockCreateUrl("listing/99");
      const body = buildShareBody("Wooden Chair", "AFN 1,200", deepLink);
      expect(body).toContain("hatiwal://listing/99");
    });

    it("the body always contains a tappable URL regardless of backend config", () => {
      const httpsUrl = "https://hatiwal.example.com/l/5";
      const bodyWithHttps = buildShareBody("Chair", "AFN 500", httpsUrl);
      expect(bodyWithHttps).toMatch(/https?:\/\//);

      const deepLink = mockCreateUrl("listing/5");
      const bodyWithDeepLink = buildShareBody("Chair", "AFN 500", deepLink);
      expect(bodyWithDeepLink).toMatch(/hatiwal:\/\//);
    });
  });

  describe("body format", () => {
    it("places the URL on its own line below the title and price", () => {
      const url = "hatiwal://listing/7";
      const body = buildShareBody("Sofa", "AFN 3,000", url);
      const lines = body.split("\n");
      // URL should appear on the second line (after the title — price line)
      expect(lines[lines.length - 1]).toBe(url);
    });
  });
});

// ─── Seller Profile Share helpers ─────────────────────────────────────────────

// A simple stub for Linking.createURL for the "hatiwal" scheme.
// createURL("seller/42") → "hatiwal://seller/42"
const mockCreateProfileUrl = (path: string) => `hatiwal://${path}`;

describe("resolveProfileShareUrl", () => {
  describe("when shareUrl is a non-empty string (backend env configured)", () => {
    it("returns the server-provided https URL", () => {
      const url = resolveProfileShareUrl(
        "https://hatiwal.example.com/u/42",
        42,
        mockCreateProfileUrl
      );
      expect(url).toBe("https://hatiwal.example.com/u/42");
    });

    it("does NOT call createUrl (deep link is not needed)", () => {
      const createUrl = jest.fn().mockReturnValue("hatiwal://seller/42");
      resolveProfileShareUrl("https://hatiwal.example.com/u/42", 42, createUrl);
      expect(createUrl).not.toHaveBeenCalled();
    });
  });

  describe("when shareUrl is null (backend env not set)", () => {
    it("falls back to hatiwal://seller/<id> deep link containing the user id", () => {
      const url = resolveProfileShareUrl(null, 99, mockCreateProfileUrl);
      expect(url).toContain("99");
    });

    it("generates a hatiwal:// scheme URL", () => {
      const url = resolveProfileShareUrl(null, 5, mockCreateProfileUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
    });

    it("includes 'seller' segment in the path", () => {
      const url = resolveProfileShareUrl(null, 5, mockCreateProfileUrl);
      expect(url).toContain("seller");
    });
  });

  describe("when shareUrl is undefined (older server / field absent)", () => {
    it("falls back to hatiwal://seller/<id> deep link", () => {
      const url = resolveProfileShareUrl(undefined, 7, mockCreateProfileUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
      expect(url).toContain("7");
    });
  });

  describe("when shareUrl is an empty string", () => {
    it("falls back to hatiwal:// deep link (treats empty string as falsy)", () => {
      const url = resolveProfileShareUrl("", 12, mockCreateProfileUrl);
      expect(url).toMatch(/^hatiwal:\/\//);
    });
  });
});

describe("buildProfileShareBody", () => {
  describe("when the server provides an https share URL", () => {
    it("includes the https URL in the message body", () => {
      const body = buildProfileShareBody(
        "Omar Noori",
        "https://hatiwal.example.com/u/42"
      );
      expect(body).toContain("https://hatiwal.example.com/u/42");
    });

    it("includes the seller name in the message body", () => {
      const body = buildProfileShareBody("Omar Noori", "https://hatiwal.example.com/u/42");
      expect(body).toContain("Omar Noori");
    });
  });

  describe("when the server shareUrl is absent — deep link fallback", () => {
    it("includes the hatiwal://seller deep link in the message body", () => {
      const deepLink = mockCreateProfileUrl("seller/99");
      const body = buildProfileShareBody("Ahmad Karimi", deepLink);
      expect(body).toContain("hatiwal://seller/99");
    });

    it("the body always contains a tappable URL regardless of backend config", () => {
      const httpsUrl = "https://hatiwal.example.com/u/5";
      const bodyWithHttps = buildProfileShareBody("Ahmad Karimi", httpsUrl);
      expect(bodyWithHttps).toMatch(/https?:\/\//);

      const deepLink = mockCreateProfileUrl("seller/5");
      const bodyWithDeepLink = buildProfileShareBody("Ahmad Karimi", deepLink);
      expect(bodyWithDeepLink).toMatch(/hatiwal:\/\//);
    });
  });

  describe("body format", () => {
    it("places the URL on its own line below the seller name", () => {
      const url = "hatiwal://seller/7";
      const body = buildProfileShareBody("Test Seller", url);
      const lines = body.split("\n");
      // URL should appear on the last line
      expect(lines[lines.length - 1]).toBe(url);
    });

    it("always contains a URL — server shareUrl present", () => {
      const url = "https://hatiwal.example.com/u/42";
      const body = buildProfileShareBody("Omar Noori", url);
      expect(body).toContain(url);
    });

    it("always contains a URL — hatiwal:// fallback", () => {
      const url = mockCreateProfileUrl("seller/42");
      const body = buildProfileShareBody("Omar Noori", url);
      expect(body).toContain("hatiwal://seller/42");
    });
  });
});
