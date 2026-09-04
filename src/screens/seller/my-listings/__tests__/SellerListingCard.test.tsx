/**
 * SellerListingCard — Jest unit tests (TASK-L863)
 *
 * SellerListingCard no longer owns any lifecycle mutations/handlers itself —
 * all of that now lives in `useListingLifecycle` (see its own exhaustive
 * matrix test at `src/hooks/__tests__/useListingLifecycle.test.tsx`). This
 * suite instead asserts the CARD's rendering contract, updated for SF-M1
 * (`docs/SELL_FLOW_REDESIGN.md` §4.5/§10.1):
 *
 *  1. Exactly two controls render: the primary button (when there is one)
 *     plus a compact "More" trigger — never the old 6-button wall.
 *  2. Status -> primary label mapping: draft→Publish, active OR
 *     reserved→Mark sold (SF-M1: both are "Live" and share one primary),
 *     active+expired→Renew, sold→none.
 *  3. The primary button's own action fires directly (Publish/Renew go
 *     through confirmAlert; Mark sold opens BuyerPickerSheet).
 *  4. Every action that is NOT the primary for a given status is reachable
 *     by opening "More" and tapping the row inside `ListingActionsSheet`
 *     (Mark sold via More for an expired-active listing, Unpublish, Release
 *     hold — SF-M1's rename of Activate, gated on `listing.sale?.status ===
 *     "reserved"` rather than `status === "reserved"` — View sales, Edit,
 *     Duplicate, and Delete — destructive, confirmAlert-gated).
 *  5. There is no "reserve" row anywhere, for any status — SF-M1 deletes
 *     reserve from this surface entirely (it only exists in chat now).
 *  6. views_count / conversations_count / no-photo fallback still render.
 *
 * No real network calls — listingsAPI is fully mocked.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Listing, ListingSale } from "@/api/listings";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// react-native-reanimated: full mock covering Animated.View, shared values, etc.
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    useSharedValue: jest.fn((v) => ({ value: v })),
    useAnimatedStyle: jest.fn((fn) => {
      try { fn(); } catch (_e) { /* noop */ }
      return {};
    }),
    withSpring: jest.fn((v) => v),
    withTiming: jest.fn((v) => v),
    withRepeat: jest.fn((v) => v),
    withSequence: jest.fn((...args) => args[0]),
    withDelay: jest.fn((_d, v) => v),
    runOnUI: jest.fn((fn) => fn),
    runOnJS: jest.fn((fn) => fn),
    interpolate: jest.fn((_v, _i, o) => o[0]),
    Extrapolation: { CLAMP: "CLAMP" },
    cancelAnimation: jest.fn(),
    Easing: { linear: jest.fn((v) => v), ease: jest.fn((v) => v), bezier: jest.fn(() => jest.fn((v) => v)) },
    createAnimatedComponent: jest.fn((C) => C),
  };
});

// Lucide icons — mock to strings so they don't crash. Covers icons used
// directly by the card (Eye/MessageCircle/Camera/MoreHorizontal) AND the
// icons useListingLifecycle attaches to each ListingActionsSheet row
// (SF-M1: LockOpen for Release hold, Receipt for View sales).
jest.mock("lucide-react-native", () => ({
  Eye: "Eye",
  MessageCircle: "MessageCircle",
  Camera: "Camera",
  MoreHorizontal: "MoreHorizontal",
  CheckCircle2: "CheckCircle2",
  EyeOff: "EyeOff",
  LockOpen: "LockOpen",
  Receipt: "Receipt",
  Pencil: "Pencil",
  Copy: "Copy",
  Trash2: "Trash2",
}));

// listingsAPI — mock every lifecycle method using jest.fn() inside factory
// Access individual fns via jest.mocked(listingsAPI) after import.
// SF-M1: reserveListing is gone from this hook's dependency surface entirely.
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

// confirmAlert — capture calls so we can invoke the confirm handler in tests
jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

// sonner-native — capture toast calls
jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// RemoteImage — render nothing
jest.mock("@/components/common/RemoteImage", () => ({
  RemoteImage: () => null,
}));

