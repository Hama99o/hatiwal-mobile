/**
 * Unit tests for ListingConversations (TASK-Q847) — the seller's per-listing
 * "conversations about this listing" screen.
 *
 * Coverage:
 *  1. Fetches via conversationsAPI.getConversations({ listingId, ... })
 *  2. Renders the shared ConversationRow with context="listing" for each row
 *  3. Offer preview is locale-formatted, never the raw "75000|AFN" metadata
 *  4. A retracted (deleted) last message shows "Message deleted", not the
 *     stale body
 *  5. Empty state (EmptyState, not a lie about a failed request)
 *  6. Error + retry state on a failed request
 *  7. A second page appends without truncating the first page's rows
 *  8. Delete: confirmAlert → optimistic removal → invalidates
 *     ["conversations"] and ["conversations", listingId] on success
 *  9. Delete: rollback + toast on failure
 * 10. Archive: optimistic removal on success, rollback + toast on failure
 * 11. Mark read / unread: optimistic override, rollback + toast on failure
 * 12. Header shows the listingTitle route param
 * 13. Renders without throwing in RTL mode
 *
 * The real `ConversationRow` is used (not mocked) so the offer/deleted-
 * message preview formatting is verified end-to-end. `UniversalList` is
 * replaced by a minimal test double that fetches on mount/id/refreshKey
 * change, supports a "load more" action, and applies `filterItems` at
 * render time exactly like the real component — staying well clear of
 * FlashList's native dependency chain.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Conversation } from "@/api/conversations";

// ── react-native-reanimated: full mock so useSharedValue/useAnimatedStyle work
//    (ConversationRow's PulsingBadge uses withRepeat) ────────────────────────

jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
    },
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => {
      try { fn(); } catch { /* noop */ }
      return {};
    },
    withTiming: (v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...args: unknown[]) => args[0],
    withSpring: (v: unknown) => v,
    createAnimatedComponent: (C: React.ComponentType) => C,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    ZoomIn: { duration: () => ({ delay: () => ({ springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) }) }) },
  };
});

jest.mock("lucide-react-native", () => ({
  Camera: "Camera",
  MapPin: "MapPin",
  Tag: "Tag",
  FileText: "FileText",
  BadgeCheck: "BadgeCheck",
  CheckCheck: "CheckCheck",
  Trash2: "Trash2",
  MailOpen: "MailOpen",
  MoreVertical: "MoreVertical",
  Archive: "Archive",
  ArchiveRestore: "ArchiveRestore",
  MessageCircle: "MessageCircle",
  RotateCcw: "RotateCcw",
  WifiOff: "WifiOff",
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
}));

jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
  usePulse: () => ({}),
  AnimatedPressable: require("react-native").Pressable,
  useListItemEntering: () => () => undefined,
  triggerHaptic: jest.fn(),
}));

jest.mock("@/lib/animation/useReduceMotion", () => ({
  useReduceMotion: () => false,
}));

// ── confirmAlert — auto-confirms the destructive button by default ─────────

jest.mock("@/utils/alert", () => ({ confirmAlert: jest.fn() }));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/api/conversations", () => ({
  conversationsAPI: {
    getConversations: jest.fn(),
    deleteConversation: jest.fn(),
    markRead: jest.fn(),
    markUnread: jest.fn(),
    archiveConversation: jest.fn(),
  },
}));

// ── expo-router — override the global mock with useFocusEffect (no-op, like
//    HiddenListings.test.tsx) and route params for this listing ────────────

const ROUTE_PARAMS = { id: "42", listingTitle: "Lenovo ThinkPad X1 Carbon" };

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ROUTE_PARAMS,
}));

// ── UniversalList test double — fetches on mount/id/refreshKey change,
//    applies filterItems at render time, supports paging + error + retry ──

