/**
 * MyListingDetail — fallback-state unit tests (TASK-J952, CYCLE-5 design
 * review fix).
 *
 * Locks in the exact fix the review flagged: the `!listing` fallback gates
 * ONLY on `!listing` (never on an error boolean), but the REAL HTTP status
 * on the caught error now drives its COPY + action —
 *
 *  1. Loading  → DetailSkeleton (real testID, not a stub).
 *  2. A first-load failure with NO `response.status === 404` (network
 *     error, 500, timeout — anything that isn't a confirmed 404) shows the
 *     GENERIC connectivity fallback (WifiOff + common.errorTitle/
 *     errorDescription + Retry) — an offline seller must never be told
 *     their listing "does not exist".
 *  3. A confirmed 404 (`listingsAPI.getMyListing` rejects with
 *     `{ response: { status: 404 } }`, exactly what `http.get` throws for a
 *     real 404 — the API can never resolve `undefined`/`null` on success)
 *     shows the "not found" copy (PackageX + listing.ownerDetail.notFound +
 *     notFoundDescription) with a "Back to my listings" action instead of
 *     Retry, since Retry can never succeed against a 404.
 *  4. A BACKGROUND refetch failure while a real, already-loaded listing
 *     sits in the React Query cache must NOT blank the screen — the real
 *     content keeps rendering, never the fallback, never the skeleton.
 *     This is the CYCLE-3 regression this file guards against a
 *     re-introduction of.
 *  5. Retry on the connectivity fallback calls refetch.
 *
 * Every other section of the screen (gallery, analytics, map, lifecycle
 * actions, sheets) is stubbed out — those are exercised by
 * useListingLifecycle.test.tsx and PublishSuccessSheet.test.tsx respectively;
 * this file is scoped to the fallback-state logic only.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  BarChart2: "BarChart2",
  ChevronLeft: "ChevronLeft",
  Eye: "Eye",
  MessageCircle: "MessageCircle",
  MapPin: "MapPin",
  MoreHorizontal: "MoreHorizontal",
  ChevronRight: "ChevronRight",
  WifiOff: "WifiOff",
  PackageX: "PackageX",
  Clock: "Clock",
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { id: string; published?: string } = { id: "42" };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
    setParams: mockSetParams,
    canGoBack: () => true,
    dismissTo: jest.fn(),
  }),
  // Focus-refetch is exercised elsewhere (it's a one-line invalidate); a
  // no-op here keeps these tests deterministic and scoped to the fallback logic.
  useFocusEffect: jest.fn(),
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    getMyListing: jest.fn(),
    getListingAnalytics: jest.fn(),
  },
}));

jest.mock("@/hooks/useListingLifecycle", () => ({
  useListingLifecycle: () => ({
    primaryAction: null,
    moreActions: [],
    isBusy: false,
    buyerPicker: { visible: false, action: "reserve", onClose: jest.fn(), onConfirm: jest.fn(), isSubmitting: false },
    reviewPrompt: { visible: false, transactionId: 0, buyerName: "", buyerAvatarUrl: null, onClose: jest.fn() },
  }),
}));

// Heavy/native-adjacent sections — stubbed so this file stays scoped to the
// fallback-state logic (each has its own dedicated test coverage elsewhere).
jest.mock("@/screens/shared/listing-detail/ListingGallery", () => ({
  ListingGallery: () => null,
}));
// DetailSkeleton is intentionally left un-mocked — it has no API/native
// dependency (verified in its source), so the loading test below asserts on
// its real behavior instead of a stub.
jest.mock("@/components/common/ViewsSparkline", () => ({ ViewsSparkline: () => null }));
jest.mock("@/components/common/ListingMapSection", () => ({ ListingMapSection: () => null }));
jest.mock("@/components/common/BuyerPickerSheet", () => ({ BuyerPickerSheet: () => null }));
jest.mock("@/components/common/ReviewPromptSheet", () => ({ ReviewPromptSheet: () => null }));
jest.mock("@/components/common/ListingActionsSheet", () => ({ ListingActionsSheet: () => null }));
jest.mock("@/screens/seller/listing-form/PublishSuccessSheet", () => ({ PublishSuccessSheet: () => null }));
jest.mock("@/components/common/SaleBuyerCard", () => ({ SaleBuyerCard: () => null }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import MyListingDetailScreen from "../MyListingDetail";
import { listingsAPI } from "@/api/listings";
import type { Listing } from "@/api/listings";

const MY_LISTING_QK = "my-listing";

// ─── Fixture ────────────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 42,
    title: "Lenovo ThinkPad X1 Carbon",
    description: "Excellent condition.",
    price: 45000,
    currency: "AFN",
    status: "active",
    categoryId: 3,
    location: "Kabul",
    address: "Near the blue mosque",
    latitude: 34.5,
    longitude: 69.1,
    thumbnailUrl: "https://example.com/photo.jpg",
    imageUrls: ["https://example.com/photo.jpg"],
    images: ["https://example.com/photo.jpg"],
    shareUrl: null,
    viewsCount: 12,
    conversationsCount: 2,
    negotiable: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    seller: { id: 1, name: "Ahmad Karimi", city: "Kabul" },
    category: { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "الکترونیک", slug: "electronics" },
    ...overrides,
  } as Listing;
}

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MyListingDetailScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "42" };
  (listingsAPI.getListingAnalytics as jest.Mock).mockResolvedValue({ entries: [] });
});

// ─── Loading ──────────────────────────────────────────────────────────────────

describe("MyListingDetail — loading", () => {
  it("shows the real DetailSkeleton (not either fallback) while the query is still in flight", async () => {
    (listingsAPI.getMyListing as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderScreen(makeQc());

    await waitFor(() => expect(listingsAPI.getMyListing as jest.Mock).toHaveBeenCalled());
    // Still loading — DetailSkeleton actually renders (this assertion bites:
    // DetailSkeleton has a real testID on its root View), never either
    // `!listing` fallback.
    expect(screen.getByTestId("my-listing-detail-skeleton")).toBeTruthy();
    expect(screen.queryByText("common.errorTitle")).toBeNull();
    expect(screen.queryByText("listing.ownerDetail.notFound")).toBeNull();
  });
});

// ─── First-load failure — generic connectivity copy, never "not found" ───────

describe("MyListingDetail — first-load failure (isError, no cached data)", () => {
  it("shows the generic connectivity fallback, not the not-found copy", async () => {
    (listingsAPI.getMyListing as jest.Mock).mockRejectedValue(new Error("network down"));
    renderScreen(makeQc());

    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());
    expect(screen.getByText("common.errorDescription")).toBeTruthy();
    // Never claims the listing doesn't exist — that's a much stronger,
    // misleading claim for what is really just an offline/network error.
    expect(screen.queryByText("listing.ownerDetail.notFound")).toBeNull();
  });

  it("Retry on the fallback calls refetch (a fresh getMyListing call)", async () => {
    (listingsAPI.getMyListing as jest.Mock).mockRejectedValue(new Error("network down"));
    renderScreen(makeQc());

    await waitFor(() => expect(screen.getByText("common.errorTitle")).toBeTruthy());
    const callsBefore = (listingsAPI.getMyListing as jest.Mock).mock.calls.length;

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByText("common.retry"));

    await waitFor(() =>
      expect((listingsAPI.getMyListing as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });
});

// ─── Confirmed 404 — keeps the "not found" copy + a real escape hatch ────────

describe("MyListingDetail — confirmed 404 (a real deleted listing)", () => {
  it("shows the not-found copy, not the connectivity copy", async () => {
    // Exactly what `http.get` throws for a real 404 — `getMyListing` can
    // never resolve `undefined`/`null` on success (it always throws on a
    // non-2xx response), so this is the one true "not found" shape.
    (listingsAPI.getMyListing as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    renderScreen(makeQc());

    await waitFor(() => expect(screen.getByText("listing.ownerDetail.notFound")).toBeTruthy());
    expect(screen.getByText("listing.ownerDetail.notFoundDescription")).toBeTruthy();
    expect(screen.queryByText("common.errorTitle")).toBeNull();
  });

  it("offers 'Back to my listings' instead of Retry (Retry can never succeed against a 404)", async () => {
    (listingsAPI.getMyListing as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    renderScreen(makeQc());

    await waitFor(() => expect(screen.getByText("listing.ownerDetail.backToMyListings")).toBeTruthy());
    expect(screen.queryByText("common.retry")).toBeNull();

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByText("listing.ownerDetail.backToMyListings"));
    expect(mockReplace).toHaveBeenCalledWith("/(main)/(tabs)/my-listings");
  });
});

// ─── CYCLE-3 regression guard: a background refetch failure must never
// blank an already-loaded screen ──────────────────────────────────────────────

describe("MyListingDetail — background refetch failure keeps showing cached data", () => {
  it("keeps rendering the real listing when isError flips true but cached data is still present", async () => {
    const qc = makeQc();
    // Seed the cache exactly as a prior successful load would have —
    // mounting the component with a query key already present triggers an
    // immediate BACKGROUND refetch (default staleTime 0) while still
    // returning this cached `data` synchronously.
    qc.setQueryData([MY_LISTING_QK, "42"], makeListing({ title: "Samsung Galaxy S22" }));
    (listingsAPI.getMyListing as jest.Mock).mockRejectedValue(new Error("flaky network"));

    renderScreen(qc);

    // The real content (title) is visible immediately — never the skeleton,
    // never the fallback — even once the background refetch above resolves
    // to an error.
    expect(screen.getByText("Samsung Galaxy S22")).toBeTruthy();

    await waitFor(() => expect(listingsAPI.getMyListing as jest.Mock).toHaveBeenCalled());

    // Still showing the real listing after the failed background refetch —
    // the fallback (either copy) never appears.
    expect(screen.getByText("Samsung Galaxy S22")).toBeTruthy();
    expect(screen.queryByText("common.errorTitle")).toBeNull();
    expect(screen.queryByText("listing.ownerDetail.notFound")).toBeNull();
    expect(screen.queryByTestId("my-listing-detail-skeleton")).toBeNull();
  });
});