// @/lib/animation — mock usePulse (used by PhotoSkeleton) and useReduceMotion
jest.mock("@/lib/animation", () => ({
  usePulse: () => ({}),
  useReduceMotion: () => false,
  triggerHaptic: jest.fn(),
  useListItemEntering: () => () => undefined,
  getListItemEntering: () => undefined,
  AnimatedPressable: require("react-native").Pressable,
}));

// PriceTag — render price as plain text for assertions
jest.mock("@/components/common/PriceTag", () => ({
  PriceTag: "PriceTag",
}));

// StatusBadge — render status key
jest.mock("@/components/common/StatusBadge", () => ({
  StatusBadge: "StatusBadge",
}));

// ExpiryBadge — render nothing (not under test here)
jest.mock("@/components/common/ExpiryBadge", () => ({
  ExpiryBadge: () => null,
}));

// BuyerPickerSheet (TASK-TX01) — a minimal stand-in exposing two test-only
// buttons: "confirm-skip" (legacy no-buyer path) and "confirm-buyer-42"
// (buyer_id: 42). Uses the manual mock at
// `src/components/common/__mocks__/BuyerPickerSheet.tsx` — an inline JSX-
// returning factory crashes babel-plugin-jest-hoist (T704). Real sheet
// behavior is covered by its own unit tests.
jest.mock("@/components/common/BuyerPickerSheet");

// ReviewPromptSheet opens after a sale is recorded; it uses react-query
// (useMutation), which these lifecycle tests don't provide. It has its own
// tests — stub it out. Null factory (no require/JSX) is babel-hoist-safe.
jest.mock("@/components/common/ReviewPromptSheet", () => ({
  ReviewPromptSheet: () => null,
}));

// Import AFTER mocks
import { SellerListingCard } from "../SellerListingCard";
import { listingsAPI } from "@/api/listings";
import { confirmAlert } from "@/utils/alert";
import { toast } from "sonner-native";

// ── Typed mock helpers ─────────────────────────────────────────────────────────

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Fixture factory ────────────────────────────────────────────────────────────

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 10,
  title: "Lenovo ThinkPad X1 Carbon",
  description: "Used 6 months. No scratches.",
  price: 85000,
  currency: "AFN",
  status: "active",
  categoryId: 1,
  location: "Kabul, Share Naw",
  address: null,
  latitude: null,
  longitude: null,
  thumbnailUrl: null,
  imageUrls: [],
  viewsCount: 42,
  conversationsCount: 5,
  isViewed: false,
  expiresAt: new Date(Date.now() + 25 * 86_400_000).toISOString(),
  expired: false,
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-01-10T08:00:00Z",
  seller: {
    id: 1,
    name: "Ahmad Karimi",
    city: "Kabul",
    verified: true,
    avatarUrl: null,
  },
  category: {
    id: 1,
    nameEn: "Electronics",
    namePs: "برقی توکي",
    nameFa: "الکترونیک",
    slug: "electronics",
  },
  ...overrides,
});

/**
 * A draft that is actually PUBLISHABLE.
 *
 * `makeListing` deliberately has no photo and no pin (imageUrls: [], latitude and
 * longitude null), which is a listing that CANNOT be published — publishing requires
 * both. useListingLifecycle now checks that before it confirms anything, so the
 * publish-path tests need a listing that can legitimately go live. The block itself
 * is covered by the hook's own tests.
 */
const makePublishableDraft = (overrides: Partial<Listing> = {}): Listing =>
  makeListing({
    status: "draft",
    imageUrls: ["https://example.test/photo.jpg"],
    latitude: 34.5553,
    longitude: 69.2075,
    ...overrides,
  });

// ── Render helper ──────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderCard(listing: Listing, qc?: QueryClient, viewMode?: "grid" | "list") {
  const client = qc ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <SellerListingCard listing={listing} viewMode={viewMode} />
    </QueryClientProvider>
  );
  return client;
}

/** Opens the card's "More" sheet. */
function openMore() {
  fireEvent.press(screen.getByTestId("seller-card-more-action"));
}

