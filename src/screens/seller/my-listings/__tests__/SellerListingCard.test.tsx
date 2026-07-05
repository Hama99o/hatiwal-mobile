/**
 * SellerListingCard — Jest unit tests
 *
 * Covers:
 *  1. Status -> primary action button mapping (draft->Publish, active->Mark Sold, reserved->Mark Sold)
 *  2. Tapping each action calls confirmAlert and, on confirm, the matching listingsAPI mutation
 *  3. On mutation success the 'my-listings' query is invalidated and toast.success fires
 *  4. Delete uses confirmAlert (destructive) and calls deleteListing
 *  5. views_count and conversations_count render
 *  6. Expired listing shows Renew as primary action
 *  7. Sold listing shows no primary action button
 *
 * No real network calls — listingsAPI is fully mocked.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Listing } from "@/api/listings";

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

// Lucide icons — mock to strings so they don't crash
jest.mock("lucide-react-native", () => ({
  Eye: "Eye",
  MessageCircle: "MessageCircle",
  Camera: "Camera",
}));

// listingsAPI — mock every lifecycle method using jest.fn() inside factory
// Access individual fns via jest.mocked(listingsAPI) after import
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

// BuyerPickerSheet (TASK-TX01) — replace with a minimal stand-in exposing
// two test-only buttons: "confirm-skip" (legacy no-buyer path) and
// "confirm-buyer-42" (buyer_id: 42). Real sheet behavior is covered by its
// own unit tests.
jest.mock("@/components/common/BuyerPickerSheet", () => {
  const { Pressable, Text } = require("react-native");
  return {
    BuyerPickerSheet: ({ visible, onConfirm, action }: {
      visible: boolean;
      onConfirm: (r: { buyerId?: number; finalPrice?: number }) => void;
      action: string;
    }) => {
      if (!visible) return null;
      return (
        <>
          <Text testID={`buyer-picker-visible-${action}`}>buyer-picker-open</Text>
          <Pressable onPress={() => onConfirm({})} testID="confirm-skip">
            <Text>confirm-skip</Text>
          </Pressable>
          <Pressable onPress={() => onConfirm({ buyerId: 42 })} testID="confirm-buyer-42">
            <Text>confirm-buyer-42</Text>
          </Pressable>
        </>
      );
    },
  };
});

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

// ── Render helper ──────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderCard(listing: Listing, qc?: QueryClient) {
  const client = qc ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <SellerListingCard listing={listing} />
    </QueryClientProvider>
  );
  return client;
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

// ── 1. Status -> primary action button mapping ────────────────────────────────

describe("SellerListingCard — primary action button per status", () => {
  it("shows 'listing.publish' as primary for draft status", () => {
    renderCard(makeListing({ status: "draft" }));
    expect(screen.getByText("listing.publish")).toBeTruthy();
  });

  it("shows 'listing.markSold' as primary for active status", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("listing.markSold")).toBeTruthy();
  });

  it("shows 'listing.markSold' as primary for reserved status", () => {
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

// ── 2. Publish mutation ────────────────────────────────────────────────────────

describe("SellerListingCard — publish action", () => {
  it("calls confirmAlert when Publish button is tapped", () => {
    renderCard(makeListing({ status: "draft" }));
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
    renderCard(makeListing({ status: "draft", id: 10 }));

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

    renderCard(makeListing({ status: "draft", id: 10 }), qc);

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
    renderCard(makeListing({ status: "draft" }));
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

// ── 3. Reserve mutation (TASK-TX01: opens the BuyerPickerSheet) ────────────────

describe("SellerListingCard — reserve action", () => {
  it("shows 'listing.markReserved' as a secondary action for active status", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("listing.markReserved")).toBeTruthy();
  });

  it("opens the BuyerPickerSheet (not confirmAlert) when Mark Reserved is tapped", () => {
    renderCard(makeListing({ status: "active" }));
    fireEvent.press(screen.getByText("listing.markReserved"));
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-reserve")).toBeTruthy();
  });

  it("calls listingsAPI.reserveListing with the listing id + result on picker confirm (skip)", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({ listing: makeListing({ status: "reserved" }) });
    renderCard(makeListing({ status: "active", id: 10 }));

    fireEvent.press(screen.getByText("listing.markReserved"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockListingsAPI.reserveListing).toHaveBeenCalledWith(10, {});
    });
  });

  it("calls listingsAPI.reserveListing with a buyerId when a buyer is picked", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({ listing: makeListing({ status: "reserved" }) });
    renderCard(makeListing({ status: "active", id: 10 }));

    fireEvent.press(screen.getByText("listing.markReserved"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => {
      expect(mockListingsAPI.reserveListing).toHaveBeenCalledWith(10, { buyerId: 42 });
    });
  });

  it("invalidates 'my-listings' and fires toast.success on reserve success", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({ listing: makeListing({ status: "reserved" }) });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "active", id: 10 }), qc);

    fireEvent.press(screen.getByText("listing.markReserved"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.reserveSuccess");
    });
  });
});

// ── 4. Mark Sold mutation (TASK-TX01: opens the BuyerPickerSheet) ──────────────

describe("SellerListingCard — mark sold action", () => {
  it("opens the BuyerPickerSheet (not confirmAlert) when Mark Sold is tapped (active status)", () => {
    renderCard(makeListing({ status: "active" }));
    fireEvent.press(screen.getByText("listing.markSold"));
    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
  });

  it("calls listingsAPI.markSold with the listing id + result on picker confirm (active)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({ listing: makeListing({ status: "sold" }) });
    renderCard(makeListing({ status: "active", id: 10 }));

    fireEvent.press(screen.getByText("listing.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockListingsAPI.markSold).toHaveBeenCalledWith(10, {});
    });
  });

  it("calls listingsAPI.markSold with the listing id + result on picker confirm (reserved)", async () => {
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

// ── 5. Unpublish mutation ──────────────────────────────────────────────────────

describe("SellerListingCard — unpublish action", () => {
  it("shows 'listing.unpublish' as secondary for active status", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("listing.unpublish")).toBeTruthy();
  });

  it("calls confirmAlert when Unpublish button is tapped", () => {
    renderCard(makeListing({ status: "active" }));
    fireEvent.press(screen.getByText("listing.unpublish"));
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

    fireEvent.press(screen.getByText("listing.unpublish"));
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

    fireEvent.press(screen.getByText("listing.unpublish"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.unpublishSuccess");
    });
  });
});

// ── 6. Activate mutation (reserved -> active) ──────────────────────────────────

describe("SellerListingCard — activate action (reserved -> active)", () => {
  it("shows 'listing.activate' as secondary for reserved status", () => {
    renderCard(makeListing({ status: "reserved" }));
    expect(screen.getByText("listing.activate")).toBeTruthy();
  });

  it("calls confirmAlert when Activate button is tapped", () => {
    renderCard(makeListing({ status: "reserved" }));
    fireEvent.press(screen.getByText("listing.activate"));
    expect(mockConfirmAlert).toHaveBeenCalledWith(
      "listing.confirmActivate",
      "listing.confirmActivateDescription",
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel" }),
        expect.objectContaining({ text: "listing.activate" }),
      ])
    );
  });

  it("calls listingsAPI.activateListing with the listing id on confirm", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    renderCard(makeListing({ status: "reserved", id: 10 }));

    fireEvent.press(screen.getByText("listing.activate"));
    simulateConfirm();

    await waitFor(() => {
      expect(mockListingsAPI.activateListing).toHaveBeenCalledWith(10);
    });
  });

  it("invalidates 'my-listings' and fires toast.success on activate success", async () => {
    mockListingsAPI.activateListing.mockResolvedValueOnce(makeListing({ status: "active" }));
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");

    renderCard(makeListing({ status: "reserved", id: 10 }), qc);

    fireEvent.press(screen.getByText("listing.activate"));
    simulateConfirm();

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["my-listings"] })
      );
      expect(mockToast.success).toHaveBeenCalledWith("listing.activateSuccess");
    });
  });
});

// ── 7. Renew mutation ──────────────────────────────────────────────────────────

describe("SellerListingCard — renew action (expired listing)", () => {
  it("calls confirmAlert when Renew button is tapped", () => {
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

// ── 8. Delete mutation (destructive) ──────────────────────────────────────────

describe("SellerListingCard — delete action (destructive)", () => {
  it("shows 'common.delete' as secondary action for active listings", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("common.delete")).toBeTruthy();
  });

  it("calls confirmAlert with destructive style for the delete button", () => {
    renderCard(makeListing({ status: "active" }));
    fireEvent.press(screen.getByText("common.delete"));

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

    fireEvent.press(screen.getByText("common.delete"));
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

    fireEvent.press(screen.getByText("common.delete"));
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
    fireEvent.press(screen.getByText("common.delete"));

    const buttons = mockConfirmAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    cancelBtn?.onPress?.();

    expect(mockListingsAPI.deleteListing).not.toHaveBeenCalled();
  });

  it("calls confirmAlert for delete on sold listing (delete is always available)", () => {
    renderCard(makeListing({ status: "sold" }));
    fireEvent.press(screen.getByText("common.delete"));
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

// ── 9. views_count and conversations_count render ──────────────────────────────

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

// ── 10. No-photo fallback ──────────────────────────────────────────────────────

describe("SellerListingCard — no-photo fallback", () => {
  it("renders the no-photo label when thumbnailUrl is null and imageUrls is empty", () => {
    renderCard(makeListing({ thumbnailUrl: null, imageUrls: [] }));
    expect(screen.getByText("listing.noPhoto")).toBeTruthy();
  });
});

// ── 11. Edit button present ────────────────────────────────────────────────────

describe("SellerListingCard — edit action always present", () => {
  it("shows 'common.edit' button for active listings", () => {
    renderCard(makeListing({ status: "active" }));
    expect(screen.getByText("common.edit")).toBeTruthy();
  });

  it("shows 'common.edit' button for draft listings", () => {
    renderCard(makeListing({ status: "draft" }));
    expect(screen.getByText("common.edit")).toBeTruthy();
  });

  it("shows 'common.edit' button for sold listings", () => {
    renderCard(makeListing({ status: "sold" }));
    expect(screen.getByText("common.edit")).toBeTruthy();
  });
});

// ── 12. Smoke tests ────────────────────────────────────────────────────────────

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
});
