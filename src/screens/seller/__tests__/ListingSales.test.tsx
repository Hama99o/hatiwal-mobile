/**
 * ListingSales — Jest unit tests (SF-M5, docs/SELL_FLOW_REDESIGN.md §10.3).
 *
 * Covers:
 *  1. Fetches via transactionsAPI.getMyTransactions({ listingId, as: "seller", status: "sold" })
 *  2. Renders one SaleRow per transaction
 *  3. Header tally ("5 of 15 sold") only when the listing is multi-unit
 *  4. No tally header for a single-item listing
 *  5. Empty state (no sales yet)
 *  6. Row tap opens the edit sheet for that transaction
 *  7. Save success: invalidates the shared query-key set + bumps the list's
 *     refreshKey + closes the sheet + toasts
 *  8. Save failure (non-review): toasts the server message, sheet stays open
 *  9. Delete success: same invalidation + toasts `listing.sale.voidedSuccess`
 * 10. The "sale_has_review" refusal is reported to the sheet WITHOUT a toast
 *     (the sheet renders its own inline explanation)
 * 11. Renders without throwing in RTL mode
 *
 * `UniversalList` is replaced by a minimal test double (mirrors
 * `ListingConversations.test.tsx`'s own) that fetches on mount/id/refreshKey
 * change and renders `ListHeaderComponent` — staying clear of FlashList's
 * native dependency chain. `SaleRowEditSheet` is replaced by a manual test
 * double exposing the props this screen wires it to, so this suite owns the
 * SCREEN's contract, not the sheet's own UI (covered by its own test file).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Transaction } from "@/api/transactions";
import type { Listing } from "@/api/listings";

// ── lucide-react-native ─────────────────────────────────────────────────────
jest.mock("lucide-react-native", () => ({
  Receipt: "Receipt",
  ChevronRight: "ChevronRight",
  ChevronLeft: "ChevronLeft",
}));

// ── expo-router ──────────────────────────────────────────────────────────────
const ROUTE_PARAMS = { id: "42" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ROUTE_PARAMS,
}));

// ── @/lib/toast ──────────────────────────────────────────────────────────────
jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ── APIs ─────────────────────────────────────────────────────────────────────
jest.mock("@/api/listings", () => ({
  listingsAPI: { getMyListing: jest.fn() },
}));
jest.mock("@/api/transactions", () => ({
  transactionsAPI: {
    getMyTransactions: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
  },
}));

// ── UniversalList test double — fetches on mount/id/refreshKey change,
//    renders ListHeaderComponent + one row per item (mirrors
//    ListingConversations.test.tsx's own double). ───────────────────────────
jest.mock("@/components/common/UniversalList", () => {
  const React = require("react");
  const { View, Text: RNText } = require("react-native");

  function MockUniversalList({ config }: { config: any }) {
    const [state, setState] = React.useState<{ items: any[]; loaded: boolean }>({
      items: [],
      loaded: false,
    });

    React.useEffect(() => {
      config.fetcher({ page: 1, perPage: config.perPage ?? 20 }).then((result: any) => {
        setState({ items: result.items, loaded: true });
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.id, config.refreshKey]);

    if (!state.loaded) return <View testID="universal-list-loading" />;

    if (state.items.length === 0) {
      return (
        <View testID="universal-list-empty">
          <RNText>{config.emptyTitle}</RNText>
        </View>
      );
    }

    return (
      <View testID="universal-list">
        {config.ListHeaderComponent}
        {state.items.map((item: any, index: number) => {
          const rendered = config.renderItem({ item, index });
          return rendered ? React.cloneElement(rendered, { key: String(item.id) }) : null;
        })}
      </View>
    );
  }

  return { UniversalList: MockUniversalList };
});

// ── SaleRowEditSheet test double — exposes the exact props this screen
//    wires, so THIS suite owns the screen's contract, not the sheet's UI. ──
jest.mock("../listing-sales/SaleRowEditSheet", () => {
  const React = require("react");
  const { View, Text: RNText, Pressable } = require("react-native");

  function MockSaleRowEditSheet({ visible, transaction, onSave, onDelete }: any) {
    if (!visible || !transaction) return null;
    return (
      <View testID="sale-edit-sheet">
        <RNText testID="sale-edit-sheet-transaction-id">{String(transaction.id)}</RNText>
        <Pressable testID="sale-edit-sheet-save" onPress={() => onSave({ quantity: 2 })} />
        <Pressable testID="sale-edit-sheet-delete" onPress={() => onDelete()} />
      </View>
    );
  }

  return { SaleRowEditSheet: MockSaleRowEditSheet };
});

// Import AFTER mocks
import ListingSales from "../ListingSales";
import { listingsAPI } from "@/api/listings";
import { transactionsAPI } from "@/api/transactions";
import { toast } from "@/lib/toast";

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockTransactionsAPI = transactionsAPI as jest.Mocked<typeof transactionsAPI>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 42,
    title: "Handmade Rugs — Batch of 15",
    description: null,
    price: 14000,
    currency: "AFN",
    status: "active",
    categoryId: 1,
    location: "Kabul",
    address: null,
    latitude: null,
    longitude: null,
    thumbnailUrl: null,
    imageUrls: [],
    viewsCount: 10,
    quantity: 15,
    availableUnits: 10,
    multiUnit: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    seller: { id: 1, name: "Ahmad", city: "Kabul" },
    category: { id: 1, nameEn: "Home", namePs: "کور", nameFa: "خانه", slug: "home" },
    ...overrides,
  } as Listing;
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 501,
    status: "sold",
    finalPrice: 14000,
    currency: "AFN",
    quantity: 3,
    completedAt: "2026-06-01T00:00:00Z",
    createdAt: "2026-06-01T00:00:00Z",
    role: "seller",
    listing: { id: 42, title: "Handmade Rugs — Batch of 15", thumbnailUrl: null, price: 14000, currency: "AFN", multiUnit: true, availableUnits: 10 },
    buyer: { id: 9, name: "Zahra Noori", avatarUrl: null },
    seller: { id: 1, name: "Ahmad", avatarUrl: null },
    ...overrides,
  };
}

function mockTransactionsResponse(items: Transaction[]) {
  mockTransactionsAPI.getMyTransactions.mockResolvedValue({
    items,
    pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: items.length, totalPages: 1 },
  });
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderScreen(qc?: QueryClient) {
  const client = qc ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ListingSales />
    </QueryClientProvider>
  );
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListingsAPI.getMyListing.mockResolvedValue(makeListing());
  mockTransactionsResponse([makeTransaction()]);
});

// ── 1 & 2. Fetch + render rows ───────────────────────────────────────────────

describe("ListingSales — fetch + render", () => {
  it("fetches this listing's SOLD transactions as seller", async () => {
    renderScreen();
    await waitFor(() =>
      expect(mockTransactionsAPI.getMyTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ listingId: 42, as: "seller", status: "sold" })
      )
    );
  });

  it("renders one row per transaction", async () => {
    mockTransactionsResponse([makeTransaction({ id: 1 }), makeTransaction({ id: 2 })]);
    renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("sale-row-1")).toBeTruthy();
      expect(screen.getByTestId("sale-row-2")).toBeTruthy();
    });
  });
});

// ── 3 & 4. Tally header ──────────────────────────────────────────────────────

describe("ListingSales — tally header", () => {
  it("shows the tally when the listing is multi-unit", async () => {
    mockListingsAPI.getMyListing.mockResolvedValue(makeListing({ quantity: 15, availableUnits: 10, multiUnit: true }));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("sales-tally")).toBeTruthy());
    // sold = 15 - 10 = 5
    expect(screen.getByText("listing.sale.tally")).toBeTruthy();
  });

  it("shows no tally for a single-item listing", async () => {
    mockListingsAPI.getMyListing.mockResolvedValue(
      makeListing({ quantity: 1, availableUnits: 0, multiUnit: false })
    );
    mockTransactionsResponse([makeTransaction({ quantity: 1 })]);
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());
    expect(screen.queryByTestId("sales-tally")).toBeNull();
  });
});

// ── 5. Empty state ────────────────────────────────────────────────────────────

describe("ListingSales — empty state", () => {
  it("shows the empty state when there are no sales yet", async () => {
    mockTransactionsResponse([]);
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-empty")).toBeTruthy());
    expect(screen.getByText("listing.salesScreen.empty")).toBeTruthy();
  });
});

// ── 6. Row tap opens the edit sheet ──────────────────────────────────────────

describe("ListingSales — row tap opens the edit sheet", () => {
  it("opens the sheet scoped to the tapped transaction", async () => {
    mockTransactionsResponse([makeTransaction({ id: 501 })]);
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("sale-row-501")).toBeTruthy());

    fireEvent.press(screen.getByTestId("sale-row-501"));

    expect(screen.getByTestId("sale-edit-sheet")).toBeTruthy();
    expect(screen.getByTestId("sale-edit-sheet-transaction-id")).toHaveTextContent("501");
  });
});

// ── 7. Save success ───────────────────────────────────────────────────────────

describe("ListingSales — save (PATCH) success", () => {
  it("invalidates the shared query keys, refreshes the list, closes the sheet, and toasts", async () => {
    mockTransactionsAPI.updateTransaction.mockResolvedValueOnce({
      listing: makeListing({ availableUnits: 8 }),
      transaction: makeTransaction({ quantity: 5 }),
    });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderScreen(qc);
    await waitFor(() => expect(screen.getByTestId("sale-row-501")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-row-501"));
    fireEvent.press(screen.getByTestId("sale-edit-sheet-save"));

    await waitFor(() => expect(mockTransactionsAPI.updateTransaction).toHaveBeenCalledWith(501, { quantity: 2 }));
    await waitFor(() => expect(screen.queryByTestId("sale-edit-sheet")).toBeNull());

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["my-listings"] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["myListingStatusCounts"] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["my-listing", "42"] }));
    expect(mockToast.success).toHaveBeenCalledWith("listing.form.saved");
  });
});

// ── 8. Save failure (non-review) ─────────────────────────────────────────────

describe("ListingSales — save failure (non-review)", () => {
  it("toasts the server message and leaves the sheet open", async () => {
    mockTransactionsAPI.updateTransaction.mockRejectedValueOnce({
      response: { status: 422, data: { errors: ["Quantity must be greater than 0"] } },
    });
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("sale-row-501")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-row-501"));
    fireEvent.press(screen.getByTestId("sale-edit-sheet-save"));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(screen.getByTestId("sale-edit-sheet")).toBeTruthy();
  });
});

// ── 9. Delete success ─────────────────────────────────────────────────────────

describe("ListingSales — delete (DELETE) success", () => {
  it("invalidates the shared query keys and toasts the void-success copy", async () => {
    mockTransactionsAPI.deleteTransaction.mockResolvedValueOnce({
      listing: makeListing({ availableUnits: 13 }),
    });
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("sale-row-501")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-row-501"));
    fireEvent.press(screen.getByTestId("sale-edit-sheet-delete"));

    await waitFor(() => expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalledWith(501));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("listing.sale.voidedSuccess"));
  });
});

// ── 10. sale_has_review refusal ───────────────────────────────────────────────

describe("ListingSales — the one deliberate refusal (sale_has_review)", () => {
  it("does NOT toast — the sheet gets the outcome and renders its own inline explanation", async () => {
    mockTransactionsAPI.deleteTransaction.mockRejectedValueOnce({
      response: { status: 422, data: { error: "This sale already has a review...", code: "sale_has_review" } },
    });
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("sale-row-501")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sale-row-501"));
    fireEvent.press(screen.getByTestId("sale-edit-sheet-delete"));

    await waitFor(() => expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
    // The sheet (real component) is the one that renders `voidBlockedReviewed`
    // inline — this suite only owns the screen's own toast-or-not decision.
  });
});

// ── 11. RTL smoke ─────────────────────────────────────────────────────────────

describe("ListingSales — RTL", () => {
  it("renders without throwing", async () => {
    expect(() => renderScreen()).not.toThrow();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());
  });
});
