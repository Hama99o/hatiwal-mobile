/**
 * Categories hub — unit tests.
 *
 * These exist because maestro/browse/categories_hub_empty.yaml asserted the
 * empty state end-to-end, which the e2e environment CANNOT produce: the seed
 * ships 16 categories, and the rig has no way to stub an API response (qa.sh net
 * only rewrites .env LAN addresses for real-phone runs). So the flow was
 * permanently red for a reason that had nothing to do with the app.
 *
 * An empty/error state driven purely by an API response belongs at the unit
 * layer, where the response is ours to choose. The screen had no unit tests at
 * all before this, so all three response-driven states are covered:
 *   - server returns []        -> "No categories yet"
 *   - server errors            -> error state with a Retry that refetches
 *   - server returns rows      -> the categories render, NOT the empty state
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("lucide-react-native", () => ({
  ChevronDown: "ChevronDown",
  ChevronUp: "ChevronUp",
  LayoutGrid: "LayoutGrid",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  // Fire the callback ONCE, on mount — that is what focusing a screen does.
  //
  // Calling it inline on every render instead (`useFocusEffect: (cb) => cb()`)
  // makes the screen's refetch-on-focus loop forever: refetch re-renders, the
  // re-render calls it again, and `isLoading` never goes false. The symptom is a
  // test that sits in the skeleton state and reports the state you asserted as
  // simply missing.
  useFocusEffect: (cb: () => void) => {
    const R = require("react");
    R.useEffect(() => { cb(); }, []);
  },
}));

// requireActual: this module exports localizedCategoryName as well as the API
// object, and the screen resolves every category's display name through it (via
// useCategoryName). Replacing the whole module made that call `undefined(...)`,
// which threw during render and unmounted the tree — the failure surfaced as
// "Unable to find node on an unmounted component", not as a missing mock.
jest.mock("@/api/categories", () => ({
  ...jest.requireActual("@/api/categories"),
  categoriesAPI: { getCategoriesWithCounts: jest.fn() },
}));

jest.mock("./../categories/SubcategoryPanel", () => ({ SubcategoryPanel: () => null }));

import { categoriesAPI } from "@/api/categories";
import CategoriesScreen from "../Categories";

const mockGet = categoriesAPI.getCategoriesWithCounts as jest.Mock;

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CategoriesScreen />
    </QueryClientProvider>
  );
}

describe("Categories hub — response-driven states", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the empty state when the server returns no categories", async () => {
    mockGet.mockResolvedValue([]);
    renderScreen();
    // Keys, not English: src/__tests__/setup.ts mocks react-i18next so t()
    // returns its key, which keeps every screen test locale-independent. The
    // English behind these is "No categories yet" / "Categories will appear
    // here once added." — the exact strings the deleted Maestro flow wanted.
    expect(await screen.findByText("categories.empty.title")).toBeTruthy();
    expect(screen.getByText("categories.empty.description")).toBeTruthy();
  });

  it("shows the error state with a working Retry when the request fails", async () => {
    mockGet.mockRejectedValue(new Error("boom"));
    renderScreen();
    const retry = await screen.findByText("common.retry");

    mockGet.mockResolvedValue([]);
    fireEvent.press(retry);

    // Retry must actually refetch — a button that only looks right is worse
    // than none, because it teaches the user the app is stuck.
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it("renders categories and NOT the empty state when the server returns rows", async () => {
    mockGet.mockResolvedValue([
      { id: 1, name: "Electronics", nameEn: "Electronics", listingsCount: 12, children: [] },
      { id: 2, name: "Vehicles", nameEn: "Vehicles", listingsCount: 3, children: [] },
    ]);
    renderScreen();
    // Category names come from the API, not i18n, so these are real strings.
    expect(await screen.findByText("Electronics")).toBeTruthy();
    expect(screen.queryByText("categories.empty.title")).toBeNull();
  });
});
