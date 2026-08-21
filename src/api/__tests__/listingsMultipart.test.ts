/**
 * What the multipart builders actually put ON THE WIRE.
 *
 * `createListingWithImages`/`updateListingWithImages` build FormData field by
 * field — an explicit allow-list. A new form field that is not appended there is
 * collected, validated, and then silently dropped on the way out, and nothing
 * upstream can tell: the form is right, the backend is right, the value is just
 * gone. That is exactly what happened to `quantity` (QA run-041 — the seller
 * typed 15, the field held 15, the API stored 1).
 *
 * The form-level suite (ListingForm.quantity.test.tsx) asserts the value reaches
 * these functions' ARGUMENTS. That is one layer too high to catch this, which is
 * the whole reason this file exists.
 *
 * `http` is mocked rather than intercepted with MSW: MSW does not intercept the
 * `multipart/form-data` request these builders issue, so axios falls through to
 * the REAL dev API on localhost:3007 and the test hangs on the 120s upload
 * timeout. Mocking the transport keeps the assertion on the payload, which is
 * the thing under test anyway.
 */
import { listingsAPI } from "../listings";
import { http } from "../http";

jest.mock("../http", () => ({
  http: { post: jest.fn(), put: jest.fn() },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

const mockHttp = http as unknown as { post: jest.Mock; put: jest.Mock };

const BASE = {
  title: "Phone cases",
  price: 400,
  currency: "AFN" as const,
  categoryId: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHttp.post.mockResolvedValue({ data: { listing: { id: 1 } } });
  mockHttp.put.mockResolvedValue({ data: { listing: { id: 1 } } });
});

/** The FormData the builder handed to the transport. */
function sentForm(call: jest.Mock): FormData {
  return call.mock.calls[0][1] as FormData;
}

describe("createListingWithImages — the wire", () => {
  it("sends the quantity the seller entered", async () => {
    await listingsAPI.createListingWithImages({ ...BASE, quantity: 15 }, []);
    expect(sentForm(mockHttp.post).get("listing[quantity]")).toBe("15");
  });

  it("sends 1 when the seller never touched the toggle", async () => {
    await listingsAPI.createListingWithImages(BASE, []);
    expect(sentForm(mockHttp.post).get("listing[quantity]")).toBe("1");
  });

  it("sends 1 explicitly, so a batch can be turned back into a single item", async () => {
    await listingsAPI.createListingWithImages({ ...BASE, quantity: 1 }, []);
    expect(sentForm(mockHttp.post).get("listing[quantity]")).toBe("1");
  });

  it("still sends everything it sent before", async () => {
    await listingsAPI.createListingWithImages(
      { ...BASE, quantity: 15, negotiable: false },
      []
    );
    const form = sentForm(mockHttp.post);
    expect(form.get("listing[title]")).toBe("Phone cases");
    expect(form.get("listing[price]")).toBe("400");
    expect(form.get("listing[currency]")).toBe("AFN");
    expect(form.get("listing[category_id]")).toBe("1");
    expect(form.get("listing[negotiable]")).toBe("false");
  });
});

describe("updateListingWithImages — the wire", () => {
  it("sends the quantity too — editing a batch must be able to change it", async () => {
    await listingsAPI.updateListingWithImages(42, { ...BASE, quantity: 12 }, []);
    expect(sentForm(mockHttp.put).get("listing[quantity]")).toBe("12");
  });

  it("sends 1 when a batch is turned back into a single item", async () => {
    await listingsAPI.updateListingWithImages(42, { ...BASE, quantity: 1 }, []);
    expect(sentForm(mockHttp.put).get("listing[quantity]")).toBe("1");
  });
});
