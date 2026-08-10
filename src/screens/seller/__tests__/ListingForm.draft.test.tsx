/**
 * ListingForm — "Save draft" readiness (TASK-V395)
 *
 * Before this fix, "Save Draft" had no `onInvalid` handler and the single
 * zod resolver required `latitude`/`longitude` for EVERY submit path, so
 * (a) a seller with a title/price/category but no map pin got NOTHING when
 * tapping "Save Draft" (silent no-op), and (b) a draft could not be saved at
 * all without first dropping a pin — even though hatiwal-api's Listing model
 * only validates title/price/currency/category.
 *
 * This suite locks in the fix:
 *  1. A pin-less, photo-less draft with title/price/category IS saveable —
 *     it calls the create API and routes to the new listing's owner detail
 *     (acceptance #1).
 *  2. A draft missing a required field (title) is NEVER a silent no-op — it
 *     toasts the missing fields (`listing.form.draftBlocked`) and scrolls to
 *     the first one; photos/location are NOT listed as draft blockers
 *     (acceptance #2).
 *  3. A pin-less draft survives an edit round trip: reopening it shows "Tap
 *     to set location", Save Draft on it still succeeds without a pin, and
 *     Publish from that same screen still requires one (acceptance #5).
 *
 * Mocking strategy mirrors ListingForm.publish.test.tsx / routing.test.tsx —
 * CategoryPicker/PhotosSection are captured (not stubbed to `null`-only) so
 * a brand-new listing can be filled out without the real picker UIs. Mocks
 * and fixtures are shared with the other ListingForm.*.test.tsx suites via
 * helpers/listingFormHarness.tsx (CYCLE-3 CR fix).
 */

import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { ScrollView } from "react-native";

// ── Mocks — factories forwarded to the shared harness (see its header) ────────

jest.mock("lucide-react-native", () => require("./helpers/listingFormHarness").lucideIconsMock());
jest.mock("expo-router", () => require("./helpers/listingFormHarness").expoRouterMock());
jest.mock("@/api/listings", () => require("./helpers/listingFormHarness").listingsApiMock());
jest.mock("sonner-native", () => require("./helpers/listingFormHarness").sonnerMock());
jest.mock("@/utils/alert", () => require("./helpers/listingFormHarness").alertMock());
jest.mock("@/hooks/useCategoryName", () => require("./helpers/listingFormHarness").useCategoryNameMock());
jest.mock("../listing-form/PhotosSection", () => require("./helpers/listingFormHarness").photosSectionMock());
jest.mock("@/components/common/CategoryPicker", () => require("./helpers/listingFormHarness").categoryPickerMock());
jest.mock("@/components/common/ConditionChips", () => require("./helpers/listingFormHarness").conditionChipsMock());
jest.mock("@/components/common/LocationRangePicker", () => ({ LocationRangePicker: () => null }));
jest.mock("@/components/common/BackButton", () => require("./helpers/listingFormHarness").backButtonMock());

// Import AFTER mocks
import {
  mockListingsAPI,
  mockToastError,
  mockReplace,
  mockParamsState,
  mockPhotosSectionState,
  mockCategoryPickerState,
  makeListing,
  MOCK_CATEGORY,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

// ── 1. A pin-less, photo-less draft with title/price/category IS saveable ─────

describe("ListingForm — Save Draft on a brand-new, pin-less, photo-less listing", () => {
  it("calls createListingWithImages (POST /my/listings) and routes to the new owner detail", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 501, status: "draft" })
    );

    renderListingForm();

    fireEvent.changeText(
      screen.getByPlaceholderText("listing.titlePlaceholder"),
      "Sofa Set"
    );
    fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "500");

    await waitFor(() => expect(mockCategoryPickerState.props).not.toBeNull());
    act(() => {
      (mockCategoryPickerState.props?.onSelect as (c: unknown) => void)(MOCK_CATEGORY);
    });

    // No photos added, no location picker opened — still saveable as a draft.
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.createListingWithImages).toHaveBeenCalledTimes(1);
    });
    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();

    const [values, imageUris] = mockListingsAPI.createListingWithImages.mock.calls[0];
    expect(values).toMatchObject({ title: "Sofa Set", price: 500, categoryId: 3 });
    expect(imageUris).toEqual([]);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/501");
    });

    // Never a silent no-op, and never blocked.
    expect(mockToastError).not.toHaveBeenCalledWith("listing.form.draftBlocked");
  });
});

// ── 2. A draft missing a required field is NEVER a silent no-op ───────────────

describe("ListingForm — Save Draft blocked by a missing field", () => {
  it("toasts the missing fields, scrolls to the first one, and never calls the API — photos/location are not listed", async () => {
    renderListingForm();

    // Fill price + category, but leave the title blank.
    fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "500");
    await waitFor(() => expect(mockCategoryPickerState.props).not.toBeNull());
    act(() => {
      (mockCategoryPickerState.props?.onSelect as (c: unknown) => void)(MOCK_CATEGORY);
    });

    fireEvent(screen.getByTestId("listing-form-field-title"), "layout", {
      nativeEvent: { layout: { y: 120 } },
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollToSpy = jest.spyOn(scrollView.instance, "scrollTo").mockImplementation(() => {});

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.draftBlocked");
    });

    // Never a silent no-op — the API is never reached.
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();

    // Photos and location are NOT draft blockers — neither destructive state fires.
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();

    // Scrolled to the title section, 12px above its recorded y.
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 108, animated: true }); // 120 - 12
  });

  it("never blocks on photos or location alone in draft mode (only title/price/category)", async () => {
    // Everything filled EXCEPT category — proves the blocker set for a
    // draft is exactly {title, price, category}, matching the backend's
    // Listing validations, never {photos, location}.
    renderListingForm();

    fireEvent.changeText(
      screen.getByPlaceholderText("listing.titlePlaceholder"),
      "Sofa Set"
    );
    fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "500");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.draftBlocked");
    });

    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();
  });
});

// ── 3. A pin-less draft survives an edit round trip ────────────────────────────

describe("ListingForm — pin-less draft round trip (edit)", () => {
  it("shows 'Tap to set location', Save Draft succeeds without a pin, and Publish still requires one", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ status: "draft", latitude: null, longitude: null, location: "" })
    );
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft", latitude: null, longitude: null, location: "" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // Reopening a pin-less draft shows the "tap to set" placeholder, never
    // a stale "Location set" or a destructive error on load.
    expect(screen.getByText("listing.form.tapToSetLocation")).toBeTruthy();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();

    // Save Draft succeeds even though there is still no pin (photos ARE
    // present in this fixture — only location is missing).
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.updateListingWithImages).toHaveBeenCalledTimes(1);
    });
    expect(mockToastError).not.toHaveBeenCalledWith("listing.form.draftBlocked");

    // Publishing the SAME still-pin-less draft is blocked on location.
    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.publishBlocked");
    });
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
    expect(screen.getByText("listing.form.locationRequired")).toBeTruthy();
  });
});