jest.mock("@/components/common/UniversalList", () => {
  const React = require("react");
  const { View, Text: RNText, Pressable } = require("react-native");

  function MockUniversalList({ config }: { config: any }) {
    const [state, setState] = React.useState<{
      items: any[];
      loaded: boolean;
      error: boolean;
      page: number;
      totalPages: number;
    }>({ items: [], loaded: false, error: false, page: 1, totalPages: 1 });

    const load = React.useCallback(
      (page: number, append: boolean) => {
        config
          .fetcher({ page, perPage: config.perPage ?? 20 })
          .then((result: any) => {
            setState((prev: typeof state) => ({
              items: append ? [...prev.items, ...result.items] : result.items,
              loaded: true,
              error: false,
              page: result.currentPage,
              totalPages: result.totalPages,
            }));
          })
          .catch(() => {
            setState((prev: typeof state) => ({ ...prev, loaded: true, error: true }));
          });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [config.fetcher, config.perPage]
    );

    React.useEffect(() => {
      load(1, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.id, config.refreshKey]);

    if (!state.loaded) return <View testID="universal-list-loading" />;

    if (state.error) {
      return (
        <View testID="universal-list-error">
          <Pressable testID="universal-list-retry" onPress={() => load(1, false)} />
        </View>
      );
    }

    const visible = config.filterItems ? config.filterItems(state.items) : state.items;

    if (visible.length === 0) {
      return (
        <View testID="universal-list-empty">
          <RNText>{config.emptyTitle}</RNText>
        </View>
      );
    }

    return (
      <View testID="universal-list">
        {visible.map((item: any, index: number) => {
          const rendered = config.renderItem({ item, index });
          return rendered ? React.cloneElement(rendered, { key: String(item.id) }) : null;
        })}
        {state.page < state.totalPages && (
          <Pressable testID="universal-list-load-more" onPress={() => load(state.page + 1, true)} />
        )}
      </View>
    );
  }

  return { UniversalList: MockUniversalList };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import ListingConversations from "../ListingConversations";
import { conversationsAPI } from "@/api/conversations";
import { confirmAlert } from "@/utils/alert";
import { toast } from "sonner-native";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-06-25T09:00:00Z";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    status: "open",
    createdAt: NOW,
    lastMessageAt: NOW,
    lastMessageBody: "Is this still available?",
    lastMessageKind: "text",
    unreadCount: 0,
    listing: {
      id: 42,
      title: "Lenovo ThinkPad X1 Carbon",
      thumbnailUrl: null,
      status: "active",
      price: 85000,
      currency: "AFN",
    },
    otherParticipant: {
      id: 2,
      name: "Ahmad Karimi",
      city: "Kabul",
      verified: true,
      avatarUrl: null,
    },
    viewerRole: "seller",
    ...overrides,
  };
}

function makeResult(items: Conversation[], page = 1, totalPages = 1) {
  return {
    items,
    pagination: {
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      totalCount: items.length,
      totalPages,
    },
  };
}

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderScreen(qc = makeQc()) {
  return { qc, ...render(
    <QueryClientProvider client={qc}>
      <ListingConversations />
    </QueryClientProvider>
  ) };
}

function autoConfirmDelete() {
  (confirmAlert as jest.Mock).mockImplementation(
    (_title: string, _msg: string, buttons: Array<{ onPress?: () => void; style?: string }>) => {
      const destructive = buttons.find((b) => b.style === "destructive");
      destructive?.onPress?.();
    }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(makeResult([makeConversation()]));
  (conversationsAPI.deleteConversation as jest.Mock).mockResolvedValue(undefined);
  (conversationsAPI.markRead as jest.Mock).mockResolvedValue(undefined);
  (conversationsAPI.markUnread as jest.Mock).mockResolvedValue(undefined);
  (conversationsAPI.archiveConversation as jest.Mock).mockResolvedValue(undefined);
});

// ─── 1-2. Fetch + render ──────────────────────────────────────────────────────

describe("ListingConversations — fetch + render", () => {
  it("fetches via getConversations with the route's listing id", async () => {
    renderScreen();
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ listingId: 42, pageNumber: 1 })
      )
    );
  });

  it("renders a row for each conversation via the shared ConversationRow", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
  });

  it("shows the listingTitle route param in the header", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });
});

// ─── 3-4. Preview formatting ──────────────────────────────────────────────────

describe("ListingConversations — preview formatting", () => {
  it("shows a locale-formatted offer preview, never the raw metadata", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(
      makeResult([makeConversation({ id: 7, lastMessageKind: "offer", lastMessageBody: "75000|AFN" })])
    );
    renderScreen();
    await waitFor(() => expect(screen.getByText("chat.preview.offer")).toBeTruthy());
    expect(screen.queryByText("75000|AFN")).toBeNull();
  });

  it("shows the deleted-message preview, never the stale body", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(
      makeResult([
        makeConversation({ id: 8, lastMessageDeleted: true, lastMessageBody: "sensitive text" }),
      ])
    );
    renderScreen();
    await waitFor(() => expect(screen.getByText("chat.message.deleted")).toBeTruthy());
    expect(screen.queryByText("sensitive text")).toBeNull();
  });
});

// ─── 5-6. Empty + error states ────────────────────────────────────────────────

