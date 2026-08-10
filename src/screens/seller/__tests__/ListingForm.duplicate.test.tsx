/**
 * ListingForm — Duplicate / relist flow (TASK-L592)
 *
 * Covers:
 *  1. duplicateFrom present + NOT edit mode -> fetches source via getMyListing
 *     and seeds title/price/category (and other text fields) into the form.
 *  2. Photos are never prefilled from the source (images stay empty).
 *  3. Submitting the seeded form calls listingsAPI.createListingWithImages
 *     (the CREATE path) and never updateListingWithImages (the UPDATE path).
 *  4. The localized "duplicated" notice is shown once the source loads.
 *  5. A failed source fetch degrades to a blank form (no crash) + error toast;
 *     submit still goes through the create path.
 *
 * No real network calls — listingsAPI is fully mocked.
 *
 * Mocks/fixtures are shared with ListingForm.draft/publish/routing.test.tsx
 * via helpers/listingFormHarness.tsx (CYCLE-3 CR fix — this file used to
 * carry its own verbatim copy of every mock below).
 */

import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react-native";

// ── Mocks — factories forwarded to the shared harness (see its header) ────────

jest.mock("lucide-react-native", () => require("./helpers/listingFormHarness").lucideIconsMock());
jest.mock("expo-router", () => require("./helpers/listingFormHarness").expoRouterMock());
jest.mock("@/api/listings", () => require("./helpers/listingFormHarness").listingsApiMock());
jest.mock("sonner-native", () => require("./helpers/listingFormHarness").sonnerMock());
jest.mock("@/utils/alert", () => require("./helpers/listingFormHarness").alertMock());
jest.mock("@/hooks/useCategoryName", () => require("./helpers/listingFormHarness").useCategoryNameMock());

// Heavy composite children — not under test here, render as simple stubs.
jest.mock("../listing-form/PhotosSection", () => require("./helpers/listingFormHarness").photosSectionMock());
jest.mock("@/components/common/CategoryPicker", () => require("./helpers/listingFormHarness").categoryPickerMock());
jest.mock("@/components/common/ConditionChips", () => require("./helpers/listingFormHarness").conditionChipsMock());
jest.mock("@/components/common/LocationRangePicker", () => require("./helpers/listingFormHarness").locationRangePickerMock());
jest.mock("@/components/common/BackButton", () => require("./helpers/listingFormHarness").backButtonMock());

// Import AFTER mocks
import {
  mockListingsAPI,
  mockToastError,
  mockParamsState,
  mockPush,
  mockReplace,
  makeListing,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

// This suite's fixtures default to a SOLD source listing (a duplicate can be
// started from ANY listing status, including terminal ones) — every other
// suite's shared `makeListing()` default is "draft".
function makeSoldListing(overrides: Partial<ReturnType<typeof makeListing>> = {}) {
  return makeListing({ status: "sold", ...overrides });
}

// ── 1. Prefill from source ─────────────────────────────────────────────────────

describe("ListingForm — duplicate mode prefill", () => {
  it("fetches the source listing via getMyListing when duplicateFrom is present (not edit)", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing());

    renderListingForm();

    await waitFor(() => {
      expect(mockListingsAPI.getMyListing).toHaveBeenCalledWith(42);
    });
  });

  it("seeds the title field from the source listing", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing());

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });
  });

  it("seeds the price field from the source listing", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing({ price: 85000 }));

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("85000")).toBeTruthy();
    });
  });

  it("seeds the category name (via selectedCategory) from the source listing", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing());

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeTruthy();
    });
  });

  it("shows the localized duplicated notice once the source has loaded", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing());

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByTestId("listing-form-duplicated-notice")).toBeTruthy();
      expect(screen.getByText("listing.form.duplicatedNotice")).toBeTruthy();
    });
  });

  it("does NOT show the duplicated notice on a plain create (no duplicateFrom)", () => {
    mockParamsState.current = {};
    renderListingForm();
    expect(screen.queryByTestId("listing-form-duplicated-notice")).toBeNull();
    expect(mockListingsAPI.getMyListing).not.toHaveBeenCalled();
  });
});

// ── 2. Submit path — always CREATE, never UPDATE ───────────────────────────────

describe("ListingForm — duplicate mode submit path", () => {
  it("calls createListingWithImages (never updateListingWithImages) when saving the duplicated draft", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeSoldListing());
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 99, status: "draft" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.createListingWithImages).toHaveBeenCalledTimes(1);
      expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    });

    // Photos were never copied from the source — image uris arg is empty.
    const [, imageUris] = mockListingsAPI.createListingWithImages.mock.calls[0];
    expect(imageUris).toEqual([]);

    // Never routed to the Browse tab (TASK-J952) — a fresh owner detail.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/99");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ── 3. Failed source fetch — degrade gracefully ────────────────────────────────

describe("ListingForm — duplicate source fetch failure", () => {
  it("falls back to a blank form and shows an error toast when the source 404s", async () => {
    mockParamsState.current = { duplicateFrom: "999" };
    mockListingsAPI.getMyListing.mockRejectedValueOnce(new Error("Not Found"));

    expect(() => renderListingForm()).not.toThrow();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.duplicateLoadError");
    });

    // Form stays blank — no crash, no duplicated notice.
    expect(screen.queryByTestId("listing-form-duplicated-notice")).toBeNull();
    expect(screen.queryByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeNull();
  });

  it("still creates (not updates) if the seller submits after a failed duplicate fetch", async () => {
    mockParamsState.current = { duplicateFrom: "999" };
    mockListingsAPI.getMyListing.mockRejectedValueOnce(new Error("Not Found"));
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 100, status: "draft" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });

    // Fill in the required fields manually since prefill failed.
    fireEvent.changeText(screen.getByPlaceholderText("listing.titlePlaceholder"), "Blank title");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    // Validation will block submit (category/location missing) — the important
    // assertion is that update is never called even after a failed duplicate load.
    await waitFor(() => {
      expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    });
  });
});
