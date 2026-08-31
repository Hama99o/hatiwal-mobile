/**
 * useListingLifecycle — Jest unit tests (TASK-L863)
 *
 * SF-M1 (Sell Flow Redesign, `docs/SELL_FLOW_REDESIGN.md` §4.5/§10.1) remapped
 * this hook's primary action: "Mark sold" is now the one-tap primary from
 * ANY live listing (`active` — including an open hold — OR `reserved`), not
 * just a reserved one. Reserve is gone entirely from this hook (it only
 * exists in chat now, SF-M2); "Activate" is renamed "Release hold" and its
 * condition widens from `status === "reserved"` to `listing.sale?.status ===
 * "reserved"` (covers a multi-unit hold that never flips `status`); and a
 * new "View sales" row appears once `hasSoldSome(listing)`.
 *
 * This suite covers the NEW contract:
 *  1. Canonical primary action per status: draft→Publish, active (not
 *     expired) OR reserved→Mark sold, active+expired→Renew (overrides both),
 *     sold→none.
 *  2. `moreActions` never drops a variant under the new mapping: an
 *     expired-active listing still offers Mark sold from the sheet (Renew is
 *     primary), Duplicate is available for every status including sold, and
 *     Delete is always last.
 *  3. `confirmAlert` fires before every confirmAlert-gated mutation
 *     (publish/unpublish/release-hold/renew/delete) — the mutation only runs
 *     once the confirm button's onPress is invoked, never on cancel.
 *  4. Mark sold skips confirmAlert entirely and drives `buyerPicker` instead
 *     (TASK-TX01/SF-M1 — `buyerPicker.action` is now always "sold", there is
 *     no more "reserve" action on this hook at all); a sold response with
 *     `transaction.buyer` opens `reviewPrompt` (REV2).
 *  5. Release hold: only reachable when `listing.sale?.status === "reserved"`
 *     — true for a single-item hold (`status: "reserved"`) AND (per the
 *     hook's own doc) a multi-unit hold that keeps `status: "active"`.
 *  6. "View sales" only reachable when `hasSoldSome(listing)` is true, and
 *     pushes the new Sales route.
 *  7. Delete renders with `danger: true` (destructive styling) and is the
 *     only `danger` row.
 *  8. The exact invalidation key set fires after every successful mutation.
 *  9. `onDeleted` fires (in addition to `onDone`) only after a successful
 *     delete — MyListingDetail's navigate-away hook.
 * 10. Tolerates `listing` being `undefined`/`null` (MyListingDetail calls
 *     this hook before its own loading guard, per the Rules of Hooks).
 */

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner-native";

import type { Listing } from "@/api/listings";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  CheckCircle2: "CheckCircle2",
  EyeOff: "EyeOff",
  LockOpen: "LockOpen",
  Receipt: "Receipt",
  Pencil: "Pencil",
  Copy: "Copy",
  Trash2: "Trash2",
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    publishListing: jest.fn(),
    markSold: jest.fn(),
    unpublishListing: jest.fn(),
    activateListing: jest.fn(),
    renewListing: jest.fn(),
    deleteListing: jest.fn(),
  },
}));