/**
 * Simulate the user confirming a confirmAlert dialog.
 * confirmAlert is called with (title, message, buttons[]).
 * The confirm handler is the non-cancel button's onPress.
 */
function simulateConfirm() {
  expect(mockConfirmAlert).toHaveBeenCalledTimes(1);
  const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
    text: string;
    style?: string;
    onPress?: () => void;
  }>;
  const confirmBtn = buttons.find((b) => b.style !== "cancel");
  confirmBtn?.onPress?.();
}

// ── Reset mocks between tests ──────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Exactly two controls — primary + More ───────────────────────────────────

describe("SellerListingCard — exactly two controls (no 6-button wall)", () => {
  it("renders a primary action button and a More button for an active listing", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByTestId("seller-card-primary-action")).toBeTruthy();
    expect(screen.getByTestId("seller-card-more-action")).toBeTruthy();
  });

  it("renders ONLY the More button for a sold (terminal) listing — no primary", () => {
    renderCard(makeListing({ status: "sold" }));
    expect(screen.queryByTestId("seller-card-primary-action")).toBeNull();
    expect(screen.getByTestId("seller-card-more-action")).toBeTruthy();
  });

  it("never renders the old inline secondary action buttons (only reachable via the More sheet)", () => {
    renderCard(makeListing({ status: "active" }));
    // Unpublish is a `more` action for an active listing — must NOT be inline.
    expect(screen.queryByText("listing.unpublish")).toBeNull();
    expect(screen.queryByText("common.delete")).toBeNull();
  });
});

// ── 2. Status -> primary button mapping (SF-M1 remap) ──────────────────────────

describe("SellerListingCard — primary action button per status (SF-M1: active/reserved both → Mark sold)", () => {
  it("shows 'listing.publish' as primary for draft status", () => {
    renderCard(makeListing({ status: "draft" }));
    expect(screen.getByText("listing.publish")).toBeTruthy();
  });

  it("shows 'listing.markSold' as primary for active status (SF-M1: reserve is gone from this surface)", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("listing.markSold")).toBeTruthy();
    expect(screen.queryByText("listing.markReserved")).toBeNull();
  });

  it("shows 'listing.markSold' as primary for reserved status too — same primary as active", () => {
    renderCard(makeListing({ status: "reserved" }));
    expect(screen.getByText("listing.markSold")).toBeTruthy();
  });

  it("shows NO primary action button for sold status (terminal state)", () => {
    renderCard(makeListing({ status: "sold" }));
    expect(screen.queryByText("listing.publish")).toBeNull();
    expect(screen.queryByText("listing.markSold")).toBeNull();
    expect(screen.queryByText("listing.renew")).toBeNull();
  });

  it("shows 'listing.renew' as primary for an expired listing (overrides status)", () => {
    renderCard(makeListing({ status: "active", expired: true }));
    expect(screen.getByText("listing.renew")).toBeTruthy();
  });
});

// ── 3. Publish (primary, draft) — confirmAlert on the card directly ───────────

describe("SellerListingCard — publish action (primary)", () => {
  it("calls confirmAlert when the primary Publish button is tapped", () => {
    renderCard(makePublishableDraft());
    fireEvent.press(screen.getByText("listing.publish"));
    expect(mockConfirmAlert).toHaveBeenCalledTimes(1);
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmPublish",
      "listing.confirmPublishDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "listing.publish" }),
      ])
    );
  });

  it("calls listingsAPI.publishListing with the listing id on confirm", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    renderCard(makePublishableDraft({ id: 10 }));

    fireEvent.press(screen.getByText("listing.publish"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.publishListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success on publish success", async () => {
    mockListingsAPI.publishListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makePublishableDraft({ id: 10 }), qc);

    fireEvent.press(screen.getByText("listing.publish"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.publishSuccess");
    });
  });

  it("does NOT call listingsAPI.publishListing when cancel is pressed", () => {
    renderCard(makePublishableDraft());
    fireEvent.press(screen.getByText("listing.publish"));

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    cancelBtn?.onPress?.();

    expect(mockListingsAPI.publishListing).not.toHaveBeenCalled();
  });
});

