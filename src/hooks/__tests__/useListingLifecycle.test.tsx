/**
 * useListingLifecycle — Jest unit tests (TASK-L863)
 *
 * This hook is the single source of truth SellerListingCard.tsx and
 * MyListingDetail.tsx both consume — its own exhaustive matrix test lives
 * here so the per-screen suites don't have to duplicate it. Covers:
 *
 *  1. Canonical primary action per status, including the expired-active
 *     override (draft→Publish, active→Mark reserved, active+expired→Renew,
 *     reserved→Mark sold, sold→none).
 *  2. `moreActions` never drops a variant: expired-active still offers Mark
 *     sold AND Mark reserved, reserved still offers Activate, Duplicate is
 *     available for every status including sold, Delete is always last.
 *  3. `confirmAlert` fires before every confirmAlert-gated mutation
 *     (publish/unpublish/activate/renew/delete) — the mutation only runs
 *     once the confirm button's onPress is invoked, never on cancel.
 *  4. Reserve/Mark sold skip confirmAlert entirely and drive `buyerPicker`
 *     instead (TASK-TX01); a sold response with `transaction.buyer` opens
 *     `reviewPrompt` (REV2).
 *  5. Delete renders with `danger: true` (destructive styling) and is the
 *     only `danger` row.
 *  6. The exact invalidation key set fires after every successful mutation.
 *  7. `onDeleted` fires (in addition to `onDone`) only after a successful
 *     delete — MyListingDetail's navigate-away hook.
 *  8. Tolerates `listing` being `undefined` (MyListingDetail calls this hook
 *     before its own loading guard, per the Rules of Hooks).
 */

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner-native";

import type { Listing } from "@/api/listings";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  CheckCircle2: "CheckCircle2",
  Clock: "Clock",
  EyeOff: "EyeOff",
  RotateCcw: "RotateCcw",
  Pencil: "Pencil",
  Copy: "Copy",
  Trash2: "Trash2",
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    publishListing: jest.fn(),
    reserveListing: jest.fn(),
    markSold: jest.fn(),
    unpublishListing: jest.fn(),
    activateListing: jest.fn(),
    renewListing: jest.fn(),
    deleteListing: jest.fn(),
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
// fresh jest.fn() per render) — needed because handleEdit/handleDuplicate
// close over `router` and we assert on the SAME push mock after a mutation
// has caused a re-render.
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// Import AFTER mocks
import { useListingLifecycle, MY_LISTINGS_QK, MY_LISTING_STATUS_COUNTS_QK, MY_LISTING_QK, CONVERSATIONS_QK } from "../useListingLifecycle";
import { listingsAPI } from "@/api/listings";
import { confirmAlert } from "@/utils/alert";

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Helpers ────────────────────────────────────────────────────────────────────

type MinimalListing = Pick<Listing, "status" | "expired">;

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

// ── 1. Primary action mapping ───────────────────────────────────────────────

