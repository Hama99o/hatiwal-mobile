/**
 * ListingForm — post-submit routing + cancel navigation (TASK-J952)
 *
 * Before this fix, EVERY exit path out of ListingForm (save draft, publish,
 * cancel) blew the navigation stack away and replaced it with the Browse
 * tab — the single highest-intent moment in the app (just published!) got
 * nothing but a toast. This suite locks in the fix at the unit level (the
 * Maestro flows in maestro/listings/ and maestro/seller/ cover the same
 * behavior end-to-end):
 *
 *  1. Saving a brand-new listing (create, no `id` param) as a draft never
 *     replaces with the Browse tab — it routes to the listing's OWN owner
 *     detail via `router.replace('/(main)/my-listings/:id')`. TASK-V395: a
 *     draft only needs title/price/category, so this case fills EXACTLY
 *     those three — filling location/photos here too would hide a
 *     regression if that exemption ever broke (see `fillNewListingForm`).
 *  2. Publishing (new or edit-then-publish) uses `router.dismissTo` — not
 *     `replace` — to the owner detail with `?published=1` merged in, so a
 *     draft's own owner-detail entry already on the stack is updated in
 *     place instead of duplicated (see maestro/seller/publish_from_owner_detail.yaml).
 *     Covers BOTH a brand-new listing (create-then-publish, a fresh id) AND
 *     an existing listing already open in edit mode (edit-then-publish, the
 *     SAME id merged with `published=1`).
 *  3. Editing an existing listing returns to wherever the form was opened
 *     from via `router.back()` when a back stack exists, and only falls
 *     back to a named route (the listing's own owner detail) when it
 *     truly doesn't (e.g. a hard deep-link into the edit route).
 *  4. Cancelling with no unsaved changes skips the confirm dialog and goes
 *     straight back; cancelling with unsaved changes confirms first via
 *     `confirmAlert` (never a raw `Alert.alert`), and only navigates once
 *     the destructive button is pressed. The SAME confirm-then-navigate
 *     flow also fires for the ANDROID HARDWARE back button, not just the
 *     in-app top-toolbar back button — it was previously bypassed entirely.
 *  5. Cancelling a brand-new listing with no back stack at all (the one
 *     case where landing on Browse is correct — there is nothing else to
 *     return to) falls back to the Browse tab; cancelling an EDIT with no
 *     back stack falls back to that listing's own owner detail instead.
 *
 * Mocks and fixtures are shared with the other ListingForm.*.test.tsx suites
 * via helpers/listingFormHarness.tsx (CYCLE-3 CR fix) — this file is the one
 * exception that renders the REAL `BackButton` (testID="back_button") to
 * exercise the in-app back button exactly as a real tap would, so it adds
 * `ChevronLeft` to the shared icon mock and does NOT stub `BackButton` out.
 */

import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { BackHandler } from "react-native";

// The create+publish/create+draft cases drive several sequential
// act()/waitFor() round-trips (category select → location confirm →
// optional photo → submit → assert navigation); the default 5s Jest test
// timeout can be tight under load.
//
// 15s was NOT enough: this suite runs in ~5s alone but was observed taking 43s
// and failing inside a full parallel `jest --ci` run, while passing 12/12 in
// isolation. That is contention, not a regression — so the budget has to cover
// the loaded case, not the isolated one.
jest.setTimeout(45000);

// ── Mocks — factories forwarded to the shared harness (see its header) ────────

jest.mock("lucide-react-native", () =>
  require("./helpers/listingFormHarness").lucideIconsMock({ ChevronLeft: "ChevronLeft" })
);
jest.mock("expo-router", () => require("./helpers/listingFormHarness").expoRouterMock());
jest.mock("@/api/listings", () => require("./helpers/listingFormHarness").listingsApiMock());
jest.mock("sonner-native", () => require("./helpers/listingFormHarness").sonnerMock());
jest.mock("@/utils/alert", () => require("./helpers/listingFormHarness").alertMock());
jest.mock("@/hooks/useCategoryName", () => require("./helpers/listingFormHarness").useCategoryNameMock());
jest.mock("../listing-form/PhotosSection", () => require("./helpers/listingFormHarness").photosSectionMock());
jest.mock("@/components/common/CategoryPicker", () => require("./helpers/listingFormHarness").categoryPickerMock());
jest.mock("@/components/common/ConditionChips", () => require("./helpers/listingFormHarness").conditionChipsMock());
jest.mock("@/components/common/LocationRangePicker", () => require("./helpers/listingFormHarness").locationRangePickerMock());

// BackButton is intentionally NOT mocked — it only needs useRouter (already
// mocked above) + useColors/useTranslation, and its real `testID="back_button"`
// lets these tests trigger ListingForm's `onCancel` exactly as a real tap would.

// Import AFTER mocks
import {
  mockListingsAPI,
  mockConfirmAlert,
  mockReplace,
  mockDismissTo,
  mockBack,
  mockCanGoBack,
  mockParamsState,
  mockCategoryPickerState,
  mockLocationPickerState,
  mockPhotosSectionState,
  makeListing,
  MOCK_CATEGORY,
  renderListingForm,
  resetListingFormMocks,
} from "./helpers/listingFormHarness";

