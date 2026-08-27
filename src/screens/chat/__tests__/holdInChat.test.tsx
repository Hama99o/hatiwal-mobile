/**
 * holdInChat — SF-M2 (Sell Flow Redesign, docs/SELL_FLOW_REDESIGN.md §4.4.2):
 * "Place a hold for {{name}}" / "Release hold" moved into
 * ComposerActionsSheet's "+" menu.
 *
 * WHY THIS FILE MOUNTS THE REAL ConversationScreen (unlike every sibling
 * suite in this directory): `ComposerActionsSheet` accepted and rendered
 * `placeHoldRow`/`releaseHoldRow`, and `buildPlaceHoldPrompt` was fully
 * unit-tested in `reserveAfterOffer.test.tsx` — but `Conversation.tsx` never
 * passed either prop, so the whole feature was unreachable in the running
 * app despite 2453 other green tests. Every other suite in this directory
 * deliberately avoids mounting the real screen and instead unit-tests the
 * hoisted pure predicates / a hand-built minimal wrapper — which is exactly
 * how this gap went undetected: nothing ever rendered the REAL
 * `<ComposerActionsSheet ... />` element as `Conversation.tsx` actually
 * builds it. These tests do, with the real `ComposerActionsSheet` AND the
 * real `BuyerPickerSheet` (the two components whose wiring is under test) —
 * every other child (ListingHeader, MessageBubble, OfferSheet, MeetupSheet,
 * ReportSheet, SafetyTipsSheet, QuickReplies, AgreedDealBanner,
 * ListingUnavailableNotice) is swapped for a trivial stub, exactly like the
 * `ConversationRow`/`UniversalList` manual-mock precedent in
 * `Conversations.test.tsx`, so this stays a fast, focused unit test of the
 * prop-wiring instead of an end-to-end render of the whole 2000-line screen.
 *
 * Coverage:
 *  1. Seller, active listing, no open hold → Place-a-hold row is reachable
 *     ("would fail if the prop were not passed") and tapping it → confirming
 *     the (real) BuyerPickerSheet confirm mode calls `reserveListing` with
 *     the CONVERSATION'S buyer id — never a buyer-picker list.
 *  2. Release-hold row is NEVER rendered alongside Place-a-hold (mutual
 *     exclusivity ComposerActionsSheet's own prop docs require).
 *  3. Seller, single-item listing already `reserved` → Release-hold
 *     reachable, Place-a-hold absent; tapping it confirms and calls
 *     `activateListing`.
 *  4. THE case a status-only gate would silently break (SF-B2): seller,
 *     MULTI-UNIT listing, `status` still `"active"` but `heldUnits > 0` →
 *     Release-hold reachable, Place-a-hold absent.
 *  5. Buyer (not the owner) never sees either row, regardless of status.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  // Conversation.tsx itself
  Send: "Send",
  Plus: "Plus",
  ShieldBan: "ShieldBan",
  Search: "Search",
  X: "X",
  Flag: "Flag",
  // BackButton
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
  // ComposerActionsSheet (kept REAL — see file header)
  Calendar: "Calendar",
  ImageIcon: "ImageIcon",
  Lock: "Lock",
  LockOpen: "LockOpen",
  Paperclip: "Paperclip",
  Tag: "Tag",
  // BuyerPickerSheet (kept REAL — see file header)
  Check: "Check",
  UserX: "UserX",
  CheckCircle2: "CheckCircle2",
  // VerifiedBadge, rendered by the real UserIdentity (nav header + the
  // locked buyer row in BuyerPickerSheet's confirm mode) whenever a fixture
  // sets `verified: true`.
  BadgeCheck: "BadgeCheck",
}));

// expo-router — override the global mock: a real conversation id route param,
// and useFocusEffect actually RUNS its callback (Conversation.tsx's entire
// initial load lives inside useFocusEffect, not a plain useEffect/useQuery —
// a no-op mock would leave the screen on its loading skeleton forever).
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({ id: "501" }),
  // Fire ONCE, on mount — exactly what focusing a screen does. Calling it
  // inline on every render (`useFocusEffect: (cb) => cb()`) makes
  // Conversation.tsx's load-on-focus loop forever: `load()` resolves with a
  // fresh object, state updates, the re-render calls this again, `isLoading`
  // never goes false. See Categories.test.tsx for the same trap.
  useFocusEffect: (cb: () => void) => {
    const R = require("react");
    R.useEffect(() => { cb(); }, []);
  },
}));

jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Auto-confirms whichever button ISN'T "cancel" — mirrors the precedent in
// ListingConversations.test.tsx.
jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(
    (
      _title: string,
      _message: string | undefined,
      buttons?: { text: string; style?: string; onPress?: () => void }[]
    ) => {
      const action = buttons?.find((b) => b.style !== "cancel");
      action?.onPress?.();
    }
  ),
}));

jest.mock("@/lib/permissions", () => ({
  showPermissionDeniedAlert: jest.fn(),
  showLimitedPhotoAccessAlert: jest.fn(),
}));

jest.mock("@/lib/animation", () => ({
  usePulse: () => ({}),
  useReduceMotion: () => false,
}));

jest.mock("@/hooks/useConversationCable", () => ({
  useConversationCable: jest.fn(),
}));

jest.mock("@/hooks/useComposerDraft", () => ({
  useComposerDraft: () => ({ draft: "", setDraft: jest.fn(), clearDraft: jest.fn() }),
}));

jest.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector: (s: { user: unknown; setUser: () => void }) => unknown) =>
    selector({ user: CURRENT_USER, setUser: jest.fn() }),
}));

jest.mock("@/api/auth", () => ({
  authAPI: { me: jest.fn() },
}));

jest.mock("@/api/users", () => ({
  usersAPI: { blockUser: jest.fn(), unblockUser: jest.fn() },
}));

jest.mock("@/api/conversations", () => {
  const actual = jest.requireActual("@/api/conversations");
  return {
    ...actual,
    conversationsAPI: {
      ...actual.conversationsAPI,
      getConversation: jest.fn(),
      getMessages: jest.fn(),
      markMessagesRead: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn(),
    },
  };
});

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    reserveListing: jest.fn(),
    activateListing: jest.fn(),
    getMyListing: jest.fn(),
  },
}));

// Heavy / irrelevant-to-this-ticket children — trivial stubs. Paths are
// relative to THIS file, not to Conversation.tsx.
jest.mock("../conversation/ListingHeader", () => ({ ListingHeader: () => null }));
jest.mock("../conversation/ListingUnavailableNotice", () => ({ ListingUnavailableNotice: () => null }));
jest.mock("../conversation/AgreedDealBanner", () => ({ AgreedDealBanner: () => null }));
jest.mock("../conversation/MessageBubble", () => ({
  MessageBubble: () => null,
  // `groupMessagesByDay.ts` (kept REAL — pure, and needed for the empty
  // `threadRows` memo Conversation.tsx computes on every render) imports the
  // pure `isRenderableInThread` predicate from this SAME module — stubbing
  // the whole module without it left it `undefined`, breaking
  // `messages.filter(isRenderableInThread)` even for an empty message list.
  isRenderableInThread: jest.requireActual("../conversation/MessageBubble").isRenderableInThread,
}));
jest.mock("../conversation/DaySeparator", () => ({ DaySeparator: () => null }));
jest.mock("../conversation/MeetupSheet", () => ({ MeetupSheet: () => null }));
jest.mock("@/screens/shared/listing-detail/OfferSheet", () => ({ OfferSheet: () => null }));
jest.mock("@/components/common/ReportSheet", () => ({ ReportSheet: () => null }));
jest.mock("@/components/common/SafetyTipsSheet", () => ({ SafetyTipsSheet: () => null }));
jest.mock("@/components/common/QuickReplies", () => ({ QuickReplies: () => null }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ConversationScreen } from "../Conversation";
import { conversationsAPI } from "@/api/conversations";
import { listingsAPI } from "@/api/listings";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CURRENT_USER = { id: 1, fullName: "Seller Sam" };
const SELLER = { id: 1, name: "Seller Sam", city: null, verified: false, avatarUrl: null };
const BUYER = { id: 7, name: "Ahmad", city: "Kabul", verified: true, avatarUrl: null };

function makeMessagesPage() {
  return {
    items: [],
    pagination: { currentPage: 1, nextPage: null, prevPage: null, totalCount: 0, totalPages: 1 },
  };
}

function makeConversation(
  listingOverrides: Record<string, unknown> = {},
  conversationOverrides: Record<string, unknown> = {}
) {
  return {
    id: 501,
    status: "open",
    lastMessageAt: "2026-08-01T00:00:00Z",
    createdAt: "2026-08-01T00:00:00Z",
    listingDeleted: false,
    listing: {
      id: 42,
      title: "iPhone 12",
      thumbnailUrl: null,
      status: "active",
      price: 14000,
      currency: "AFN",
      multiUnit: false,
      availableUnits: 1,
      location: "Kabul",
      negotiable: true,
      ...listingOverrides,
    },
    buyer: BUYER,
    seller: SELLER,
    otherParticipant: BUYER,
    blockedWithParticipant: false,
    ...conversationOverrides,
  };
}

/** The owner's own `/my/listings/:id` payload — the ONLY place `heldUnits`
 *  is available from (see the SF-M2 comment in Conversation.tsx: the
 *  conversation's own hand-rolled `listing` hash never carries it). */
function makeOwnerListingDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    status: "active",
    heldUnits: 0,
    multiUnit: false,
    availableUnits: 1,
    quantity: 1,
    price: 14000,
    currency: "AFN",
    ...overrides,
  };
}

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConversationScreen />
    </QueryClientProvider>
  );
}

async function openComposerSheet() {
  await waitFor(() => expect(screen.getByTestId("composer-plus-button")).toBeTruthy());
  await act(async () => {
    fireEvent.press(screen.getByTestId("composer-plus-button"));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (conversationsAPI.getMessages as jest.Mock).mockResolvedValue(makeMessagesPage());
  (conversationsAPI.markMessagesRead as jest.Mock).mockResolvedValue(undefined);
  (listingsAPI.reserveListing as jest.Mock).mockResolvedValue({ listing: { id: 42, status: "reserved" } });
  (listingsAPI.activateListing as jest.Mock).mockResolvedValue({ id: 42, status: "active" });
});

// ─── 1. Place a hold — reachable, and reserves for the CONVERSATION's buyer ──

describe("SF-M2 — Place a hold (seller, active listing, no open hold)", () => {
  it("renders the Place-a-hold row in the composer's + sheet — FAILS if Conversation.tsx doesn't pass placeHoldRow to ComposerActionsSheet", async () => {
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(makeConversation());
    (listingsAPI.getMyListing as jest.Mock).mockResolvedValue(makeOwnerListingDetail());

    renderScreen();
    await openComposerSheet();

    expect(screen.getByTestId("composer-action-place-hold")).toBeTruthy();
    // Mutual exclusivity — ComposerActionsSheet never renders both.
    expect(screen.queryByTestId("composer-action-release-hold")).toBeNull();
  });

  it("tapping Place-a-hold opens BuyerPickerSheet's LOCKED confirm mode (never the pick-a-buyer list), and confirming calls reserveListing with the conversation's buyer id", async () => {
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(makeConversation());
    (listingsAPI.getMyListing as jest.Mock).mockResolvedValue(makeOwnerListingDetail());

    renderScreen();
    await openComposerSheet();

    await act(async () => {
      fireEvent.press(screen.getByTestId("composer-action-place-hold"));
    });

    // Confirm mode — no conversation-picker list, straight to Confirm/Cancel.
    await waitFor(() => expect(screen.getByTestId("buyer-picker-confirm")).toBeTruthy());
    expect(screen.queryByTestId("buyer-row-7")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId("buyer-picker-confirm"));
    });

    await waitFor(() =>
      expect(listingsAPI.reserveListing).toHaveBeenCalledWith(42, {
        buyerId: 7,
        finalPrice: 14000,
      })
    );
  });

  it("never shows Place-a-hold (or Release-hold) to the BUYER (not the owner), regardless of listing status", async () => {
    // CURRENT_USER (id 1) is fixed for the whole file (mocked auth store) —
    // to view this thread as a non-owner without swapping that mock, give
    // the conversation a DIFFERENT seller instead, so `isOwner`
    // (`conversation.seller.id === currentUser.id`) reads false and
    // CURRENT_USER is effectively the buyer of THIS conversation.
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(
      makeConversation(
        { status: "reserved" }, // even a status that WOULD show Release-hold to the owner
        { seller: { id: 99, name: "Other Seller", city: null, verified: false, avatarUrl: null } }
      )
    );

    renderScreen();
    await openComposerSheet();

    expect(screen.queryByTestId("composer-action-place-hold")).toBeNull();
    expect(screen.queryByTestId("composer-action-release-hold")).toBeNull();
    // Confirms getMyListing (owner-only) was never even called for a non-owner viewer.
    expect(listingsAPI.getMyListing).not.toHaveBeenCalled();
  });
});