describe("useListingLifecycle — primary action per status", () => {
  it("draft → Publish", () => {
    const { result } = renderLifecycle({ status: "draft", expired: false });
    expect(result.current.primaryAction?.label).toBe("listing.publish");
  });

  it("active (not expired) → Mark reserved", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.primaryAction?.label).toBe("listing.markReserved");
  });

  it("active + expired → Renew (overrides the status-based primary)", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    expect(result.current.primaryAction?.label).toBe("listing.renew");
  });

  it("reserved → Mark sold", () => {
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

// ── 2. moreActions — no variant dropped ─────────────────────────────────────

describe("useListingLifecycle — moreActions per status (no variant dropped)", () => {
  it("draft → only Edit, Duplicate, Delete", () => {
    const { result } = renderLifecycle({ status: "draft", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).toEqual(["edit", "duplicate", "delete"]);
  });

  it("active (not expired) → Mark sold, Unpublish, Edit, Duplicate, Delete", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "sold",
      "unpublish",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("active + expired → Mark sold AND Mark reserved are BOTH still reachable, plus Unpublish", () => {
    const { result } = renderLifecycle({ status: "active", expired: true });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "sold",
      "reserve",
      "unpublish",
      "edit",
      "duplicate",
      "delete",
    ]);
  });

  it("reserved → Activate is still reachable, plus Edit/Duplicate/Delete", () => {
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    expect(result.current.moreActions.map((a) => a.key)).toEqual([
      "activate",
      "edit",
      "duplicate",
      "delete",
    ]);
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
});

// ── 3. confirmAlert-gated mutations (publish/unpublish/activate/renew) ─────

describe("useListingLifecycle — confirmAlert fires before every gated mutation", () => {
  it("Publish: confirmAlert first, mutation only on confirm", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const { result } = renderLifecycle({ status: "draft", expired: false }, { listingId: 10 });

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
    const { result } = renderLifecycle({ status: "draft", expired: false });
    act(() => result.current.primaryAction!.onPress());
    simulateCancel();
    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
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

  it("Activate (from moreActions, reserved status): confirmAlert first, then mutate", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    const row = result.current.moreActions.find((a) => a.key === "activate")!;
    act(() => row.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmActivate",
      "listing.confirmActivateDescription",
      expect.anything()
    );

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
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    act(() => result.current.moreActions.find((a) => a.key === "activate")!.onPress());
    act(() => result.current.moreActions.find((a) => a.key === "delete")!.onPress());
    expect(mockConfirmAlert).toHaveBeenCalledTimes(2);
  });
});

// ── 4. Reserve / Mark sold — BuyerPickerSheet, never confirmAlert ──────────

describe("useListingLifecycle — reserve/sold drive buyerPicker, not confirmAlert", () => {
  it("primary Mark reserved (active) opens buyerPicker with action='reserve'", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("reserve");
  });

  it("primary Mark sold (reserved) opens buyerPicker with action='sold'", () => {
    const { result } = renderLifecycle({ status: "reserved", expired: false });
    act(() => result.current.primaryAction!.onPress());
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("sold");
  });

  it("Mark sold reachable from moreActions for an active (non-primary) listing opens buyerPicker too", () => {
    const { result } = renderLifecycle({ status: "active", expired: false });
    const row = result.current.moreActions.find((a) => a.key === "sold")!;
    act(() => row.onPress());
    expect(result.current.buyerPicker.visible).toBe(true);
    expect(result.current.buyerPicker.action).toBe("sold");
  });

  it("buyerPicker.onConfirm({}) calls reserveListing with an empty opts object (legacy skip path)", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({ listing: { status: "reserved" } as Listing });
    const { result } = renderLifecycle({ status: "active", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockListingsAPI.reserveListing).toHaveBeenCalledWith(10, {}));
    expect(mockToast.success).toHaveBeenCalledWith("listing.reserveSuccess");
  });

  it("buyerPicker.onConfirm({ buyerId }) calls markSold with the buyer id", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({ buyerId: 42 }));

    await waitFor(() => expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, { buyerId: 42 }));
  });

  it("closes buyerPicker after a successful reserve/sold confirm", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({ listing: { status: "reserved" } as Listing });
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
    expect(mockListingsAPI.reserveListing).not.toHaveBeenCalled();
  });

  it("REV2: a sold response carrying transaction.buyer opens reviewPrompt", async () => {
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

    await waitFor(() => expect(result.current.reviewPrompt.visible).toBe(true));
    expect(result.current.reviewPrompt.transactionId).toBe(99);
    expect(result.current.reviewPrompt.buyerName).toBe("Ahmad Karimi");
    expect(result.current.reviewPrompt.buyerAvatarUrl).toBe("https://example.com/a.jpg");
  });

  it("no transaction.buyer in the response never opens reviewPrompt (legacy skip path)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: { status: "sold" } as Listing });
    const { result } = renderLifecycle({ status: "reserved", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    act(() => result.current.buyerPicker.onConfirm({}));

    await waitFor(() => expect(mockListingsAPI.markSold).toHaveBeenCalled());
    expect(result.current.reviewPrompt.visible).toBe(false);
  });
});

// ── 5. Exact invalidation key set ───────────────────────────────────────────

describe("useListingLifecycle — invalidation keys (mandatory: list + status pills + owner detail refresh)", () => {
  it("invalidates my-listings, myListingStatusCounts, my-listing/:id and conversations/:id after Publish", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce({ status: "active" } as Listing);
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    const { result } = renderLifecycle({ status: "draft", expired: false }, { listingId: 10, qc });

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
    const { result } = renderLifecycle({ status: "draft", expired: false }, { listingId: 10, onDone });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});

// ── 6. onDeleted — MyListingDetail's navigate-away hook ─────────────────────

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
    const { result } = renderLifecycle({ status: "draft", expired: false }, { listingId: 10, onDeleted });

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

// ── 7. Edit / Duplicate navigation ──────────────────────────────────────────

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

// ── 8. isBusy ────────────────────────────────────────────────────────────────

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
    const { result } = renderLifecycle({ status: "draft", expired: false }, { listingId: 10 });

    act(() => result.current.primaryAction!.onPress());
    simulateConfirm();

    await waitFor(() => expect(result.current.isBusy).toBe(true));

    act(() => resolvePublish({ status: "active" } as Listing));

    await waitFor(() => expect(result.current.isBusy).toBe(false));
  });
});