// ── 4. Mark sold (primary, active OR reserved) — opens BuyerPickerSheet directly ──

describe("SellerListingCard — mark sold action (primary, active OR reserved status)", () => {
  it("opens the BuyerPickerSheet (not confirmAlert) when the primary button is tapped on an active listing", () => {
    renderCard(makeListing({ status: "active" }));
    fireEvent.press(screen.getByText("listing.markSold"));
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
  });

  it("opens the BuyerPickerSheet when the primary button is tapped on a reserved listing", () => {
    renderCard(makeListing({ status: "reserved" }));
    fireEvent.press(screen.getByText("listing.markSold"));
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
  });

  it("calls listingsAPI.markSold with the listing id + result on picker confirm (skip)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: makeListing({ status: "sold" }) });
    renderCard(makeListing({ status: "active", id: 10 }));

    fireEvent.press(screen.getByText("listing.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, {});
    });
  });

  it("calls listingsAPI.markSold with a buyerId when a buyer is picked", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: makeListing({ status: "sold" }) });
    renderCard(makeListing({ status: "reserved", id: 10 }));

    fireEvent.press(screen.getByText("listing.markSold"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => {
      expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, { buyerId: 42 });
    });
  });

  it("invalidates 'my-listings' and fires toast.success on mark sold success", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: makeListing({ status: "sold" }) });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "active", id: 10 }), qc);

    fireEvent.press(screen.getByText("listing.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.markSoldSuccess");
    });
  });
});

// ── 5. Mark sold reachable from the More sheet on an expired-active listing ──
// (Renew took the primary slot there, so Mark sold moves to the sheet.)

describe("SellerListingCard — mark sold via the More sheet (expired-active listing)", () => {
  it("the More sheet exposes a 'Mark sold' row for an expired-active listing", () => {
    renderCard(makeListing({ status: "active", expired: true }));
    openMore();
    expect(screen.getByTestId("listing-action-sold")).toBeTruthy();
  });

  it("opens the BuyerPickerSheet (not confirmAlert) when the sheet's Mark sold row is tapped", () => {
    renderCard(makeListing({ status: "active", expired: true }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-sold"));
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
  });

  it("calls listingsAPI.markSold with the listing id + result on picker confirm", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: makeListing({ status: "sold" }) });
    renderCard(makeListing({ status: "active", expired: true, id: 10 }));

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-sold"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => {
      expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, { buyerId: 42 });
    });
  });

  it("does NOT expose a 'sold' row via the sheet for a plain (non-expired) active listing — it's already the primary there", () => {
    renderCard(makeListing({ status: "active", expired: false }));
    openMore();
    expect(screen.queryByTestId("listing-action-sold")).toBeNull();
  });
});

// ── 6. Never a 'reserve' row anywhere (SF-M1: deleted from this hook) ────────

describe("SellerListingCard — reserve is gone entirely from this surface (SF-M1)", () => {
  it.each(["draft", "active", "reserved", "sold"] as const)(
    "the More sheet never exposes a 'reserve' row for status=%s",
    (status) => {
      renderCard(makeListing({ status, expired: true }));
      openMore();
      expect(screen.queryByTestId("listing-action-reserve")).toBeNull();
    }
  );

  it("never renders a 'Mark as Reserved' label anywhere on the card", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    expect(screen.queryByText("listing.markReserved")).toBeNull();
  });
});

// ── 7. Expired-active: Renew is primary ──────────────────────────────────────