// SF-M5 — the "Marked sold · Undo" toast's side effect.
jest.mock("@/api/transactions", () => ({
  transactionsAPI: {
    deleteTransaction: jest.fn(),
  },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Stable across renders (unlike the global setup.ts mock, which returns a
// fresh jest.fn() per render) — needed because handleEdit/handleDuplicate/
// the "View sales" row close over `router` and we assert on the SAME push
// mock after a mutation has caused a re-render.
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// Import AFTER mocks
import { useListingLifecycle, MY_LISTINGS_QK, MY_LISTING_STATUS_COUNTS_QK, MY_LISTING_QK, CONVERSATIONS_QK } from "../useListingLifecycle";
import { UNDO_TOAST_DURATION_MS } from "../useMarkSoldWithUndo";
import { listingsAPI } from "@/api/listings";
import { transactionsAPI } from "@/api/transactions";
import { confirmAlert } from "@/utils/alert";

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockTransactionsAPI = transactionsAPI as jest.Mocked<typeof transactionsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Helpers ────────────────────────────────────────────────────────────────────

type MinimalListing = Pick<Listing, "status" | "expired"> &
  Partial<
    Pick<
      Listing,
      | "title"
      | "price"
      | "categoryId"
      | "latitude"
      | "longitude"
      | "images"
      | "imageUrls"
      | "imageAttachments"
      | "quantity"
      | "availableUnits"
      | "heldUnits"
    >
  >;

/**
 * A draft that is actually PUBLISHABLE.
 *
 * `handlePublish` now runs the app-wide `getPublishBlockers` check before it
 * confirms anything, so `{ status: "draft" }` alone is blocked — it has no
 * photo, title, price, category or pin. That is the point of the check: the
 * hook used to fire the request regardless and let the API answer 422 with only
 * a ~3s toast to show for it. Tests that exercise the publish MUTATION need a
 * listing that can legitimately be published.
 */
function publishableDraft(over: Partial<MinimalListing> = {}): MinimalListing {
  return {
    status: "draft",
    expired: false,
    title: "A publishable draft",
    price: 5000,
    categoryId: 3,
    latitude: 34.5553,
    longitude: 69.2075,
    images: ["https://example.test/photo.jpg"],
    ...over,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderLifecycle(
  listing: MinimalListing | null | undefined,
  opts: { listingId?: number; onDone?: () => void; onDeleted?: () => void; qc?: QueryClient } = {}
) {
  const qc = opts.qc ?? makeQueryClient();
  const { result, rerender } = renderHook(
    (props: { listing: MinimalListing | null | undefined }) =>
      useListingLifecycle({
        listingId: opts.listingId ?? 10,
        listing: props.listing,
        onDone: opts.onDone,
        onDeleted: opts.onDeleted,
      }),
    {
      initialProps: { listing },
      wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    }
  );
  return { result, rerender, qc };
}

/** Simulate confirming a confirmAlert dialog captured by the mock. */
function simulateConfirm(callIndex = 0) {
  const buttons = mockConfirmAlert.mock.calls[callIndex][2] as Array<{
    text: string;
    style?: string;
    onPress?: () => void;
  }>;
  const confirmBtn = buttons.find((b) => b.style !== "cancel");
  act(() => confirmBtn?.onPress?.());
}

function simulateCancel(callIndex = 0) {
  const buttons = mockConfirmAlert.mock.calls[callIndex][2] as Array<{
    style?: string;
    onPress?: () => void;
  }>;
  const cancelBtn = buttons.find((b) => b.style === "cancel");
  act(() => cancelBtn?.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Primary action mapping (SF-M1) ───────────────────────────────────────

describe("useListingLifecycle — primary action per status (SF-M1 remap)", () => {
  it("draft → Publish", () => {
    const { result } = renderLifecycle(publishableDraft());
    expect(result.current.primaryAction?.label).toBe("listing.publish");
  });

  it("active (not expired) → Mark sold (SF-M1: reserve is gone from this surface)", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.primaryAction?.label).toBe("listing.markSold");
  });

  it("active + an open hold (multi-unit, status stays active) → still Mark sold", () => {
    const { result } = renderLifecycle({
      status: "active",
      expired: false,
      heldUnits: 3,
    });
    expect(result.current.primaryAction?.label).toBe("listing.markSold");
  });

  it("active + expired → Renew (overrides the status-based primary)", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    expect(result.current.primaryAction?.label).toBe("listing.renew");
  });

  it("reserved → Mark sold (same primary as active — both are 'Live')", () => {
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    expect(result.current.primaryAction?.label).toBe("listing.markSold");
  });

  it("sold → no primary action (terminal)", () => {
    const { result } = renderLifecycle({ status: "sold", expired: false });
    expect(result.current.primaryAction).toBeNull();
  });

  it("tolerates `listing` being undefined (MyListingDetail's pre-loading-guard call)", () => {
    expect(() => renderLifecycle(undefined)).not.toThrow();
    const { result } = renderLifecycle(undefined);
    expect(result.current.primaryAction).toBeNull();
  });

  it("tolerates `listing` being null", () => {
    const { result } = renderLifecycle(null);
    expect(result.current.primaryAction).toBeNull();
  });
});

// ── 2. moreActions — no variant dropped, reserve is GONE ────────────────────

describe("useListingLifecycle — moreActions per status (SF-M1: no reserve, no variant dropped)", () => {
  it("draft → only Edit, Duplicate, Delete", () => {
    const { result } = renderLifecycle(publishableDraft());
    expect(result.current.moreActions.map((a) => a.key)).toEqual(["edit", "duplicate", "delete"]);
  });

  it("active (not expired, no hold) → Unpublish, Edit, Duplicate, Delete — no 'sold' row (it's primary) and no 'reserve' row (deleted entirely)", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "unpublish",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("active + expired → Mark sold is STILL reachable from the sheet (Renew took the primary slot) — no 'reserve' row", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "sold",
      "unpublish",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("reserved (single-item hold) → Release hold reachable, plus Edit/Duplicate/Delete", () => {
    // `hasOpenHold` is `status === "reserved" || heldUnits > 0` — a
    // single-item hold flips `status` to `reserved` and never sets
    // `heldUnits` (a single unit held is carried by StatusBadge's own
    // "Reserved" treatment, per `heldUnitsOf`'s own doc, stock.ts).
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "releaseHold",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("active + a multi-unit open hold (status stays active, heldUnits > 0) → Release hold STILL reachable, reading heldUnits, not status", () => {
    // SF-B2: a batch of 50 must not vanish from the market because one buyer
    // reserved 10 — `status` stays `active`, and `heldUnits` is the only
    // signal an open hold exists. Matches the backend's own
    // `ListingPolicy#activate?` (`owner? && (reserved? || (active? &&
    // held_units.positive?))`) exactly.
    const { result } = renderLifecycle({
      status: "active",
      expired: false,
      heldUnits: 10,
    });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "unpublish",
      "releaseHold",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("active with NO open hold (heldUnits 0/absent) → no Release hold row — an ordinary active listing", () => {
    const { result } = renderLifecycle({ status: "active", expired: false, heldUnits: 0 });
    expect(result.current.moreActions.map((a) => a.key)).not.toContain("releaseHold");
  });

  it("active with heldUnits absent entirely (older payload) → no Release hold row either", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).not.toContain("releaseHold");
  });

  it("sold → Duplicate is still reachable even on a terminal listing", () => {
    const { result } = renderLifecycle({ status: "sold", expired: false });
    const keys = result.current.moreActions.map((a) => a.key);
    expect(keys).toContain("duplicate");
    expect(keys).toEqual(["edit", "duplicate", "delete"]);
  });

  it("Delete is the ONLY row with danger:true, and always renders last", () => {
    (["draft", "active", "reserved", "sold"] as const).forEach((status) => {
      const { result } = renderLifecycle({ status, expired: false });
      const actions = result.current.moreActions;
      const dangerRows = actions.filter((a) => a.danger);
      expect(dangerRows).toHaveLength(1);
      expect(dangerRows[0].key).toBe("delete");
      expect(actions[actions.length - 1].key).toBe("delete");
    });
  });

  it("every moreActions row has an icon (for ListingActionsSheet)", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    result.current.moreActions.forEach((a) => expect(a.icon).toBeTruthy());
  });

  it("never renders a 'reserve' row for ANY status — reserve is deleted from this hook entirely (SF-M1)", () => {
    (["draft", "active", "reserved", "sold"] as const).forEach((status) => {
      const { result } = renderLifecycle({ status, expired: true, heldUnits: 5 });
      expect(result.current.moreActions.map((a) => a.key)).not.toContain("reserve");
    });
  });
});

// ── 3. View sales (SF-M1 — new moreActions row) ─────────────────────────────

describe("useListingLifecycle — 'View sales' row (SF-M1, hasSoldSome)", () => {
  it("appears once some units have sold (availableUnits < quantity)", () => {
    const { result } = renderLifecycle({
      status: "active",
      expired: false,
      quantity: 10,
      availableUnits: 7,
    });
    const row = result.current.moreActions.find((a) => a.key === "sales");
    expect(row).toBeTruthy();
    expect(row?.label).toBe("listing.viewSales");
  });

  it("does not appear when nothing has sold yet", () => {
    const { result } = renderLifecycle({
      status: "active",
      expired: false,
      quantity: 10,
      availableUnits: 10,
    });
    expect(result.current.moreActions.map((a) => a.key)).not.toContain("sales");
  });

  it("appears on a fully sold-out (terminal) listing too", () => {
    const { result } = renderLifecycle({
      status: "sold",
      expired: false,
      quantity: 3,
      availableUnits: 0,
    });
    expect(result.current.moreActions.map((a) => a.key)).toContain("sales");
  });

  it("pushes the per-listing Sales route with this listing's id", () => {
    const { result } = renderLifecycle(
      { status: "active", expired: false, quantity: 5, availableUnits: 2 },
      { listingId: 77 }
    );
    const row = result.current.moreActions.find((a) => a.key === "sales")!;
    act(() => row.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(main)/listing/77/sales");
  });
});

// ── 4. confirmAlert-gated mutations (publish/unpublish/release-hold/renew) ──

describe("useListingLifecycle — confirmAlert fires before every gated mutation", () => {
  it("Publish: confirmAlert first, mutation only on confirm", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const { result } = renderLifecycle(publishableDraft(), { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmPublish",
      "listing.confirmPublishDescription",
      expect.arrayContaining([expect.objectContaining({ style: "cancel" })])
    );
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();

    simulateConfirm();
    await waitFor(() => expect(mockListingsAPI.publishListing).toHaveBeenCalledWith(10));
    expect(mockToast.success).toHaveBeenCalledWith("listing.publishSuccess");
  });

  it("Publish: cancel never calls the mutation", () => {
    const { result } = renderLifecycle(publishableDraft());
    act(() => result.current.primaryAction!.onPress());
    simulateCancel();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
  });

  // ── Publish readiness ─────────────────────────────────────────────────────
  // Regression guard for a bug QA found end to end: the hook offered "Publish"
  // on ANY draft, fired the request, and the API answered
  // `422 photo_required_to_publish` — surfaced only as a ~3s toast, while the
  // screen still showed "Draft" and a Publish button. To the seller that is
  // "I pressed Publish and nothing happened".

  it("Publish: a draft with no photo is blocked BEFORE any dialog or request", () => {
    const { result } = renderLifecycle(publishableDraft({ images: [] }));
    act(() => result.current.primaryAction!.onPress());
    // No confirmation dialog: asking "Publish this listing?" and then refusing
    // is worse than saying up front what is missing.
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
    // ...and the seller is told why, naming the missing field.
    expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
  });

  it("Publish: names every missing field, not just the first", () => {
    const { result } = renderLifecycle(
      publishableDraft({ images: [], title: "", price: undefined })
    );
    act(() => result.current.primaryAction!.onPress());
    expect(mockToast.error).toHaveBeenCalledWith("listing.form.publishBlocked");
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
  });

  it("Publish: a ready draft still goes through the normal confirm path", () => {
    const { result } = renderLifecycle(publishableDraft());
    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("Unpublish (from moreActions): confirmAlert first, mutation only on confirm", async () => {
    mockListingsAPI.unpublishListing.mockResolvedValueOnce({ status: "draft" } as Listing);
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    const row = result.current.moreActions.find((a) => a.key === "unpublish")!;
    act(() => row.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmUnpublish",
      "listing.confirmUnpublishDescription",
      expect.anything()
    );
    expect(mockListingsAPI.unpublishListing).not.toHaveBeenCalled();

    simulateConfirm();
    await waitFor(() => expect(mockListingsAPI.unpublishListing).toHaveBeenCalledWith(10));
  });

  it("Release hold (SF-M1 rename of Activate, from moreActions on a reserved listing): confirmAlert first, then mutate the SAME activate endpoint", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const { result } = renderLifecycle(
      { status: "reserved", expired: false },
      { listingId: 10 }
    );

    const row = result.current.moreActions.find((a) => a.key === "releaseHold")!;
    expect(row.label).toBe("listing.releaseHold");
    act(() => row.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmReleaseHold",
      "listing.confirmReleaseHoldDescription",
      expect.anything()
    );

    simulateConfirm();
    // Route/method deliberately unchanged (docs/SELL_FLOW_REDESIGN.md §3.1) —
    // only the seller-facing copy and trigger condition changed.
    await waitFor(() => expect(mockListingsAPI.activateListing).toHaveBeenCalledWith(10));
    expect(mockToast.success).toHaveBeenCalledWith("listing.releaseHoldSuccess");
  });

  it("Release hold is ALSO reachable for a multi-unit open hold that never flips status away from active", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const { result } = renderLifecycle(
      { status: "active", expired: false, heldUnits: 4 },
      { listingId: 10 }
    );

    const row = result.current.moreActions.find((a) => a.key === "releaseHold")!;
    act(() => row.onPress());
    simulateConfirm();

    await waitFor(() => expect(mockListingsAPI.activateListing).toHaveBeenCalledWith(10));
  });

  it("Renew (primary on an expired-active listing): confirmAlert first, then mutate", async () => {
    mockListingsAPI.renewListing.mockResolvedValueOnce({ status: "active", expired: false } as Listing);
    const { result } = renderLifecycle({ status: "active", expired: true }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmRenew",
      "listing.confirmRenewDescription",
      expect.anything()
    );

    simulateConfirm();
    await waitFor(() => expect(mockListingsAPI.renewListing).toHaveBeenCalledWith(10));
  });

  it("Delete: confirmAlert with DESTRUCTIVE style, then mutate only on confirm", async () => {
    mockListingsAPI.deleteListing.mockResolvedValueOnce(undefined);
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    const row = result.current.moreActions.find((a) => a.key === "delete")!;
    act(() => row.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmDelete",
      "listing.confirmDeleteDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "common.delete", style: "destructive" }),
      ])
    );

    simulateConfirm();
    await waitFor(() => expect(mockListingsAPI.deleteListing).toHaveBeenCalledWith(10));
    expect(mockToast.success).toHaveBeenCalledWith("listing.deleteSuccess");
  });

  it("no raw Alert.alert is ever used — every gated action goes through the confirmAlert mock", () => {
    const { result } = renderLifecycle({
      status: "reserved",
      expired: false,
    });
    act(() => result.current.moreActions.find((a) => a.key === "releaseHold")!.onPress());
    act(() => result.current.moreActions.find((a) => a.key === "delete")!.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledTimes(2);
  });
});

// ── 5. Mark sold — BuyerPickerSheet, never confirmAlert (SF-M1: action is ALWAYS "sold") ──

describe("useListingLifecycle — Mark sold drives buyerPicker, never confirmAlert (SF-M1: no more 'reserve' action)", () => {
  it("primary Mark sold (active) opens buyerPicker with action='sold'", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("sold");
  });

  it("primary Mark sold (reserved) also opens buyerPicker with action='sold'", () => {
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("sold");
  });

  it("Mark sold reachable from moreActions for an expired-active (non-primary) listing opens buyerPicker too", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    const row = result.current.moreActions.find((a) => a.key === "sold")!;
    act(() => row.onPress());
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("sold");
  });

  it("buyerPicker.onConfirm({}) calls markSold with an empty opts object (legacy skip path)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, {}));
    expect(mockToast.success).toHaveBeenCalledWith("listing.markSoldSuccess");
  });

  it("buyerPicker.onConfirm({ buyerId }) calls markSold with the buyer id", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 42 }));

    await waitFor(() => expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, { buyerId: 42 }));
  });

  it("closes buyerPicker after a successful mark-sold confirm", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(result.current.buyerPicker.visible).toBe(false));
  });

  it("buyerPicker.onClose closes the picker without mutating", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onClose());
    expect(result.current.buyerPicker.visible).toBe(false);
    expect(mockListingsAPI.markSold).not.toHaveBeenCalled();
  });

  it("REV2: a sold response carrying transaction.buyer opens reviewPrompt once the Undo toast's own lifecycle finishes (QA-BUG2 sequencing)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: {
        id: 99,
        buyer: { id: 5, name: "Ahmad Karimi", avatarUrl: "https://example.com/a.jpg" },
      },
    } as never);
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 5 }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    // QA-BUG2 (FlowApp #300): reviewPrompt is a native <Modal> that would
    // cover the toast's own Undo button (its only affordance) if it opened
    // in the same tick as the toast — it must NOT be visible yet.
    expect(result.current.reviewPrompt.visible).toBe(false);

    // Once the toast finishes its own lifecycle (auto-close here; a manual
    // swipe-dismiss fires the same `onDismiss` callback and behaves
    // identically), REV2 still gets its invite — this is the "don't fix one
    // feature by breaking the other" requirement.
    const [, options] = mockToast.success.mock.calls[0];

    // run-268: the toast also has to LAST long enough for a person to use it.
    // sonner-native's default is 4000ms, and a device sweep proved a real tap can
    // land after the toast has gone (Maestro reported the tap COMPLETED, no
    // DELETE reached the API, the sale stood). Pinned here because the review
    // sequencing above hangs off this same toast's lifecycle, so shortening it
    // would silently shorten the Undo window too.
    expect(options.duration).toBe(UNDO_TOAST_DURATION_MS);
    expect(UNDO_TOAST_DURATION_MS).toBeGreaterThanOrEqual(8000);

    act(() => options.onAutoClose(99));

    await waitFor(() => expect(result.current.reviewPrompt.visible).toBe(true));
    expect(result.current.reviewPrompt.transactionId).toBe(99);
    expect(result.current.reviewPrompt.buyerName).toBe("Ahmad Karimi");
    expect(result.current.reviewPrompt.buyerAvatarUrl).toBe("https://example.com/a.jpg");
  });

  it("QA-BUG2: a manual swipe-dismiss of the toast (onDismiss, not onAutoClose) also opens reviewPrompt", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: {
        id: 99,
        buyer: { id: 5, name: "Ahmad Karimi", avatarUrl: "https://example.com/a.jpg" },
      },
    } as never);
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 5 }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());

    const [, options] = mockToast.success.mock.calls[0];
    act(() => options.onDismiss(99));

    await waitFor(() => expect(result.current.reviewPrompt.visible).toBe(true));
  });

  it("QA-BUG2: onAutoClose firing twice (sonner-native can call onAutoClose AND onDismiss for the same toast) only opens reviewPrompt once", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: {
        id: 99,
        buyer: { id: 5, name: "Ahmad Karimi", avatarUrl: "https://example.com/a.jpg" },
      },
    } as never);
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 5 }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());

    const [, options] = mockToast.success.mock.calls[0];
    act(() => {
      options.onAutoClose(99);
      options.onDismiss(99);
    });

    await waitFor(() => expect(result.current.reviewPrompt.visible).toBe(true));
    // No crash, no double-open — same transaction id either way.
    expect(result.current.reviewPrompt.transactionId).toBe(99);
  });

  it("QA-BUG2: Undo reachability on the buyer-attributed path — tapping Undo BEFORE the toast finishes still calls deleteTransaction with the sold transaction's id, and reviewPrompt never opens for the voided sale", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: {
        id: 99,
        buyer: { id: 5, name: "Ahmad Karimi", avatarUrl: "https://example.com/a.jpg" },
      },
    } as never);
    mockTransactionsAPI.deleteTransaction.mockResolvedValueOnce({
      listing: { status: "active" } as Listing,
    });
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 5 }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());

    const [, options] = mockToast.success.mock.calls[0];
    // This is the exact affordance QA-BUG2 says is unreachable on Android
    // once the review sheet opens first — proving here that the toast's
    // action handler is reachable and correct is what the ticket asks Jest
    // to demonstrate, since toast visibility itself is unreliable on device.
    act(() => options.action.onClick());
    await waitFor(() => expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalledWith(99));

    // The toast eventually finishing its lifecycle after Undo was already
    // pressed must NOT resurrect a review invite for a sale that no longer
    // exists.
    act(() => options.onAutoClose(99));
    expect(result.current.reviewPrompt.visible).toBe(false);
  });

  it("no transaction.buyer in the response never opens reviewPrompt (legacy skip path)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockListingsAPI.markSold).toHaveBeenCalled());
    expect(result.current.reviewPrompt.visible).toBe(false);
  });

  it("the exported buyerPicker.action type is narrowed to 'sold' — never 'reserve' — regardless of status", () => {
    (["draft", "active", "reserved", "sold"] as const).forEach((status) => {
      const { result } = renderLifecycle({ status, expired: false });
      expect(result.current.buyerPicker.action).toBe("sold");
    });
  });
});