beforeEach(() => {
  resetListingFormMocks();
});

// Fills the fields a brand-new (create) listing needs for the given mode.
// Title/price/category are filled UNCONDITIONALLY — required for BOTH Save
// Draft and Publish (mirrors hatiwal-api's Listing validations). Photos AND
// exact map coordinates are ONLY filled for "publish": TASK-V395 made both
// optional for Save Draft (a draft may have zero photos and no pin at all —
// see ListingForm.draft.test.tsx), so filling them unconditionally here
// would silently hide a regression if that draft exemption ever broke.
async function fillNewListingForm(mode: "draft" | "publish" = "draft") {
  fireEvent.changeText(
    screen.getByPlaceholderText("listing.titlePlaceholder"),
    "Samsung Galaxy S22"
  );
  fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "35000");

  await waitFor(() => expect(mockCategoryPickerState.props).not.toBeNull());
  act(() => {
    (mockCategoryPickerState.props?.onSelect as (c: unknown) => void)(MOCK_CATEGORY);
  });

  if (mode === "publish") {
    await waitFor(() => expect(mockLocationPickerState.props).not.toBeNull());
    act(() => {
      (mockLocationPickerState.props?.onConfirm as (r: unknown) => void)({
        coords: { latitude: 34.5, longitude: 69.1 },
        label: "Kabul, Share Naw",
      });
    });

    await waitFor(() => expect(mockPhotosSectionState.props).not.toBeNull());
    act(() => {
      (mockPhotosSectionState.props?.onChange as (p: unknown[]) => void)([
        { uri: "file://new.jpg" },
      ]);
    });
  }
}

// ── 1. Save Draft (brand-new listing) — never lands on Browse ─────────────────

describe("ListingForm — Save Draft on a brand-new listing", () => {
  it("routes to the listing's OWN owner detail via router.replace, never Browse", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 501, status: "draft" })
    );

    renderListingForm();
    await fillNewListingForm("draft");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.createListingWithImages).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/501");
    });
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("browse"));
  });
});

// ── 2. Publish (brand-new listing) — dismissTo, never replace/Browse ──────────

describe("ListingForm — Publish on a brand-new listing", () => {
  it("routes via router.dismissTo to the owner detail with published=1", async () => {
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 777, status: "draft" })
    );
    mockListingsAPI.publishListing.mockResolvedValueOnce(
      makeListing({ id: 777, status: "active" })
    );

    renderListingForm();
    await fillNewListingForm("publish");

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockListingsAPI.publishListing).toHaveBeenCalledWith(777);
    });
    await waitFor(() => {
      expect(mockDismissTo).toHaveBeenCalledWith("/(main)/my-listings/777?published=1");
    });
    // Never the plain replace/Browse path.
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ── 2b. Publish (EXISTING listing, edit-then-publish) — SAME id, dismissTo ────

describe("ListingForm — Publish on an existing (edit-then-publish) listing", () => {
  it("routes via router.dismissTo to the SAME listing's owner detail with published=1", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ id: 42, status: "draft" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 42, status: "draft" })
    );
    mockListingsAPI.publishListing.mockResolvedValueOnce(makeListing({ id: 42, status: "active" }));

    renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockListingsAPI.updateListingWithImages).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockListingsAPI.publishListing).toHaveBeenCalledWith(42);
    });
    await waitFor(() => {
      expect(mockDismissTo).toHaveBeenCalledWith("/(main)/my-listings/42?published=1");
    });
    // Never a plain replace, and never a DIFFERENT listing id.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalledWith(expect.stringContaining("browse"));
  });
});

// ── 3. Edit + Save — back() when possible, named fallback otherwise ───────────

describe("ListingForm — Save on an existing draft (edit)", () => {
  it("returns via router.back() when a back stack exists", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft" })
    );

    renderListingForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it("falls back to its own owner detail (never Browse) when there is no back stack", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(false);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft" })
    );

    renderListingForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/42");
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("browse"));
  });
});

// ── 4. Edit an already-published listing — single "Save" button ───────────────

describe("ListingForm — Save on an already-published listing", () => {
  it("uses the single Save button and returns via router.back()", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "active" })
    );

    renderListingForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // isPublished === true → only a single "Save" button, not "Save Draft"/"Publish".
    expect(screen.queryByText("listing.form.saveDraft")).toBeNull();
    expect(screen.queryByText("listing.publish")).toBeNull();

    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });
});

// ── 4b. Cache seed on save/publish MERGES, never replaces (CYCLE-5 CR fix) ────
// Regression guard for the review finding that `qc.setQueryData(key, listing)`
// (a straight replace) silently deleted the owner-only `sale` block: the
// mutation payload comes from PUT/POST /my/listings (`view: :detailed`),
// while MyListingDetail's own cache entry is populated by `getMyListing`
// (`view: :owner_detailed` = `:detailed` + `sale`). A RESERVED listing's
// "Reserved for <buyer>" card must survive a Save.

