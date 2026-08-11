/**
 * ListingForm — Publish readiness (TASK-P736, extended by TASK-V395)
 *
 * Covers the acceptance criteria directly:
 *  1. Publishing with ZERO photos never calls the create/publish API; a
 *     localized toast names what is missing, the destructive PhotosSection
 *     error is set, and the form scrolls to the Photos section.
 *  2. The photo error clears as soon as a photo is added back.
 *  3. Publishing with a valid photo but a required field cleared (and
 *     scrolled off-screen) never calls the API either — it always toasts
 *     AND scrolls to the first blocking field, using the exact y recorded
 *     via `onLayout`.
 *  4. Saving as a draft with zero photos AND no map pin still succeeds
 *     (TASK-V395 draft contract — title/price/category only). This proves
 *     "Save draft" is no longer gated by the old zod `latitude`/`longitude`
 *     requirement.
 *  5. Publish remains fully gated on location (TASK-V395): a listing with
 *     every other field valid but NO map pin still cannot be published —
 *     the toast lists "location", the destructive state now comes from the
 *     `locationError` state (not zod), and the form scrolls to the Location
 *     section.
 *  6. The location error clears the instant a pin is confirmed via
 *     LocationRangePicker.
 *
 * No real network calls — listingsAPI is fully mocked. PhotosSection is
 * replaced with a lightweight stub (renders null) that only captures the
 * props ListingForm passes it (`photos`, `onChange`, `error`) into
 * `mockPhotosSectionState` — tests call the captured `onChange` directly
 * (wrapped in `act`) to simulate "the seller added a photo", without
 * needing the real expo-image-picker flow or rendering any host component
 * from inside the jest.mock factory (NativeWind's cssInterop babel plugin
 * rejects JSX/createElement calls there as an out-of-scope reference).
 * `LocationRangePicker` is mocked the same way to simulate "the seller
 * dropped a pin" by invoking the captured `onConfirm` directly.
 *
 * Mocks and fixtures are shared with the other ListingForm.*.test.tsx suites
 * via helpers/listingFormHarness.tsx (CYCLE-3 CR fix).
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
jest.mock("@/components/common/CategoryPicker", () => ({ CategoryPicker: () => null }));
jest.mock("@/components/common/ConditionChips", () => require("./helpers/listingFormHarness").conditionChipsMock());
jest.mock("@/components/common/LocationRangePicker", () => require("./helpers/listingFormHarness").locationRangePickerMock());
jest.mock("@/components/common/BackButton", () => require("./helpers/listingFormHarness").backButtonMock());

// Import AFTER mocks
import {
  mockListingsAPI,
  mockToastError,
  mockParamsState,
  mockPhotosSectionState,
  mockLocationPickerState,
  makeListing,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

// ── 1. Publish blocked — zero photos ───────────────────────────────────────────

describe("ListingForm — Publish blocked by zero photos", () => {
  it("does not call the API, shows a blocked toast, sets the destructive photo error, and scrolls to Photos", async () => {
    mockParamsState.current = { id: "42" };
    // Valid title/price/category/location, but NO photos at all.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ imageAttachments: [], images: [], imageUrls: [] })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // Simulate the Photos section having already laid out (a real onLayout
    // event) so we can assert the scroll target too.
    fireEvent(screen.getByTestId("listing-form-field-photos"), "layout", {
      nativeEvent: { layout: { y: 40 } },
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollToSpy = jest.spyOn(scrollView.instance, "scrollTo").mockImplementation(() => {});

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.publishBlocked");
    });

    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    expect(mockPhotosSectionState.props?.error).toBe("listing.form.photoRequired");
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 28, animated: true }); // 40 - 12
  });

  it("clears the photo error as soon as a photo is added", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ imageAttachments: [], images: [], imageUrls: [] })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockPhotosSectionState.props?.error).toBe("listing.form.photoRequired");
    });

    // Seller adds a photo — invoke the captured onChange directly (this is
    // exactly what the real PhotosSection calls when a photo is picked).
    act(() => {
      (mockPhotosSectionState.props?.onChange as (p: unknown[]) => void)([
        { uri: "file://new.jpg" },
      ]);
    });

    await waitFor(() => {
      expect(mockPhotosSectionState.props?.error).toBeUndefined();
    });
  });
});

// ── 2. Publish blocked — a required field cleared and scrolled off-screen ─────

describe("ListingForm — Publish blocked by a missing field, scrolled off-screen", () => {
  it("never silently no-ops: toasts and scrolls to the first blocking field", async () => {
    mockParamsState.current = { id: "42" };
    // Photos present + everything valid — only the title will be cleared.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing());

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // Clear the title — simulates the seller blanking a required field.
    fireEvent.changeText(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon"), "");

    // Simulate the Title field being scrolled off-screen (a real onLayout
    // reported a y far down the form).
    fireEvent(screen.getByTestId("listing-form-field-title"), "layout", {
      nativeEvent: { layout: { y: 620 } },
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollToSpy = jest.spyOn(scrollView.instance, "scrollTo").mockImplementation(() => {});

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.publishBlocked");
    });

    // Publish must NEVER be a silent no-op — the API is never reached.
    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    // Photos were fine — the photo error must NOT be set for this case.
    expect(mockPhotosSectionState.props?.error).toBeUndefined();

    // Scrolled to the title section, 12px above its recorded y.
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 608, animated: true }); // 620 - 12
  });
});

// ── 3. Publish blocked — a pin-less listing (TASK-V395) ────────────────────────

describe("ListingForm — Publish blocked by a missing map pin", () => {
  it("does not call the API, shows a blocked toast, sets the destructive location error, and scrolls to Location", async () => {
    mockParamsState.current = { id: "42" };
    // Everything else valid (photos/title/price/category) — no coordinates.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ latitude: null, longitude: null, location: "" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // Pin-less listing shows the "tap to set" placeholder, never "Location set".
    expect(screen.getByText("listing.form.tapToSetLocation")).toBeTruthy();

    fireEvent(screen.getByTestId("listing-form-field-location"), "layout", {
      nativeEvent: { layout: { y: 720 } },
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollToSpy = jest.spyOn(scrollView.instance, "scrollTo").mockImplementation(() => {});

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.publishBlocked");
    });

    // Publish must NEVER be a silent no-op — the API is never reached.
    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    // Photos were fine — only the location error should be set.
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.getByText("listing.form.locationRequired")).toBeTruthy();

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 708, animated: true }); // 720 - 12
  });

  it("clears the location error the instant a pin is confirmed", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ latitude: null, longitude: null, location: "" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(screen.getByText("listing.form.locationRequired")).toBeTruthy();
    });

    // Seller drops a pin — invoke the captured onConfirm directly (exactly
    // what the real LocationRangePicker calls once a place is confirmed).
    await waitFor(() => expect(mockLocationPickerState.props).not.toBeNull());
    act(() => {
      (mockLocationPickerState.props?.onConfirm as (r: unknown) => void)({
        coords: { latitude: 34.5, longitude: 69.1 },
        radiusKm: 5,
        label: "Kabul, Share Naw",
      });
    });

    await waitFor(() => {
      expect(screen.queryByText("listing.form.locationRequired")).toBeNull();
    });
    expect(screen.getByText("Kabul, Share Naw")).toBeTruthy();
  });
});

// ── 3b. A zod-only failure `getPublishBlockers` doesn't re-derive (CR fix) ────
// TASK-P736 (review fix, CR round 2): before this fix, `handleInvalidSubmit`
// read `errors` from the CURRENT render's `formState` destructure — but
// react-hook-form's `handleSubmit` calls `onInvalid(m.errors, event)` BEFORE
// publishing that same `m.errors` to `formState`, so the closed-over
// `errors` was always the PREVIOUS render's value (`{}` on a first submit)
// at the exact moment `onInvalid` ran. A title exceeding zod's 150-char cap
// (a rule `getPublishBlockers`'s own business rules intentionally do NOT
// re-derive) made the blocker list come back EMPTY on the FIRST press —
// `listing.form.invalidGeneric`, no field named, no scroll — and only
// self-corrected on a SECOND press once React had re-rendered with the now
// up-to-date `errors`. This test fails against the old closure-reading code
// and passes once `onInvalid`'s own argument is used instead.

describe("ListingForm — a zod-only failure (title's 150-char cap) is never silently dropped on the FIRST press", () => {
  it("toasts publishBlocked (not invalidGeneric) and scrolls to Title on the very first Publish tap", async () => {
    mockParamsState.current = { id: "42" };
    // Everything else valid; title exceeds zod's `.max(150)` — a rule this
    // file's own `getPublishBlockers` does NOT independently re-derive.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ title: "x".repeat(200) })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("x".repeat(200))).toBeTruthy();
    });

    fireEvent(screen.getByTestId("listing-form-field-title"), "layout", {
      nativeEvent: { layout: { y: 300 } },
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const scrollToSpy = jest.spyOn(scrollView.instance, "scrollTo").mockImplementation(() => {});

    // FIRST (and only) press — must not require a second tap to self-correct.
    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("listing.form.publishBlocked");
    });

    // The old bug's symptom: a bare, field-less generic toast.
    expect(mockToastError).not.toHaveBeenCalledWith("listing.form.invalidGeneric");

    // Publish must NEVER be a silent no-op.
    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    // Scrolled straight to the Title section on the FIRST press.
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 288, animated: true }); // 300 - 12
  });
});

// ── 4. Save draft — zero photos AND no map pin still succeeds (TASK-V395) ─────

describe("ListingForm — Save Draft only needs title/price/category (TASK-V395)", () => {
  it("saves successfully with zero photos and no map pin", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({
        status: "draft",
        imageAttachments: [],
        images: [],
        imageUrls: [],
        latitude: null,
        longitude: null,
        location: "",
      })
    );
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft" })
    );

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.updateListingWithImages).toHaveBeenCalledTimes(1);
    });

    // No publish-readiness toast should fire on the draft path.
    expect(mockToastError).not.toHaveBeenCalledWith("listing.form.publishBlocked");
    expect(mockToastError).not.toHaveBeenCalledWith("listing.form.draftBlocked");
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();
  });
});