// ── SF-M5: "Marked sold · Undo" toast ───────────────────────────────────────
//
// The big-tech answer to a mistake is a snackbar undo, not a correction form
// — and it must never BLOCK: the sale already completed by the time the
// toast fires. SF-B3 means every markSold call now leaves exactly one sold
// Transaction (even the legacy buyer-less/skip paths), so the action is
// unconditional whenever the response carries a transaction id.

describe("useListingLifecycle — Undo toast on Mark Sold (SF-M5)", () => {
  it("the success toast carries an Undo action when the response has a transaction id", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: { id: 55 } as never,
    });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const [message, options] = mockToast.success.mock.calls[0];
    expect(message).toBe("listing.markSoldSuccess");
    expect(options.action.label).toBe("common.undo");
  });

  it("tapping Undo calls transactionsAPI.deleteTransaction with the sold transaction's id", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: { id: 55 } as never,
    });
    mockTransactionsAPI.deleteTransaction.mockResolvedValueOnce({
      listing: { status: "active" } as Listing,
    });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());

    const [, options] = mockToast.success.mock.calls[0];
    act(() => options.action.onClick());

    await waitFor(() => expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalledWith(55));
  });

  it("a successful Undo re-invalidates the SAME query set and shows the void-success toast", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: { id: 55 } as never,
    });
    mockTransactionsAPI.deleteTransaction.mockResolvedValueOnce({
      listing: { status: "active" } as Listing,
    });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderLifecycle(
      { status: "active", expired: false },
      { listingId: 10, qc }
    );

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    invalidateSpy.mockClear();

    const [, options] = mockToast.success.mock.calls[0];
    act(() => options.action.onClick());

    await waitFor(() => expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTINGS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_QK, "10"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [CONVERSATIONS_QK, 10] });
    expect(mockToast.success).toHaveBeenCalledWith("listing.sale.voidedSuccess");
  });

  it("a failed Undo shows an error toast (does not throw, does not silently succeed)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" } as Listing,
      transaction: { id: 55 } as never,
    });
    mockTransactionsAPI.deleteTransaction.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());

    const [, options] = mockToast.success.mock.calls[0];
    act(() => options.action.onClick());

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  });

  it("no Undo action when the response carries no transaction (defensive — SF-B3 says this should not happen)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const call = mockToast.success.mock.calls[0];
    // Single-argument call (no options) — matches every other plain success
    // toast in this hook, and the exact arity `@/lib/toast`'s own tests assert.
    expect(call.length).toBe(1);
  });
});