// ─── 2. Release hold — single-item listing, status flips to "reserved" ──────

describe("SF-M2 — Release hold (single-item listing already reserved)", () => {
  it("renders Release-hold (never Place-a-hold) and releasing calls activateListing", async () => {
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(
      makeConversation({ status: "reserved" })
    );
    (listingsAPI.getMyListing as jest.Mock).mockResolvedValue(
      makeOwnerListingDetail({ status: "reserved", heldUnits: 0 })
    );

    renderScreen();
    await openComposerSheet();

    expect(screen.getByTestId("composer-action-release-hold")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-place-hold")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId("composer-action-release-hold"));
    });

    // confirmAlert is mocked to auto-confirm — see the module mock above.
    await waitFor(() => expect(listingsAPI.activateListing).toHaveBeenCalledWith(42));
  });
});

// ─── 3. THE held-batch case a status-only gate would break (SF-B2) ──────────

describe("SF-M2 — Release hold on a HELD BATCH where status is still \"active\" (SF-B2)", () => {
  it("renders Release-hold (never Place-a-hold) purely from heldUnits > 0, even though status === \"active\"", async () => {
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(
      makeConversation({ status: "active", multiUnit: true, availableUnits: 10 })
    );
    // The one field a status-only gate could never see: the multi-unit batch
    // stays "active" while 3 units are held for this buyer (SF-B2).
    (listingsAPI.getMyListing as jest.Mock).mockResolvedValue(
      makeOwnerListingDetail({ status: "active", heldUnits: 3, multiUnit: true, availableUnits: 10, quantity: 15 })
    );

    renderScreen();
    await openComposerSheet();

    expect(screen.getByTestId("composer-action-release-hold")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-place-hold")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId("composer-action-release-hold"));
    });

    await waitFor(() => expect(listingsAPI.activateListing).toHaveBeenCalledWith(42));
  });

  it("never shows Release-hold while the owner-listing query (the only source of heldUnits) is still in flight — heldUnitsOf(undefined) is 0, so status alone decides until it resolves", async () => {
    (conversationsAPI.getConversation as jest.Mock).mockResolvedValue(
      makeConversation({ status: "active", multiUnit: true, availableUnits: 10 })
    );
    // Never resolves within this test — simulates the owner-listing query
    // still in flight.
    (listingsAPI.getMyListing as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderScreen();
    await openComposerSheet();

    // Never a STALE Release-hold row before the real heldUnits is known —
    // the two rows are still mutually exclusive; Place-a-hold is what shows
    // instead (status is "active" and heldUnitsOf(undefined) === 0).
    expect(screen.queryByTestId("composer-action-release-hold")).toBeNull();
    expect(screen.getByTestId("composer-action-place-hold")).toBeTruthy();
  });
});
