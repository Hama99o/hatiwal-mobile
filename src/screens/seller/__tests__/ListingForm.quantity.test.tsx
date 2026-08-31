/**
 * ListingForm — multi-quantity (docs/SPIKE_LISTING_QUANTITY.md, Tier 1).
 *
 * The feature exists because a seller with 15 identical bags had no way to say
 * so, and a buyer who wanted 15 assumed there was one and never asked.
 *
 * The spike's GOVERNING RULE, and the thing this suite is really guarding: a
 * seller with ONE item must never see that this feature exists. No new section,
 * no field to skip, no "1" to confirm — just one collapsed switch styled like
 * Negotiable, and a number only once they say they have several. Every
 * assertion below is either "the single-item path is byte-for-byte unchanged"
 * or "the number the seller typed is the number that reaches the API".
 *
 * Mocks and fixtures are shared with the other ListingForm.*.test.tsx suites
 * via helpers/listingFormHarness.tsx.
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
  mockParamsState,
  mockCategoryPickerState,
  makeListing,
  MOCK_CATEGORY,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

const QUANTITY_INPUT = "listing-form-quantity-input";

/** Fills the three fields a draft needs, so a submit is never blocked by
 *  something unrelated to quantity. */
async function fillMinimumDraft(title = "Rice Bags") {
  fireEvent.changeText(screen.getByPlaceholderText("listing.titlePlaceholder"), title);
  fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "1400");
  await waitFor(() => expect(mockCategoryPickerState.props).not.toBeNull());
  act(() => {
    (mockCategoryPickerState.props?.onSelect as (c: unknown) => void)(MOCK_CATEGORY);
  });
}

/** The ROW is the accessible switch (role + checked state + label); the inner
 *  Switch deliberately carries no label so nothing is announced twice. Pressing
 *  the row is also what a real seller does — it is the 44pt target. */
function toggleMultipleUnits(_on: boolean) {
  act(() => {
    fireEvent.press(screen.getByTestId("listing-form-quantity-row"));
  });
}

async function savedValues() {
  await waitFor(() => expect(mockListingsAPI.createListingWithImages).toHaveBeenCalledTimes(1));
  return mockListingsAPI.createListingWithImages.mock.calls[0][0];
}

// ── 1. The single-item seller sees nothing new ────────────────────────────────

describe("ListingForm — a seller with one item", () => {
  it("shows the collapsed switch OFF and no number input at all", () => {
    renderListingForm();

    expect(screen.getByTestId("listing-form-quantity-row")).toBeTruthy();
    expect(screen.queryByTestId(QUANTITY_INPUT)).toBeNull();
  });

  it("saves quantity 1 without ever being asked for a number", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(makeListing({ id: 501 }));

    renderListingForm();
    await fillMinimumDraft("Single Carpet");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    expect(await savedValues()).toMatchObject({ title: "Single Carpet", quantity: 1 });
  });
});

// ── 2. Revealing and using the number ────────────────────────────────────────

describe("ListingForm — a seller with several of the same item", () => {
  it("reveals the number input when the switch is turned on, seeded at 2", () => {
    renderListingForm();
    toggleMultipleUnits(true);

    expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("2");
  });

  it("sends the count the seller typed — the 15-bags case the feature was asked for", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(makeListing({ id: 502 }));

    renderListingForm();
    await fillMinimumDraft();
    toggleMultipleUnits(true);
    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "15");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    expect(await savedValues()).toMatchObject({ quantity: 15 });
  });

  it("sends a THREE-digit count — reported from the device as 120 not saving", async () => {
    // The case above is two digits. A seller reported entering 120 on staging and
    // finding neither the option nor the number saved; that turned out to be an API
    // that predates the feature, not the form. Pinned anyway, because the report is
    // cheap to encode and nothing between 15 and the 999 ceiling should differ.
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(makeListing({ id: 503 }));

    renderListingForm();
    await fillMinimumDraft();
    toggleMultipleUnits(true);
    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "120");
    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    expect(await savedValues()).toMatchObject({ quantity: 120 });
  });

  it("collapses back to a plain single-item listing when switched off again", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(makeListing({ id: 503 }));

    renderListingForm();
    await fillMinimumDraft();
    toggleMultipleUnits(true);
    fireEvent.changeText(screen.getByTestId(QUANTITY_INPUT), "15");
    toggleMultipleUnits(false);

    // No stranded 15 hiding in form state behind a closed switch.
    expect(screen.queryByTestId(QUANTITY_INPUT)).toBeNull();
    fireEvent.press(screen.getByText("listing.form.saveDraft"));
    expect(await savedValues()).toMatchObject({ quantity: 1 });
  });

  it("ignores non-digits, so the field can never hold something unsendable", () => {
    renderListingForm();
    toggleMultipleUnits(true);

    const input = screen.getByTestId(QUANTITY_INPUT);
    fireEvent.changeText(input, "1x5");
    expect(input.props.value).toBe("15");
  });

  // REWRITTEN, not deleted (A11, run-270) — and it is worth saying why, because
  // this test was PINNING A BUG IN PLACE.
  //
  // Its intent is right and is kept: a cleared quantity must never be committed
  // as 0, because a zero-unit listing is not a thing. Its MECHANISM was the
  // problem: it asserted the DISPLAY snaps to "1" on the keystroke that empties
  // the field. That snap is exactly what made the controlled Input re-render as
  // "1" mid-edit, so a seller who cleared the box and typed 15 got **115**
  // (reproduced on device — hierarchy dump in run-270 shows `text: '115'`).
  //
  // The behaviour now matches QuantityStepper.commitEdit's rule: an empty field
  // is allowed to LOOK empty while editing, the committed value is left alone
  // (never forced to a number the seller did not choose), and blur restores the
  // committed number. The zero-unit guarantee is asserted where it actually
  // matters — on what gets SAVED — which is a stronger check than the old one.
  it("lets a cleared field look empty while editing, but never commits 0 — the saved value keeps the last real number", async () => {
    renderListingForm();
    await fillMinimumDraft();
    toggleMultipleUnits(true);

    const input = screen.getByTestId(QUANTITY_INPUT);
    fireEvent.changeText(input, "15");
    fireEvent.changeText(input, "");

    // Empty on screen — no "1" appearing under the seller's cursor for the next
    // keystroke to append to.
    expect(input.props.value).toBe("");

    // ...and typing continues cleanly from empty, rather than producing "115".
    fireEvent.changeText(input, "8");
    expect(input.props.value).toBe("8");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));
    expect(await savedValues()).toMatchObject({ quantity: 8 });
  });

  it("never saves 0 when the field is left empty — the last committed number stands", async () => {
    renderListingForm();
    await fillMinimumDraft();
    toggleMultipleUnits(true);

    const input = screen.getByTestId(QUANTITY_INPUT);
    fireEvent.changeText(input, "6");
    fireEvent.changeText(input, "");
    fireEvent(input, "blur");

    // Blur puts the committed number back on screen...
    expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("6");

    // ...and it is what gets saved. Never 0, never undefined.
    fireEvent.press(screen.getByText("listing.form.saveDraft"));
    expect(await savedValues()).toMatchObject({ quantity: 6 });
  });
});