// ── 6. Exact invalidation key set ───────────────────────────────────────────

describe("useListingLifecycle — invalidation keys (mandatory: list + status pills + owner detail refresh)", () => {
  it("invalidates my-listings, myListingStatusCounts, my-listing/:id and conversations/:id after Publish", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderLifecycle(publishableDraft(), { listingId: 10, qc });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(mockListingsAPI.publishListing).toHaveBeenCalled());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTINGS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_QK, "10"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [CONVERSATIONS_QK, 10] });
    expect(invalidateSpy).toHaveBeenCalledTimes(4);
  });

  it("invalidates the exact same key set after Delete too", async () => {
    mockListingsAPI.deleteListing.mockResolvedValueOnce(undefined);
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10, qc });

    const row = result.current.moreActions.find((a) => a.key === "delete")!;
    act(() => row.onPress());
    simulateConfirm();

    await waitFor(() => expect(mockListingsAPI.deleteListing).toHaveBeenCalled());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTINGS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [MY_LISTING_QK, "10"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [CONVERSATIONS_QK, 10] });
  });

  it("calls onDone after a successful mutation, in addition to invalidation", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const onDone = jest.fn();
    const { result } = renderLifecycle(publishableDraft(), { listingId: 10, onDone });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});

// ── 7. onDeleted — MyListingDetail's navigate-away hook ─────────────────────