describe("SellerListingCard — expired-active listing", () => {
  it("primary is Renew; the More sheet still offers Mark sold", () => {
    renderCard(makeListing({ status: "active", expired: true }));
    expect(screen.getByText("listing.renew")).toBeTruthy();

    openMore();
    expect(screen.getByTestId("listing-action-sold")).toBeTruthy();
  });

  it("calls confirmAlert when the primary Renew button is tapped", () => {
    renderCard(makeListing({ status: "active", expired: true }));
    fireEvent.press(screen.getByText("listing.renew"));
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmRenew",
      "listing.confirmRenewDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "listing.renew" }),
      ])
    );
  });

  it("calls listingsAPI.renewListing with the listing id on confirm", async () => {
    mockListingsAPI.renewListing.mockResolvedValueOnce(
      makeListing({ status: "active", expired: false })
    );
    renderCard(makeListing({ status: "active", expired: true, id: 10 }));

    fireEvent.press(screen.getByText("listing.renew"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.renewListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success on renew success", async () => {
    mockListingsAPI.renewListing.mockResolvedValueOnce(
      makeListing({ status: "active", expired: false })
    );
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "active", expired: true, id: 10 }), qc);

    fireEvent.press(screen.getByText("listing.renew"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.renewSuccess");
    });
  });
});

// ── 8. Unpublish via the sheet (active status) ─────────────────────────────────

describe("SellerListingCard — unpublish via the More sheet (active status)", () => {
  it("the More sheet exposes an Unpublish row for an active listing", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    expect(screen.getByTestId("listing-action-unpublish")).toBeTruthy();
  });

  it("calls confirmAlert when the sheet's Unpublish row is tapped", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-unpublish"));
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmUnpublish",
      "listing.confirmUnpublishDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "listing.unpublish" }),
      ])
    );
  });

  it("calls listingsAPI.unpublishListing with the listing id on confirm", async () => {
    mockListingsAPI.unpublishListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    renderCard(makeListing({ status: "active", id: 10 }));

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-unpublish"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.unpublishListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success on unpublish success", async () => {
    mockListingsAPI.unpublishListing.mockResolvedValueOnce(makeListing({ status: "draft" }));
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "active", id: 10 }), qc);

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-unpublish"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.unpublishSuccess");
    });
  });
});

// ── 9. Release hold via the sheet (SF-M1 rename of Activate) ────────────────

describe("SellerListingCard — release hold via the More sheet (SF-M1 rename of Activate)", () => {
  // `hasOpenHold` is `status === "reserved" || heldUnits > 0` — matches the
  // backend's own `ListingPolicy#activate?` exactly (`owner? && (reserved? ||
  // (active? && held_units.positive?))`). A single-item hold flips `status`
  // to `reserved` and never sets `heldUnits`; a multi-unit hold (SF-B2) keeps
  // `status: active` with `heldUnits > 0` as the only signal.

  it("the More sheet exposes a 'Release hold' row for a reserved (single-item hold) listing", () => {
    renderCard(makeListing({ status: "reserved" }));
    openMore();
    expect(screen.getByTestId("listing-action-releaseHold")).toBeTruthy();
    expect(screen.getByText("listing.releaseHold")).toBeTruthy();
  });

  it("the More sheet exposes 'Release hold' for a multi-unit hold too (status stays active), reading heldUnits rather than status", () => {
    renderCard(
      makeListing({
        status: "active",
        heldUnits: 10,
      })
    );
    openMore();
    expect(screen.getByTestId("listing-action-releaseHold")).toBeTruthy();
  });

  it("does NOT expose 'Release hold' for an ordinary active listing with no open hold", () => {
    renderCard(makeListing({ status: "active", heldUnits: 0 }));
    openMore();
    expect(screen.queryByTestId("listing-action-releaseHold")).toBeNull();
  });

  it("calls confirmAlert with the release-hold copy when the sheet's row is tapped", () => {
    renderCard(makeListing({ status: "reserved" }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-releaseHold"));
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmReleaseHold",
      "listing.confirmReleaseHoldDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "listing.releaseHold" }),
      ])
    );
  });

  it("calls listingsAPI.activateListing (same endpoint, new copy) with the listing id on confirm", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    renderCard(makeListing({ status: "reserved", id: 10 }));

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-releaseHold"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.activateListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success ('listing.releaseHoldSuccess') on success", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "reserved", id: 10 }), qc);

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-releaseHold"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.releaseHoldSuccess");
    });
  });
});

