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
let mockParams: Record<string, string | undefined> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    dismissTo: mockDismissTo,
    back: jest.fn(),
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
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: { nameEn?: string }) => cat?.nameEn ?? "",
}));

// PhotosSection — renders null, just captures the props ListingForm passes
// it (`photos`, `onChange`, `error`) so tests can assert on `error` and can
// call `onChange` directly to drive the real error-clearing wiring in
// ListingForm, without needing the real expo-image-picker flow.
const mockPhotosSectionState: { props: Record<string, unknown> | null } = { props: null };
jest.mock("../listing-form/PhotosSection", () => ({
  PhotosSection: (props: Record<string, unknown>) => {
    mockPhotosSectionState.props = props;
    return null;
  },
}));

jest.mock("@/components/common/CategoryPicker", () => ({
  CategoryPicker: () => null,
}));
jest.mock("@/components/common/ConditionChips", () => ({
  ConditionChips: () => null,
}));

// LocationRangePicker — renders null, just captures the props ListingForm
// passes it (`onConfirm`, `onClose`) so tests can invoke `onConfirm` directly
// to simulate "the seller dropped a pin", exactly mirroring the
// PhotosSection stub above.
const mockLocationPickerState: { props: Record<string, unknown> | null } = { props: null };
jest.mock("@/components/common/LocationRangePicker", () => ({
  LocationRangePicker: (props: Record<string, unknown>) => {
    mockLocationPickerState.props = props;
    return null;
  },
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

// ── Fixture factory (mirrors ListingForm.duplicate.test.tsx) ──────────────────

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
  mockLocationPickerState.props = null;
});

// ── 1. Publish blocked — zero photos ───────────────────────────────────────────

describe("ListingForm — Publish blocked by zero photos", () => {
  it("does not call the API, shows a blocked toast, sets the destructive photo error, and scrolls to Photos", async () => {
    mockParams = { id: "42" };
    // Valid title/price/category/location, but NO photos at all.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ imageAttachments: [], images: [], imageUrls: [] })
    );

    renderForm();

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
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
    });

    expect(mockListingsAPI.updateListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.createListingWithImages).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    expect(mockPhotosSectionState.props?.error).toBe("listing.form.photoRequired");
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 28, animated: true }); // 40 - 12
  });

  it("clears the photo error as soon as a photo is added", async () => {
    mockParams = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ imageAttachments: [], images: [], imageUrls: [] })
    );

    renderForm();

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
    mockParams = { id: "42" };
    // Photos present + everything valid — only the title will be cleared.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(makeListing());

    renderForm();

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
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
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
    mockParams = { id: "42" };
    // Everything else valid (photos/title/price/category) — no coordinates.
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ latitude: null, longitude: null, location: "" })
    );

    renderForm();

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
      expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
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
    mockParams = { id: "42" };
    mockListingsAPI.getMyListing.mockResolvedValueOnce(
      makeListing({ latitude: null, longitude: null, location: "" })
    );

    renderForm();

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

// ── 4. Save draft — zero photos AND no map pin still succeeds (TASK-V395) ─────

describe("ListingForm — Save Draft only needs title/price/category (TASK-V395)", () => {
  it("saves successfully with zero photos and no map pin", async () => {
    mockParams = { id: "42" };
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

    renderForm();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("listing.form.saveDraft"));

    await waitFor(() => {
      expect(mockListingsAPI.updateListingWithImages).toHaveBeenCalledTimes(1);
    });

    // No publish-readiness toast should fire on the draft path.
    expect(mockToast.error).not.toHaveBeenCalledWith("listing.form.publishBlocked");
    expect(mockToast.error).not.toHaveBeenCalledWith("listing.form.draftBlocked");
    expect(mockPhotosSectionState.props?.error).toBeUndefined();
    expect(screen.queryByText("listing.form.locationRequired")).toBeNull();
  });
});
