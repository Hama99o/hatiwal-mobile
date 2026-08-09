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
 *     detail via `router.replace('/(main)/my-listings/:id')`.
 *  2. Publishing (new or edit-then-publish) uses `router.dismissTo` — not
 *     `replace` — to the owner detail with `?published=1` merged in, so a
 *     draft's own owner-detail entry already on the stack is updated in
 *     place instead of duplicated (see maestro/seller/publish_from_owner_detail.yaml).
 *  3. Editing an existing listing returns to wherever the form was opened
 *     from via `router.back()` when a back stack exists, and only falls
 *     back to a named route (the listing's own owner detail) when it
 *     truly doesn't (e.g. a hard deep-link into the edit route).
 *  4. Cancelling with no unsaved changes skips the confirm dialog and goes
 *     straight back; cancelling with unsaved changes confirms first via
 *     `confirmAlert` (never a raw `Alert.alert`), and only navigates once
 *     the destructive button is pressed.
 *  5. Cancelling a brand-new listing with no back stack at all (the one
 *     case where landing on Browse is correct — there is nothing else to
 *     return to) falls back to the Browse tab; cancelling an EDIT with no
 *     back stack falls back to that listing's own owner detail instead.
 *
 * Mocking strategy mirrors ListingForm.publish.test.tsx: listingsAPI and
 * the heavy child pickers (CategoryPicker/LocationRangePicker/PhotosSection)
 * are replaced with lightweight stubs that capture the props ListingForm
 * passes them, so tests can invoke `onSelect`/`onConfirm`/`onChange`
 * directly instead of driving the real picker UIs. `router.canGoBack` is a
 * mock the individual tests can flip per-case.
 */

import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import type { Listing } from "@/api/listings";

// The create+publish/create+draft cases drive several sequential
// act()/waitFor() round-trips (category select → location confirm →
// optional photo → submit → assert navigation); the default 5s Jest test
// timeout can be tight under load. 15s keeps this suite reliable in CI.
jest.setTimeout(15000);

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  ChevronRight: "ChevronRight",
  ChevronLeft: "ChevronLeft",
  MapPin: "MapPin",
  Coins: "Coins",
  Check: "Check",
  ToggleRight: "ToggleRight",
  Copy: "Copy",
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
let mockParams: Record<string, string | undefined> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    dismissTo: mockDismissTo,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    getMyListing: jest.fn(),
    createListingWithImages: jest.fn(),
    updateListingWithImages: jest.fn(),
    publishListing: jest.fn(),
  },
  LISTING_CONDITIONS: ["brand_new", "like_new", "good", "fair"],
}));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockConfirmAlert = jest.fn();
jest.mock("@/utils/alert", () => ({
  confirmAlert: (...args: unknown[]) => mockConfirmAlert(...args),
}));

jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: { nameEn?: string }) => cat?.nameEn ?? "",
}));

// PhotosSection / CategoryPicker / LocationRangePicker — captured (not
// stubbed to `null`-only) so tests can invoke the exact callbacks ListingForm
// wires up, without needing the real image-picker / bottom-sheet / map UIs.
const mockPhotosSectionState: { props: Record<string, unknown> | null } = { props: null };
jest.mock("../listing-form/PhotosSection", () => ({
  PhotosSection: (props: Record<string, unknown>) => {
    mockPhotosSectionState.props = props;
    return null;
  },
}));

const mockCategoryPickerState: { props: Record<string, unknown> | null } = { props: null };
jest.mock("@/components/common/CategoryPicker", () => ({
  CategoryPicker: (props: Record<string, unknown>) => {
    mockCategoryPickerState.props = props;
    return null;
  },
}));

jest.mock("@/components/common/ConditionChips", () => ({
  ConditionChips: () => null,
}));

const mockLocationPickerState: { props: Record<string, unknown> | null } = { props: null };
jest.mock("@/components/common/LocationRangePicker", () => ({
  LocationRangePicker: (props: Record<string, unknown>) => {
    mockLocationPickerState.props = props;
    return null;
  },
}));

// BackButton is intentionally NOT mocked — it only needs useRouter (already
// mocked above) + useColors/useTranslation, and its real `testID="back_button"`
// lets these tests trigger ListingForm's `onCancel` exactly as a real tap would.