// ── 10. View sales via the sheet (SF-M1 new row) ─────────────────────────────

describe("SellerListingCard — 'View sales' via the More sheet (SF-M1)", () => {
  it("exposes a 'View sales' row once some units have sold", () => {
    renderCard(makeListing({ status: "active", quantity: 10, availableUnits: 6 }));
    openMore();
    expect(screen.getByTestId("listing-action-sales")).toBeTruthy();
    expect(screen.getByText("listing.viewSales")).toBeTruthy();
  });

  it("does not expose 'View sales' when nothing has sold yet", () => {
    renderCard(makeListing({ status: "active", quantity: 10, availableUnits: 10 }));
    openMore();
    expect(screen.queryByTestId("listing-action-sales")).toBeNull();
  });

  it("exposes 'View sales' on a terminal sold-out listing too", () => {
    renderCard(makeListing({ status: "sold", quantity: 3, availableUnits: 0 }));
    openMore();
    expect(screen.getByTestId("listing-action-sales")).toBeTruthy();
  });
});

// ── 11. Delete via the sheet (destructive, always available) ───────────────────

describe("SellerListingCard — delete via the More sheet (destructive)", () => {
  it("the More sheet exposes a Delete row for an active listing", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    expect(screen.getByTestId("listing-action-delete")).toBeTruthy();
  });

  it("calls confirmAlert with destructive style for the delete row", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-delete"));

    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmDelete",
      "listing.confirmDeleteDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({
          text: "common.delete",
          style: "destructive",
        }),
      ])
    );
  });

  it("calls listingsAPI.deleteListing with the listing id on confirm", async () => {
    mockListingsAPI.deleteListing.mockResolvedValueOnce(undefined);
    renderCard(makeListing({ status: "active", id: 10 }));

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-delete"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.deleteListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success on delete success", async () => {
    mockListingsAPI.deleteListing.mockResolvedValueOnce(undefined);
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "active", id: 10 }), qc);

    openMore();
    fireEvent.press(screen.getByTestId("listing-action-delete"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.deleteSuccess");
    });
  });

  it("does NOT call deleteListing when cancel is pressed", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-delete"));

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    cancelBtn?.onPress?.();

    expect(mockListingsAPI.deleteListing).not.toHaveBeenCalled();
  });

  it("Delete is reachable via the sheet even on a sold (terminal) listing", () => {
    renderCard(makeListing({ status: "sold" }));
    openMore();
    fireEvent.press(screen.getByTestId("listing-action-delete"));
    expect(mockConfirmAlert).toHaveBeenCalledTimes(1);
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmDelete",
      "listing.confirmDeleteDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "destructive" }),
      ])
    );
  });
});

// ── 12. Duplicate reachable via the sheet for EVERY status ─────────────────────

describe("SellerListingCard — duplicate via the More sheet (every status)", () => {
  it.each(["draft", "active", "reserved", "sold"] as const)(
    "the More sheet exposes a Duplicate row for status=%s",
    (status) => {
      renderCard(makeListing({ status }));
      openMore();
      expect(screen.getByTestId("listing-action-duplicate")).toBeTruthy();
    }
  );
});

// ── 13. views_count and conversations_count render ──────────────────────────────

describe("SellerListingCard — stats display", () => {
  it("renders views count via t('listing.viewsCount', { count })", () => {
    // t() returns the key string in tests; so the rendered text is "listing.viewsCount"
    renderCard(makeListing({ viewsCount: 42 }));
    expect(screen.getByText("listing.viewsCount")).toBeTruthy();
  });

  it("renders conversations count via t('listing.conversationsCount', { count })", () => {
    renderCard(makeListing({ conversationsCount: 5 }));
    expect(screen.getByText("listing.conversationsCount")).toBeTruthy();
  });

  it("does NOT render conversations count when conversationsCount is undefined", () => {
    renderCard(makeListing({ conversationsCount: undefined }));
    expect(screen.queryByText("listing.conversationsCount")).toBeNull();
  });

  it("renders zero views without crashing", () => {
    renderCard(makeListing({ viewsCount: 0 }));
    expect(screen.getByText("listing.viewsCount")).toBeTruthy();
  });
});

