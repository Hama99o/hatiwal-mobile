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
 * a brand-new listing can be filled out without the real picker UIs.
 */

import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import type { Listing } from "@/api/listings";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  ChevronRight: "ChevronRight",
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
let mockParams: Record<string, string | undefined> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    dismissTo: mockDismissTo,
    back: mockBack,
    canGoBack: () => true,
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

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: { nameEn?: string }) => cat?.nameEn ?? "",
}));

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
jest.mock("@/components/common/LocationRangePicker", () => ({
  LocationRangePicker: () => null,
}));
jest.mock("@/components/common/BackButton", () => ({
  BackButton: () => null,
}));

// Import AFTER mocks
import ListingFormScreen from "../ListingForm";
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Fixtures ────────────────────────────────────────────────────────────────────

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
  mockPhotosSectionState.props = null;
  mockCategoryPickerState.props = null;
});

// ── 1. A pin-less, photo-less draft with title/price/category IS saveable ─────

describe("ListingForm — Save Draft on a brand-new, pin-less, photo-less listing", () => {
  it("calls createListingWithImages (POST /my/listings) and routes to the new owner detail", async () => {
    mockParams = {};
    mockListingsAPI.createListingWithImages.mockResolvedValueOnce(
      makeListing({ id: 501, status: "draft" })
    );

    renderForm();

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
    expect(mockToast.error).not.toHaveBeenCalledWith("listing.form.draftBlocked");
  });
});

// ── 2. A draft missing a required field is NEVER a silent no-op ───────────────

describe("ListingForm — Save Draft blocked by a missing field", () => {
  it("toasts the missing fields, scrolls to the first one, and never calls the API — photos/location are not listed", async () => {
    mockParams = {};
    renderForm();

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
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.draftBlocked");
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
    mockParams = {};
    renderForm();

    fireEvent.changeText(
      screen.getByPlaceholderText("listing.titlePlaceholder"),
      "Sofa Set"
    );
    fireEvent.changeText(screen.getByPlaceholderText("listing.pricePlaceholder"), "500");

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.draftBlocked");
    });

    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();
  });
});

// ── 3. A pin-less draft survives an edit round trip ────────────────────────────

describe("ListingForm — pin-less draft round trip (edit)", () => {
  it("shows 'Tap to set location', Save Draft succeeds without a pin, and Publish still requires one", async () => {
    mockParams = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ status: "draft", latitude: null, longitude: null, location: "" })
    );
    mockListingsAPI.updateListingWithImages.mockResolvedValueOnce(
      makeListing({ status: "draft", latitude: null, longitude: null, location: "" })
    );

    renderForm();

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
    expect(mockToast.error).not.toHaveBeenCalledWith("listing.form.draftBlocked");

    // Publishing the SAME still-pin-less draft is blocked on location.
    fireEvent.press(screen.getByText("listing.publish"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
    });
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
    expect(screen.getByText("listing.form.locationRequired")).toBeTruthy();
  });
});
