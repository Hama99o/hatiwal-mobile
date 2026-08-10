/**
 * Shared test harness for the ListingForm.*.test.tsx suites (draft,
 * duplicate, publish, routing) — TASK-J952 CYCLE-3 CR fix.
 *
 * Before this file existed, all four suites carried FOUR verbatim copies of
 * the same mocks (expo-router, listingsAPI, sonner-native, confirmAlert,
 * useCategoryName, and the PhotosSection/CategoryPicker/LocationRangePicker/
 * ConditionChips/BackButton stubs), the same `makeListing` fixture factory,
 * and the same `makeQueryClient`/`renderForm` helpers — any change to one had
 * to be hand-repeated in the other three, and inevitably drifted (e.g. the
 * `AlertCircle` icon ListingForm started importing for the location-error
 * row had to be patched into all four `jest.mock("lucide-react-native", ...)`
 * calls separately).
 *
 * `jest.mock()` factories may only reference `require(...)` calls or
 * identifiers prefixed with `mock` (enforced by babel-plugin-jest-hoist, so
 * mocks are never invoked against an uninitialized variable) — so each test
 * file STILL registers its own `jest.mock(...)` calls (that part genuinely
 * can't be centralized), but every factory body now just forwards to one of
 * the builders below via `require(...)`, e.g.:
 *
 *   jest.mock("expo-router", () =>
 *     require("./helpers/listingFormHarness").expoRouterMock()
 *   );
 *
 * and every mutable mock fn / captured-props box / fixture is a single
 * shared export, so assertions in every suite read the exact same instances
 * (imported normally at the top of the test file — that's not inside a
 * factory, so the ordinary import rules apply).
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Listing } from "@/api/listings";

// ── expo-router ──────────────────────────────────────────────────────────────

export const mockPush = jest.fn();
export const mockReplace = jest.fn();
export const mockDismissTo = jest.fn();
export const mockBack = jest.fn();
export const mockCanGoBack = jest.fn(() => true);

// A boxed ref (not a reassigned `let` export — imported bindings for `let`
// exports are read-only, so plain `mockParams = {...}` from a consumer file
// would not compile) — mirrors the `{ props: ... }` boxes below. Each suite
// sets it per-test via `mockParamsState.current = { id: "42" }`.
export const mockParamsState: { current: Record<string, string | undefined> } = {
  current: {},
};

export function expoRouterMock() {
  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      dismissTo: mockDismissTo,
      back: mockBack,
      canGoBack: mockCanGoBack,
    }),
    useLocalSearchParams: () => mockParamsState.current,
    useFocusEffect: jest.fn(),
  };
}

// ── lucide-react-native ──────────────────────────────────────────────────────

// Base icon set ListingForm itself imports directly. `ChevronLeft` is only
// needed by ListingForm.routing.test.tsx, the one suite that renders the
// REAL `BackButton` (every other suite stubs `BackButton` out entirely —
// see `backButtonMock()` below) — pass `{ ChevronLeft: "ChevronLeft" }` as
// `extra` there.
export function lucideIconsMock(extra: Record<string, string> = {}) {
  return {
    ChevronRight: "ChevronRight",
    MapPin: "MapPin",
    Coins: "Coins",
    Check: "Check",
    ToggleRight: "ToggleRight",
    Copy: "Copy",
    AlertCircle: "AlertCircle",
    ...extra,
  };
}

// ── @/api/listings ────────────────────────────────────────────────────────────

export const mockListingsAPI = {
  getMyListing: jest.fn(),
  createListingWithImages: jest.fn(),
  updateListingWithImages: jest.fn(),
  publishListing: jest.fn(),
};

export function listingsApiMock() {
  return {
    listingsAPI: mockListingsAPI,
    LISTING_CONDITIONS: ["brand_new", "like_new", "good", "fair"],
  };
}

// ── sonner-native ─────────────────────────────────────────────────────────────

export const mockToastSuccess = jest.fn();
export const mockToastError = jest.fn();

export function sonnerMock() {
  return { toast: { success: mockToastSuccess, error: mockToastError } };
}

// ── @/utils/alert ─────────────────────────────────────────────────────────────

export const mockConfirmAlert = jest.fn();

export function alertMock() {
  return { confirmAlert: (...args: unknown[]) => mockConfirmAlert(...args) };
}

// ── @/hooks/useCategoryName ───────────────────────────────────────────────────

export function useCategoryNameMock() {
  return { useCategoryName: () => (cat: { nameEn?: string }) => cat?.nameEn ?? "" };
}

// ── Captured-prop child stubs ─────────────────────────────────────────────────
// Each renders null and just records the props ListingForm passed it, so
// tests can invoke the exact callback (`onChange`/`onSelect`/`onConfirm`)
// ListingForm wires up, without driving the real picker/image-picker UI.

export const mockPhotosSectionState: { props: Record<string, unknown> | null } = { props: null };
export function photosSectionMock() {
  return {
    PhotosSection: (props: Record<string, unknown>) => {
      mockPhotosSectionState.props = props;
      return null;
    },
  };
}

export const mockCategoryPickerState: { props: Record<string, unknown> | null } = { props: null };
export function categoryPickerMock() {
  return {
    CategoryPicker: (props: Record<string, unknown>) => {
      mockCategoryPickerState.props = props;
      return null;
    },
  };
}

export const mockLocationPickerState: { props: Record<string, unknown> | null } = { props: null };
export function locationRangePickerMock() {
  return {
    LocationRangePicker: (props: Record<string, unknown>) => {
      mockLocationPickerState.props = props;
      return null;
    },
  };
}

export function conditionChipsMock() {
  return { ConditionChips: () => null };
}

export function backButtonMock() {
  return { BackButton: () => null };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const MOCK_CATEGORY = {
  id: 3,
  nameEn: "Electronics",
  namePs: "برقی توکي",
  nameFa: "الکترونیک",
  slug: "electronics",
};

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    ...overrides,
  } as Listing;
}

// ── QueryClient + render ──────────────────────────────────────────────────────

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// `ListingFormScreen` is required LAZILY, inside the function body — NOT as
// a top-level `import` here. A plain ES `import` gets hoisted by Babel's
// CommonJS transform to the very top of THIS module, ahead of every
// `export const`/`export function` above; since `renderListingForm` is
// itself reached (transitively) via each suite's `jest.mock(..., () =>
// require("./helpers/listingFormHarness").xyzMock())` factories, that
// top-level import would `require("../../ListingForm")` WHILE this harness
// module is still in the middle of its own first load — a circular require
// that hands `ListingForm.tsx` a harness module whose builder functions
// aren't defined yet, silently breaking every mock. Requiring it lazily
// here defers that require until a test actually calls `renderListingForm()`,
// by which point this module has fully finished loading AND the calling
// suite's own `jest.mock(...)` calls are already registered — so
// `ListingFormScreen` always picks up THAT suite's mocked dependencies.
export function renderListingForm(): QueryClient {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ListingFormScreen = require("../../ListingForm").default;
  const client = makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ListingFormScreen />
    </QueryClientProvider>
  );
  return client;
}

// ── Reset ──────────────────────────────────────────────────────────────────────
// Call from every suite's `beforeEach`. Safe even for suites that never touch
// a given mock (e.g. duplicate.test.tsx never reads `mockCanGoBack`).
export function resetListingFormMocks(): void {
  jest.clearAllMocks();
  mockParamsState.current = {};
  // `jest.clearAllMocks()` clears call history but NOT a `.mockReturnValue()`
  // set by an earlier test — re-assert the default explicitly so suites stay
  // isolated from each other's overrides (e.g. a `mockCanGoBack.mockReturnValue(false)`
  // in one test must never leak into the next).
  mockCanGoBack.mockReturnValue(true);
  mockPhotosSectionState.props = null;
  mockCategoryPickerState.props = null;
  mockLocationPickerState.props = null;
}