// ── 13b. TASK-R418 compact "Reserved for {name}" / "Sold to {name}" line ───────
// CR fix (CYCLE-4, LOW): `seller-card-sale-line` previously had zero coverage
// (a "dead testID" — present in the component, asserted by nothing).

describe("SellerListingCard — compact sale line (TASK-R418)", () => {
  const sale = (overrides: Partial<ListingSale> = {}): ListingSale => ({
    id: 9,
    status: "reserved",
    finalPrice: 85000,
    currency: "AFN",
    completedAt: null,
    buyer: { id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true },
    conversationId: 77,
    ...overrides,
  });

  it("renders the reserved sale line with the buyer's name", () => {
    renderCard(makeListing({ status: "reserved", sale: sale() }));
    expect(screen.getByTestId("seller-card-sale-line")).toBeTruthy();
    expect(screen.getByText("listing.sale.reservedFor")).toBeTruthy();
  });

  it("renders the sold sale line with the buyer's name", () => {
    renderCard(makeListing({ status: "sold", sale: sale({ status: "sold" }) }));
    expect(screen.getByText("listing.sale.soldTo")).toBeTruthy();
  });

  it("does not render the sale line when the listing has no sale", () => {
    renderCard(makeListing({ status: "active", sale: null }));
    expect(screen.queryByTestId("seller-card-sale-line")).toBeNull();
  });

  it("falls back to the generic buyer label instead of throwing when buyer is missing", () => {
    // Guards against the exact shape the CR flagged: `sale.buyer.name` used
    // unguarded would throw here since `buyer` is falsy.
    expect(() =>
      renderCard(
        makeListing({
          status: "reserved",
          sale: sale({ buyer: undefined as unknown as ListingSale["buyer"] }),
        })
      )
    ).not.toThrow();
    // `reservedNoBuyer`, NOT `reservedFor` with a placeholder name. This used to
    // interpolate "Buyer info unavailable" into {{name}}, which rendered as
    // "Sold to Buyer info unavailable" and, in fa/ps, put the postposition after
    // a clause instead of a name. The no-buyer case gets its own sentence now.
    expect(screen.getByText("listing.sale.reservedNoBuyer")).toBeTruthy();
    expect(screen.queryByText("listing.sale.reservedFor")).toBeNull();
  });

  it("uses the no-buyer SOLD sentence when a completed sale has no buyer", () => {
    // The sold half of the same defect — the string the owner actually saw was
    // "Sold to Buyer info unavailable", on a sold multi-unit listing.
    renderCard(
      makeListing({
        status: "sold",
        sale: sale({ status: "sold", buyer: undefined as unknown as ListingSale["buyer"] }),
      })
    );
    expect(screen.getByText("listing.sale.soldNoBuyer")).toBeTruthy();
    expect(screen.queryByText("listing.sale.soldTo")).toBeNull();
  });
});

// ── 14. No-photo fallback ──────────────────────────────────────────────────────

describe("SellerListingCard — no-photo fallback", () => {
  it("renders the no-photo label when thumbnailUrl is null and imageUrls is empty", () => {
    renderCard(makeListing({ thumbnailUrl: null, imageUrls: [] }));
    expect(screen.getByText("listing.noPhoto")).toBeTruthy();
  });
});

// ── 15. Edit reachable via the sheet for every status ───────────────────────────

describe("SellerListingCard — edit action always reachable via the sheet", () => {
  it.each(["active", "draft", "sold"] as const)(
    "the More sheet exposes an Edit row for status=%s",
    (status) => {
      renderCard(makeListing({ status }));
      openMore();
      expect(screen.getByTestId("listing-action-edit")).toBeTruthy();
    }
  );
});

// ── 16. Smoke tests ────────────────────────────────────────────────────────────