// ── 3. Reopening a batch listing ─────────────────────────────────────────────

describe("ListingForm — editing a listing that already has a count", () => {
  it("reopens with the switch ON and the saved number showing", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ id: 42, quantity: 15, status: "active" })
    );

    renderListingForm();

    // Without the seeding, the switch reads OFF while the form silently holds
    // 15 — the seller can neither see the number nor correct it.
    await waitFor(() => expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("15"));
    // The row publishes the state now, so this is also the a11y contract: one
    // element, role switch, checked true.
    expect(
      screen.getByTestId("listing-form-quantity-row").props.accessibilityState.checked
    ).toBe(true);
  });

  it("reopens a single-unit listing with the switch OFF and nothing revealed", async () => {
    mockParamsState.current = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ id: 42, quantity: 1, status: "active" })
    );

    renderListingForm();

    await waitFor(() => expect(screen.getByPlaceholderText("listing.titlePlaceholder")).toBeTruthy());
    expect(screen.queryByTestId(QUANTITY_INPUT)).toBeNull();
  });

  // Older listings predate the column; the payload may carry no quantity at all.
  it("treats a listing with no quantity in the payload as a single item", async () => {
    mockParamsState.current = { id: "42" };
    const legacy = makeListing({ id: 42, status: "active" });
    delete (legacy as { quantity?: number }).quantity;
    mockListingsAPI.getMyListing.mockResolvedValueOnce(legacy);

    renderListingForm();

    await waitFor(() => expect(screen.getByPlaceholderText("listing.titlePlaceholder")).toBeTruthy());
    expect(screen.queryByTestId(QUANTITY_INPUT)).toBeNull();
  });
});

// ── 4. Duplicating a batch listing ───────────────────────────────────────────

describe("ListingForm — duplicating a listing that has a count", () => {
  it("carries the count over and shows it, since it is what the seller will edit next", async () => {
    mockParamsState.current = { duplicateFrom: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ id: 42, quantity: 15, status: "active" })
    );

    renderListingForm();

    await waitFor(() => expect(screen.getByTestId(QUANTITY_INPUT).props.value).toBe("15"));
  });
});

// ── UI-012: both toggle rows are tappable, not just their switches ───────────
//
// The rows are 44pt tall but only the ~44x24 switch used to respond, so a tap on
// the label — the obvious target, and the platform convention for a settings row
// — did nothing. Found on-device when a flow tapping the label never turned the
// quantity toggle on.

describe("ListingForm — the toggle rows are the tap target", () => {
  it("pressing the quantity ROW reveals the number input", () => {
    renderListingForm();
    expect(screen.queryByTestId(QUANTITY_INPUT)).toBeNull();

    act(() => {
      fireEvent.press(screen.getByTestId("listing-form-quantity-row"));
    });
    expect(screen.getByTestId(QUANTITY_INPUT)).toBeTruthy();
  });

  it("pressing the negotiable ROW toggles it", () => {
    renderListingForm();
    const row = () => screen.getByTestId("listing-form-negotiable-row");
    // Negotiable defaults to true.
    expect(row().props.accessibilityState.checked).toBe(true);

    act(() => {
      fireEvent.press(row());
    });
    expect(row().props.accessibilityState.checked).toBe(false);
  });

  it("each row publishes switch semantics exactly once", () => {
    // The inner Switch carries no accessibilityLabel: the row owns it, so a
    // screen reader announces the label once instead of twice.
    renderListingForm();
    for (const id of ["listing-form-quantity-row", "listing-form-negotiable-row"]) {
      const node = screen.getByTestId(id);
      expect(node.props.accessibilityRole).toBe("switch");
      expect(node.props.accessibilityState).toHaveProperty("checked");
    }
    expect(screen.queryAllByLabelText("listing.form.negotiableLabel")).toHaveLength(1);
    expect(screen.queryAllByLabelText("listing.form.multipleUnitsLabel")).toHaveLength(1);
  });
});
