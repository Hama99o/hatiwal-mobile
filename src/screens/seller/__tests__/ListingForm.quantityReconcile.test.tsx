/**
 * ListingForm — SF-M7 (docs/SELL_FLOW_REDESIGN.md, mobile half of SF-B6).
 *
 * The owner's own report: a seller sold all 15 units of a listing, then
 * edited quantity to 20 expecting to sell the remaining 5. The listing
 * stayed `sold` — invisible to buyers, unsellable — with nothing on screen
 * explaining why. Lowering it below what was already sold (15 → 10) instead
 * produced an uncaught 500 the app showed as the bare "server error" string,
 * next to a quantity field that never said anything was wrong with it.
 *
 * This suite covers the mobile-only half of the fix, against SF-B6's
 * contract:
 *   - raising quantity above `soldUnits` on a SOLD listing shows a
 *     reassuring note BEFORE Save, and only then;
 *   - the 422 `{ code: "quantity_below_sold_units" }` SF-B6 answers a
 *     refused down-edit with is pinned inline under the quantity field, in
 *     the app's locale-neutral (mocked-to-key) copy, never the server's raw
 *     English `errors` sentence;
 *   - any OTHER error code/shape keeps falling back to the existing generic
 *     toast — this ticket is additive, not a replacement for that path.
 *
 * Mocks and fixtures are shared with the other ListingForm.*.test.tsx suites
 * via helpers/listingFormHarness.tsx. `t()` is mocked globally (src/__tests__/
 * setup.ts) to return the raw key, so asserting `getByText("listing.form.
 * quantityReopensListing")` is the same convention every sibling suite here
 * already uses (e.g. `getByText("listing.form.saveDraft")`).
 */

import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react-native";

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
  mockParamsState,
  makeListing,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

const QUANTITY_INPUT = "listing-form-quantity-input";
const REOPEN_NOTE = "listing-form-quantity-reopen-note";
const SERVER_ERROR = "listing-form-quantity-server-error";

/** SF-B6's exact 422 shape. */
function quantityBelowSoldUnitsError() {
  return {
    response: {
      status: 422,
      data: {
        errors: ["Quantity must be greater than or equal to the number already sold"],
        code: "quantity_below_sold_units",
      },
    },
  };
}

async function openSoldListing(overrides: Parameters<typeof makeListing>[0] = {}) {
  mockParamsState.current = { id: "42" };
  mockListingsAPI.getMyListing.mockResolvedValueOnce(
    makeListing({
      id: 42,
      status: "sold",
      quantity: 15,
      availableUnits: 0,
      multiUnit: true,
      ...overrides,
    })
  );
  renderListingForm();
  await waitFor(() => expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("15"));
}

// ── 1. The reopen note — before Save, reassuring, only when it applies ──────

describe("ListingForm — the reopen note on a SOLD listing", () => {
  it("appears when the typed quantity rises above what has already sold", async () => {
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "20");

    expect(screen.getByTestId(REOPEN_NOTE)).toBeTruthy();
    expect(screen.getByText("listing.form.quantityReopensListing")).toBeTruthy();
  });

  it("does not appear while the typed quantity stays at exactly what has already sold", async () => {
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "15");

    expect(screen.queryByTestId(REOPEN_NOTE)).toBeNull();
  });

  it("does not appear while the typed quantity is still below what has already sold — that is the REFUSED case, not a reopen", async () => {
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "10");

    expect(screen.queryByTestId(REOPEN_NOTE)).toBeNull();
  });

  it("never appears on a listing that is not currently sold, no matter the quantity typed", async () => {
    mockParamsState.current = { id: "43" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ id: 43, status: "active", quantity: 20, availableUnits: 5, multiUnit: true })
    );
    renderListingForm();
    await waitFor(() => expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("20"));

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "30");

    expect(screen.queryByTestId(REOPEN_NOTE)).toBeNull();
  });
});

// ── 2. The refused down-edit — a readable inline message, not "server error" ─

describe("ListingForm — lowering quantity below what has already sold", () => {
  it("pins the localized message under the quantity field, not just a toast", async () => {
    mockListingsAPI.updateListingWithImages.mockRejectedValueOnce(quantityBelowSoldUnitsError());
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "10");
    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(screen.getByTestId(SERVER_ERROR)).toBeTruthy());
    expect(screen.getByText("listing.form.quantityBelowSoldUnits")).toBeTruthy();
    // Also toasted — never SILENT, matching every other mutation failure in
    // this file — but with the SAME localized copy, never the server's raw
    // English sentence.
    expect(mockToastError).toHaveBeenCalledWith("listing.form.quantityBelowSoldUnits");
  });

  it("never shows the reopen note at the same time as the refusal — they are mutually exclusive", async () => {
    mockListingsAPI.updateListingWithImages.mockRejectedValueOnce(quantityBelowSoldUnitsError());
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "10");
    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(screen.getByTestId(SERVER_ERROR)).toBeTruthy());
    expect(screen.queryByTestId(REOPEN_NOTE)).toBeNull();
  });

  it("clears the stale message the instant the seller changes the number again", async () => {
    mockListingsAPI.updateListingWithImages.mockRejectedValueOnce(quantityBelowSoldUnitsError());
    await openSoldListing();

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "10");
    fireEvent.press(screen.getByText("common.save"));
    await waitFor(() => expect(screen.getByTestId(SERVER_ERROR)).toBeTruthy());

    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "16");

    expect(screen.queryByTestId(SERVER_ERROR)).toBeNull();
    // And since 16 now clears the sold count, the reassuring note takes over.
    expect(screen.getByTestId(REOPEN_NOTE)).toBeTruthy();
  });
});

// ── 3. Any OTHER failure keeps its existing, unrelated behaviour ────────────

describe("ListingForm — an unrelated save failure is unaffected", () => {
  it("falls back to the server's own message when the 422 carries no known code", async () => {
    mockListingsAPI.updateListingWithImages.mockRejectedValueOnce({
      response: { status: 422, data: { errors: ["Title can't be blank"] } },
    });
    await openSoldListing();

    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Title can't be blank"));
    expect(screen.queryByTestId(SERVER_ERROR)).toBeNull();
  });

  it("falls back to the generic server-error copy for a bodyless 5xx, exactly as before this ticket", async () => {
    mockListingsAPI.updateListingWithImages.mockRejectedValueOnce({
      response: { status: 500, data: {} },
    });
    await openSoldListing();

    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("common.errorServer"));
    expect(screen.queryByTestId(SERVER_ERROR)).toBeNull();
  });
});
