/**
 * ListingForm — price ceiling
 *
 * Regression for a reported defect: a seller held down "9" and submitted a
 * price of many hundreds of digits. Nothing explained what was wrong.
 *
 * Why it happened: `price` is decimal(12, 2) in hatiwal-api, but neither the
 * zod schema nor the model bounded it. The oversized value passed validation,
 * overflowed in Postgres, and came back as a 500 with no field errors — so the
 * seller saw the publish fail with no reason. Worse, when a price error *was*
 * shown, the form rendered a single message for every price problem
 * ("Enter a valid price greater than 0"), which states the opposite of what is
 * wrong for an over-large number.
 *
 * These tests lock in both halves of the fix:
 *   1. an over-large price never reaches the API at all
 *   2. it shows priceTooHigh, NOT priceRequired
 *
 * Mocks/fixtures come from helpers/listingFormHarness.tsx, same as the other
 * ListingForm.*.test.tsx suites. `t` is mocked to echo the key, so assertions
 * are made against "listing.form.priceTooHigh" rather than English copy.
 */

import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react-native";

import {
  mockListingsAPI,
  mockCategoryPickerState,
  MOCK_CATEGORY,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

// Same mock set as the sibling ListingForm.*.test.tsx suites — registered via
// jest.mock() factories so the module graph is stubbed before ListingForm (and
// its expo-location -> geolocation import chain) is ever required.
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

/** Fill everything a DRAFT needs except the price, which each test supplies. */
async function fillDraftWithPrice(price: string) {
  fireEvent.changeText(
    screen.getByPlaceholderText("listing.titlePlaceholder"),
    "Wool Carpet"
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("listing.pricePlaceholder"),
    price
  );
  await waitFor(() => expect(mockCategoryPickerState.props).not.toBeNull());
  act(() => {
    (mockCategoryPickerState.props?.onSelect as (c: unknown) => void)(MOCK_CATEGORY);
  });
}

describe("ListingForm — price ceiling", () => {
  beforeEach(() => {
    resetListingFormMocks();
  });

  it("accepts a normal price", async () => {
    renderListingForm();
    await fillDraftWithPrice("1400");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(mockListingsAPI.createListingWithImages).toHaveBeenCalled()
    );
    expect(screen.queryByText("listing.form.priceTooHigh")).toBeNull();
  });

  // The exact reported input: a long run of 9s.
  it("never sends a price of hundreds of digits to the API", async () => {
    renderListingForm();
    await fillDraftWithPrice("9".repeat(300));
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(screen.queryByText("listing.form.priceTooHigh")).toBeTruthy()
    );
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
  });

  it("says the price is too high, not that it must be greater than 0", async () => {
    renderListingForm();
    await fillDraftWithPrice("9".repeat(300));
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(screen.queryByText("listing.form.priceTooHigh")).toBeTruthy()
    );
    // The pre-fix message stated the opposite of the actual problem.
    expect(screen.queryByText("listing.form.priceRequired")).toBeNull();
  });

  it("rejects a price just past the decimal(12, 2) ceiling", async () => {
    renderListingForm();
    await fillDraftWithPrice("10000000000");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(screen.queryByText("listing.form.priceTooHigh")).toBeTruthy()
    );
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
  });

  it("still allows the largest price the column can hold", async () => {
    renderListingForm();
    await fillDraftWithPrice("9999999999.99");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(mockListingsAPI.createListingWithImages).toHaveBeenCalled()
    );
    expect(screen.queryByText("listing.form.priceTooHigh")).toBeNull();
  });

  it("still rejects zero with the greater-than-0 message", async () => {
    renderListingForm();
    await fillDraftWithPrice("0");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() =>
      expect(screen.queryByText("listing.form.priceRequired")).toBeTruthy()
    );
    expect(screen.queryByText("listing.form.priceTooHigh")).toBeNull();
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
  });
});