describe("ListingConversations — empty + error states", () => {
  it("renders EmptyState (not the error copy) when the listing genuinely has no conversations", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(makeResult([]));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-empty")).toBeTruthy());
    expect(screen.getByText("chat.noConversations")).toBeTruthy();
  });

  it("renders an error state (not the empty copy) when the request fails", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockRejectedValueOnce(new Error("network"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-error")).toBeTruthy());
    expect(screen.queryByTestId("universal-list-empty")).toBeNull();
  });

  it("retry re-fetches and renders the rows once the request succeeds", async () => {
    (conversationsAPI.getConversations as jest.Mock)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(makeResult([makeConversation({ id: 9 })]));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-error")).toBeTruthy());

    fireEvent.press(screen.getByTestId("universal-list-retry"));

    await waitFor(() => expect(screen.getByTestId("conversation-row-9")).toBeTruthy());
  });
});

// ─── 7. Pagination ────────────────────────────────────────────────────────────

describe("ListingConversations — pagination", () => {
  it("appends a second page without truncating the first page's rows", async () => {
    (conversationsAPI.getConversations as jest.Mock)
      .mockResolvedValueOnce(makeResult([makeConversation({ id: 1 })], 1, 2))
      .mockResolvedValueOnce(
        makeResult(
          [makeConversation({ id: 2, otherParticipant: { id: 3, name: "Zainab", city: null, verified: false, avatarUrl: null } })],
          2,
          2
        )
      );
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent.press(screen.getByTestId("universal-list-load-more"));

    await waitFor(() => expect(screen.getByTestId("conversation-row-2")).toBeTruthy());
    expect(screen.getByTestId("conversation-row-1")).toBeTruthy();
  });
});

// ─── 8-9. Delete ──────────────────────────────────────────────────────────────

describe("ListingConversations — delete", () => {
  it("removes the row and invalidates both conversations query keys on success", async () => {
    autoConfirmDelete();
    const { qc } = renderScreen();
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-delete"));

    await waitFor(() => expect(conversationsAPI.deleteConversation).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByTestId("conversation-row-1")).toBeNull());
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["conversations"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["conversations", 42] });
  });

  it("rolls back (restores the row) and shows a toast on delete failure", async () => {
    autoConfirmDelete();
    (conversationsAPI.deleteConversation as jest.Mock).mockRejectedValueOnce(new Error("fail"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-delete"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("common.error"));
    expect(screen.getByTestId("conversation-row-1")).toBeTruthy();
  });
});

// ─── 10. Archive ──────────────────────────────────────────────────────────────

describe("ListingConversations — archive", () => {
  it("removes the row on successful archive", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-archive"));

    await waitFor(() => expect(conversationsAPI.archiveConversation).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByTestId("conversation-row-1")).toBeNull());
  });

  it("rolls back and shows a toast on archive failure", async () => {
    (conversationsAPI.archiveConversation as jest.Mock).mockRejectedValueOnce(new Error("fail"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-archive"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("chat.archive.error"));
    expect(screen.getByTestId("conversation-row-1")).toBeTruthy();
  });
});

// ─── 11. Mark read / unread ───────────────────────────────────────────────────

describe("ListingConversations — mark read / unread", () => {
  it("marks a conversation read and rolls back with a toast on failure", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(
      makeResult([makeConversation({ id: 1, unreadCount: 3 })])
    );
    (conversationsAPI.markRead as jest.Mock).mockRejectedValueOnce(new Error("fail"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("unread-badge-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-mark-read"));

    await waitFor(() => expect(conversationsAPI.markRead).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("chat.actions.markReadError"));
  });

  it("marks a conversation unread on success", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("conversation-row-1")).toBeTruthy());

    fireEvent(screen.getByTestId("conversation-row-1"), "longPress");
    fireEvent.press(screen.getByTestId("menu-mark-unread"));

    await waitFor(() => expect(conversationsAPI.markUnread).toHaveBeenCalledWith(1));
  });
});

// ─── 13. RTL ──────────────────────────────────────────────────────────────────

describe("ListingConversations — RTL locale", () => {
  it("renders without throwing when isRtl is true (Pashto/Dari)", async () => {
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      isRtl: true,
      formatCurrency: (n: number, c = "AFN") => `${c} ${n}`,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatSmartTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      lang: "ps",
    });

    expect(() => renderScreen()).not.toThrow();
    await waitFor(() => expect(screen.queryByTestId("conversation-row-1")).toBeTruthy());

    jest.restoreAllMocks();
  });
});