// Import AFTER mocks
import ListingFormScreen from "../ListingForm";
import { listingsAPI } from "@/api/listings";

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;

// ── Fixture factory (mirrors ListingForm.publish.test.tsx) ────────────────────

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 42,
  title: "Lenovo ThinkPad X1 Carbon",
  description: "Used 6 months. No scratches.",
  price: 85000,
  currency: "AFN",
  condition: "good",
  status: "draft",
  categoryId: 3,
  location: "Kabul, Share Naw",
  address: "Near the blue mosque",
  latitude: 34.5,
  longitude: 69.1,
  thumbnailUrl: "https://example.com/photo.jpg",
  imageUrls: ["https://example.com/photo.jpg"],
  images: ["https://example.com/photo.jpg"],
  imageAttachments: [{ id: "blob-1", url: "https://example.com/photo.jpg" }],
  viewsCount: 42,
  conversationsCount: 5,
  negotiable: true,
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-01-10T08:00:00Z",
  seller: { id: 1, name: "Ahmad Karimi", city: "Kabul" },
  category: {
    id: 3,
    nameEn: "Electronics",
    namePs: "برقی توکي",
    nameFa: "الکترونیک",
    slug: "electronics",
  } as any,
  ...overrides,
});

const MOCK_CATEGORY = {
  id: 3,
  nameEn: "Electronics",
  namePs: "برقی توکي",
  nameFa: "الکترونیک",
  slug: "electronics",
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderForm() {
  const client = makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ListingFormScreen />
    </QueryClientProvider>
  );
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockCanGoBack.mockReturnValue(true);
  mockPhotosSectionState.props = null;
  mockCategoryPickerState.props = null;
  mockLocationPickerState.props = null;
});

// Fills the fields a brand-new (create) listing needs for the given mode.
// Title/price/category/coordinates are filled unconditionally — the zod
// schema requires exact map coordinates for every submit path in the
// current build; a photo is only added for "publish" (TASK-P736 gates
// Publish, not Save Draft, on having at least one photo).
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

  await waitFor(() => expect(mockLocationPickerState.props).not.toBeNull());
  act(() => {
    (mockLocationPickerState.props?.onConfirm as (r: unknown) => void)({
      coords: { latitude: 34.5, longitude: 69.1 },
      label: "Kabul, Share Naw",
    });
  });

  if (mode === "publish") {
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
    mockParams = {};
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 501, status: "draft" })
    );

    renderForm();
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
    mockParams = {};
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 777, status: "draft" })
    );
    mockListingsAPI.publishListing.mockResolvedValueOnce(
      makeListing({ id: 777, status: "active" })
    );

    renderForm();
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

// ── 3. Edit + Save — back() when possible, named fallback otherwise ───────────

describe("ListingForm — Save on an existing draft (edit)", () => {
  it("returns via router.back() when a back stack exists", async () => {
    mockParams = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft" })
    );

    renderForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it("falls back to its own owner detail (never Browse) when there is no back stack", async () => {
    mockParams = { id: "42" };
    mockCanGoBack.mockReturnValue(false);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft" })
    );

    renderForm();
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
    mockParams = { id: "42" };
    mockCanGoBack.mockReturnValue(true);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "active" })
    );

    renderForm();
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

// ── 5. Cancel navigation ────────────────────────────────────────────────────────

describe("ListingForm — Cancel (back button)", () => {
  it("goes straight back with no confirm dialog when there are no unsaved changes", async () => {
    mockParams = {};
    mockCanGoBack.mockReturnValue(true);

    renderForm();
    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("confirms via confirmAlert (never raw Alert.alert) when there are unsaved changes, then discards on confirm", async () => {
    mockParams = {};
    mockCanGoBack.mockReturnValue(true);

    renderForm();
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
    mockParams = {};
    mockCanGoBack.mockReturnValue(false);

    renderForm();
    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/(tabs)/browse");
  });

  it("an edit with no back stack falls back to its own owner detail, never Browse", async () => {
    mockParams = { id: "42" };
    mockCanGoBack.mockReturnValue(false);
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing({ status: "draft" }));

    renderForm();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("back_button"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/my-listings/42");
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining("browse"));
  });
});