describe("ListingForm — cache seed on Save merges with the existing entry (preserves `sale`)", () => {
  it("keeps the owner-only `sale` block in the cache after saving an edit", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    const existing = makeListing({ id: 42, status: "reserved" });
    mockListingsAPI.getMyListing.mockResolvedValueOnce(existing);
    // The PUT /my/listings response never carries `sale` — only
    // `getMyListing`'s `:owner_detailed` view does.
    const savedFromApi = makeListing({ id: 42, status: "reserved", price: 90000 });
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(savedFromApi);

    const qc = renderListingForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    // Seed the cache exactly as a prior load via MyListingDetail's own
    // `getMyListing` query would have — WITH the owner-only `sale` block.
    const sale = { buyer: { id: 9, name: "Ahmad Karimi" }, price: 85000 };
    act(() => {
      qc.setQueryData(["my-listing", "42"], { ...existing, sale });
    });

    // isPublished (reserved !== draft) → single "Save" button.
    fireEvent.press(screen.getByText("common.save"));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));

    const cached = qc.getQueryData(["my-listing", "42"]) as Record<string, unknown>;
    // The fresh field from the save DID apply...
    expect(cached.price).toBe(90000);
    // ...but the buyer-facing `sale` block, absent from this payload, was
    // NOT wiped out by the seed — a straight replace would have dropped it.
    expect(cached.sale).toEqual(sale);
  });
});

// ── 5. Cancel navigation — top-toolbar back button ─────────────────────────────

describe("ListingForm — Cancel (back button)", () => {
  it("goes straight back with no confirm dialog when there are no unsaved changes", async () => {
    mockCanGoBack.mockReturnValue(true);

    renderListingForm();
    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("confirms via confirmAlert (never raw Alert.alert) when there are unsaved changes, then discards on confirm", async () => {
    mockCanGoBack.mockReturnValue(true);

    renderListingForm();
    fireEvent.changeText(
      screen.getByPlaceholderText("listing.titlePlaceholder"),
      "Something typed"
    );

    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockConfirmAlert).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const destructive = buttons.find((b) => b.style === "destructive");
    expect(destructive).toBeDefined();

    act(() => destructive?.onPress?.());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("a brand-new listing with no back stack falls back to Browse", async () => {
    mockCanGoBack.mockReturnValue(false);

    renderListingForm();
    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/(tabs)/browse");
  });

  it("an edit with no back stack falls back to its own owner detail, never Browse", async () => {
    mockParamsState.current = { id: "42" };
    mockCanGoBack.mockReturnValue(false);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));

    renderListingForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/42");
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("browse"));
  });
});

// ── 6. Cancel navigation — Android hardware back button (CYCLE-3 CR fix) ──────
// Before this fix, the unsaved-changes guard only ever ran for the in-app
// top-toolbar back button — the Android hardware back button bypassed it
// entirely and popped the screen straight away, silently discarding unsaved
// work. ListingForm now registers its OWN `BackHandler.addEventListener(
// "hardwareBackPress", ...)` listener that calls the EXACT SAME `onCancel`
// used by the top-toolbar button. `react-native`'s jest/test BackHandler stub
// never actually dispatches to registered listeners, so these tests capture
// the handler ListingForm registered and invoke it directly.

describe("ListingForm — Cancel (Android hardware back button)", () => {
  // `onCancel` is a `useCallback` keyed on `isDirty`/`photos` — every time
  // either changes, the registration effect tears down the OLD listener and
  // adds a NEW one bound to the fresh closure. Always take the MOST RECENT
  // registration (never the first) so the handler reflects the form's
  // CURRENT dirty state at the moment the test invokes it.
  function getRegisteredHardwareBackHandler(spy: jest.SpyInstance): () => boolean | undefined {
    const calls = spy.mock.calls.filter(([eventName]) => eventName === "hardwareBackPress");
    expect(calls.length).toBeGreaterThan(0);
    return calls[calls.length - 1][1] as () => boolean | undefined;
  }

  it("marks the event as handled and goes straight back when there are no unsaved changes", async () => {
    mockCanGoBack.mockReturnValue(true);
    const addEventListenerSpy = jest.spyOn(BackHandler, "addEventListener");

    renderListingForm();

    const handler = getRegisteredHardwareBackHandler(addEventListenerSpy);
    const handled = handler();

    expect(handled).toBe(true);
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("confirms via confirmAlert first when there are unsaved changes, then discards on confirm", async () => {
    mockCanGoBack.mockReturnValue(true);
    const addEventListenerSpy = jest.spyOn(BackHandler, "addEventListener");

    renderListingForm();
    fireEvent.changeText(
      screen.getByPlaceholderText("listing.titlePlaceholder"),
      "Something typed"
    );

    const handler = getRegisteredHardwareBackHandler(addEventListenerSpy);
    const handled = handler();

    expect(handled).toBe(true);
    expect(mockConfirmAlert).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const destructive = buttons.find((b) => b.style === "destructive");
    act(() => destructive?.onPress?.());
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