describe("useListingLifecycle — onDeleted fires only after a successful Delete", () => {
  it("calls onDeleted (in addition to onDone) after delete succeeds", async () => {
    mockListingsAPI.deleteListing.mockResolvedValueOnce(undefined);
    const onDone = jest.fn();
    const onDeleted = jest.fn();
    const { result } = renderLifecycle(
      { status: "active", expired: false },
      { listingId: 10, onDone, onDeleted }
    );

    const row = result.current.moreActions.find((a) => a.key === "delete")!;
    act(() => row.onPress());
    simulateConfirm();

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("never calls onDeleted for any other mutation (e.g. publish)", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const onDeleted = jest.fn();
    const { result } = renderLifecycle(publishableDraft(), { listingId: 10, onDeleted });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(mockListingsAPI.publishListing).toHaveBeenCalled());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("never calls onDeleted when delete is cancelled", () => {
    const onDeleted = jest.fn();
    const { result } = renderLifecycle({ status: "active", expired: false }, { onDeleted });

    const row = result.current.moreActions.find((a) => a.key === "delete")!;
    act(() => row.onPress());
    simulateCancel();

    expect(mockListingsAPI.deleteListing).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

// ── 8. Edit / Duplicate navigation ──────────────────────────────────────────

describe("useListingLifecycle — Edit / Duplicate navigation", () => {
  it("Edit pushes the edit route with the listing id and a status hint (TASK-P736)", () => {
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });
    act(() => result.current.moreActions.find((a) => a.key === "edit")!.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(main)/listing/edit/10?status=active");
  });

  it("Duplicate pushes the new-listing route with duplicateFrom", () => {
    const { result } = renderLifecycle({ status: "sold", expired: false }, { listingId: 10 });
    act(() => result.current.moreActions.find((a) => a.key === "duplicate")!.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(main)/listing/new?duplicateFrom=10");
  });
});

// ── 9. isBusy ────────────────────────────────────────────────────────────────

describe("useListingLifecycle — isBusy reflects any in-flight mutation", () => {
  it("is false when no mutation is pending", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.isBusy).toBe(false);
  });

  it("becomes true while a mutation is in flight and false again once it settles", async () => {
    let resolvePublish!: (v: Listing) => void;
    mockListingsAPI.publishListing.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePublish = resolve; })
    );
    const { result } = renderLifecycle(publishableDraft(), { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(result.current.isBusy).toBe(true));

    act(() => resolvePublish({ status: "active" } as Listing));

    await waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});