describe("SellerListingCard — smoke tests", () => {
  it.each(["active", "draft", "reserved", "sold"] as const)(
    "renders without throwing for status=%s",
    (status) => {
      expect(() =>
        renderCard(makeListing({ status }))
      ).not.toThrow();
    }
  );

  it("renders without throwing for an expired active listing", () => {
    expect(() =>
      renderCard(makeListing({ status: "active", expired: true }))
    ).not.toThrow();
  });

  it("renders without throwing when conversationsCount is 0", () => {
    expect(() =>
      renderCard(makeListing({ conversationsCount: 0 }))
    ).not.toThrow();
  });

  it("opening and closing the More sheet does not throw", () => {
    renderCard(makeListing({ status: "active" }));
    openMore();
    expect(screen.getByTestId("listing-actions-sheet")).toBeTruthy();
    fireEvent.press(screen.getByTestId("listing-actions-backdrop"));
  });
});

// ── The chats count hides at zero ────────────────────────────────────────────
//
// `conversationsCount != null` let 0 through, so a listing nobody had messaged
// about rendered "0 chats" in accent blue at weight 600 — the loudest element on
// the card — as a tap target leading to an empty screen. Spotted in a QA
// screenshot (run-020), not by an assertion: nothing was "wrong", it just drew
// the eye to nothing.

describe("SellerListingCard — chats count", () => {
  it("shows the count when there are conversations", () => {
    renderCard(makeListing({ conversationsCount: 3 }));
    expect(screen.getByText("listing.conversationsCount")).toBeTruthy();
  });

  it("hides it entirely at zero", () => {
    renderCard(makeListing({ conversationsCount: 0 }));
    expect(screen.queryByText("listing.conversationsCount")).toBeNull();
  });

  it("hides it when the field is absent", () => {
    const l = makeListing();
    delete (l as { conversationsCount?: number }).conversationsCount;
    renderCard(l);
    expect(screen.queryByText("listing.conversationsCount")).toBeNull();
  });

  // The views count is muted and always present — that contrast is the point.
  it("still shows the views count at zero", () => {
    renderCard(makeListing({ viewsCount: 0, conversationsCount: 0 }));
    expect(screen.getByText("listing.viewsCount")).toBeTruthy();
  });
});


// ── Layout variants (UI-017) ────────────────────────────────────────────────
//
// The grid/list toggle on MyListings used to change only the COLUMN COUNT,
// because viewMode never reached this card: "list" produced one ~1100px-tall
// card per row, and it is the mode the screen DEFAULTS to. What matters in these
// tests is that switching layout costs the seller no information — the price,
// title, lifecycle state and both actions survive in the compact row.
describe("SellerListingCard — compact list variant", () => {
  it("keeps price, title, lifecycle status and both actions in the compact row", () => {
    renderCard(makeListing({ status: "active", title: "Compact Row Item" }), undefined, "list");

    expect(screen.getByText("Compact Row Item")).toBeTruthy();
    expect(screen.getByTestId("seller-card-primary-action")).toBeTruthy();
    expect(screen.getByTestId("seller-card-more-action")).toBeTruthy();
    // StatusBadge moves out of the photo overlay and into the details column,
    // since a 112dp thumbnail cannot carry it. Asserted by testID because the
    // badge is mocked as a host component in this file and renders no text.
    expect(screen.getByTestId("seller-card-status")).toBeTruthy();
  });

  it("shows the expired badge in the row instead of the status badge", () => {
    renderCard(makeListing({ status: "active", expired: true }), undefined, "list");

    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
  });

  it("still renders every detail in grid mode", () => {
    renderCard(makeListing({ status: "active", title: "Grid Item" }), undefined, "grid");

    expect(screen.getByText("Grid Item")).toBeTruthy();
    expect(screen.getByTestId("seller-card-primary-action")).toBeTruthy();
    expect(screen.getByTestId("seller-card-more-action")).toBeTruthy();
  });

  it("defaults to the compact row, matching the screen's own default toggle state", () => {
    renderCard(makeListing({ status: "active", title: "Default Item" }));
    expect(screen.getByText("Default Item")).toBeTruthy();
    expect(screen.getByTestId("seller-card-status")).toBeTruthy();
  });
});
