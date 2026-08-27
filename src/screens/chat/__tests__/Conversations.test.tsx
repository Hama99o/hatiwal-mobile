/**
 * Conversations screen — unit tests (TASK-R517: Buying/Selling role scope).
 *
 * Covers:
 *  - The chip row exposes both Buying and Selling chips.
 *  - Tapping Selling calls conversationsAPI.getConversations with role: "selling".
 *  - Tapping Buying calls conversationsAPI.getConversations with role: "buying".
 *  - Tapping the active role chip again deselects it back to "both" (role: undefined).
 *  - TRAP (explicitly called out in the ticket): while a role filter is
 *    active, the fetcher must NOT overwrite the chat-tab unread badge with
 *    the role-scoped subset — it keeps the last unfiltered total.
 *  - Role-aware empty states (Selling → Post a listing CTA, Buying → Browse CTA).
 *  - The role chip (and its filter) survives switching to the Archived tab
 *    (composition — review fix for the "hidden, uncleanable filter" bug).
 *  - Archived + role-active empty state uses the plain archive copy, not the
 *    inbox-flavored role copy/CTA (review fix, tab-first ordering).
 *
 * `ConversationRow` and `UniversalList` are replaced by MANUAL jest mocks
 * (`../conversations/__mocks__/ConversationRow.tsx`,
 * `@/components/common/__mocks__/UniversalList.tsx`) rather than inline
 * `jest.mock(path, factory)` calls — see the doc comments on those two files:
 * a hoisted mock factory that BOTH requires a module and returns a JSX
 * element crashes babel-plugin-jest-hoist in this toolchain
 * ("VariableDeclaration ... declarations[0] ... undefined"), which is
 * exactly why this file was previously disabled as `.broken`. Enable a
 * manual mock with a bare `jest.mock(path)` (no factory) instead.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// The chat-tab badge no longer reads a zustand store — it reads unreadMessageCount off
// ["me"], so it is right before the user ever opens this screen. What this screen still
// owns is its OWN header badge, and the page-1-only / never-role-filtered reasoning
// below applies to it unchanged, so these tests now assert that rendered badge.
const unreadBadge = () => screen.queryByTestId("chat-unread-badge");

// The screen now uses useQueryClient — it invalidates ["me"] after a read so the chat
// TAB badge (which reads unreadMessageCount off that query) does not keep advertising
// messages the user has just read. A bare render therefore throws "No QueryClient set".
function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConversationsScreen />
    </QueryClientProvider>
  );
}


jest.mock("@/api/conversations", () => {
  const actual = jest.requireActual("@/api/conversations");
  return {
    ...actual,
    conversationsAPI: {
      ...actual.conversationsAPI,
      getConversations: jest.fn(),
      deleteConversation: jest.fn(),
      archiveConversation: jest.fn(),
      unarchiveConversation: jest.fn(),
      markRead: jest.fn(),
      markUnread: jest.fn(),
    },
  };
});

// Manual mocks (see file header) — ConversationRow's own rendering is already
// covered by conversations/__tests__/ConversationRow.test.tsx; here we only
// need the listing title so this stays a fast unit test of the screen's own
// filter/fetcher wiring.
jest.mock("@/screens/chat/conversations/ConversationRow");
jest.mock("@/components/common/UniversalList");

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import ConversationsScreen from "../Conversations";
import { conversationsAPI } from "@/api/conversations";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: "open",
    createdAt: "2026-06-25T09:00:00Z",
    lastMessageAt: "2026-06-25T09:00:00Z",
    lastMessageBody: "Hi, is this still available?",
    lastMessageKind: "text",
    unreadCount: 0,
    listing: { id: 10, title: "iPhone 12 Pro", thumbnailUrl: null, status: "active" },
    otherParticipant: { id: 2, name: "Ahmad Karimi", city: "Kabul", verified: false, avatarUrl: null },
    ...overrides,
  };
}

function makeResult(items: unknown[]) {
  return {
    items,
    pagination: {
      currentPage: 1,
      nextPage: null,
      prevPage: null,
      totalCount: items.length,
      totalPages: 1,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(
    makeResult([makeConversation()])
  );
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Conversations — role chip row", () => {
  it("renders both the Buying and Selling chips", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());
    expect(screen.getByTestId("role-chip-buying")).toBeTruthy();
    expect(screen.getByTestId("role-chip-selling")).toBeTruthy();
  });

  it("still renders the All/Unread/Read read-state chips alongside the role chips", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());
    expect(screen.getByTestId("filter-chip-all")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-unread")).toBeTruthy();
    expect(screen.getByTestId("filter-chip-read")).toBeTruthy();
  });

  it("tapping Selling calls getConversations with role: 'selling'", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });

    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );
  });

  it("tapping Buying calls getConversations with role: 'buying'", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-buying"));
    });

    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "buying" })
      )
    );
  });

  it("tapping Selling twice deselects it back to both (role omitted)", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: undefined })
      )
    );
  });

  it("selecting Buying while Selling is active switches to Buying (mutually exclusive)", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-buying"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "buying" })
      )
    );
  });
});

describe("Conversations — role scope composes with the Archived tab (review fix)", () => {
  it("keeps the role chip visible (and active) after switching to Archived", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-archived"));
    });

    // The chip must still be reachable in Archived — the bug this guards
    // against was the chip disappearing (gated on tabMode === "inbox") while
    // the filter itself kept silently narrowing the archive with no way to
    // clear it from that screen.
    expect(screen.getByTestId("role-chip-selling")).toBeTruthy();
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ archived: true, role: "selling" })
      )
    );
  });

  it("lets the user clear the role scope from the Archived tab", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-archived"));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });

    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenLastCalledWith(
        expect.objectContaining({ archived: true, role: undefined })
      )
    );
  });

  it("does NOT show the read-state (All/Unread/Read) chips in the Archived tab", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-archived"));
    });

    expect(screen.queryByTestId("filter-chip-all")).toBeNull();
    expect(screen.queryByTestId("filter-chip-unread")).toBeNull();
    expect(screen.queryByTestId("filter-chip-read")).toBeNull();
    // The role group is still there.
    expect(screen.getByTestId("role-chip-selling")).toBeTruthy();
  });

  it("shows the plain archive-empty copy (not the role/inbox copy or CTA) when Archived+Selling is empty", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(makeResult([]));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-empty")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-archived"));
    });

    await waitFor(() => expect(screen.getByText("chat.archive.empty")).toBeTruthy());
    // Neither the Selling-flavored inbox copy nor its CTA (which doesn't
    // make sense on an archive) should appear.
    expect(screen.queryByText("chat.empty.sellingTitle")).toBeNull();
    expect(screen.queryByText("listing.postListing")).toBeNull();
    expect(screen.queryByTestId("empty-action")).toBeNull();
  });
});

describe("Conversations — unread badge trap (TASK-R517)", () => {
  it("syncs the chat-tab unread badge from the first unfiltered fetch", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(
      makeResult([
        makeConversation({ unreadCount: 3 }),
        makeConversation({ id: 2, unreadCount: 2 }),
      ])
    );
    renderScreen();
    await waitFor(() => expect(unreadBadge()).toHaveTextContent("5"));
  });

  it("does NOT overwrite the unread badge while a role filter is active", async () => {
    // Keyed mockImplementation, NOT a queue of mockResolvedValueOnce. The screen fires
    // more fetches than a fixed queue covers (six, measured with a probe), and once the
    // queue runs dry the unmocked calls resolve undefined and wipe the very state being
    // asserted. Keying on `role` also states the fixture's intent directly: the FULL
    // inbox totals 5, a role-scoped page holds one side only and reports 1.
    (conversationsAPI.getConversations as jest.Mock).mockImplementation((params) =>
      Promise.resolve(
        params?.role
          ? makeResult([makeConversation({ id: 3, unreadCount: 1 })])
          : makeResult([
              makeConversation({ unreadCount: 3 }),
              makeConversation({ id: 2, unreadCount: 2 }),
            ])
      )
    );

    renderScreen();
    await waitFor(() => expect(unreadBadge()).toHaveTextContent("5"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );

    // Still 5 — never the role-scoped page's 1.
    await waitFor(() => expect(unreadBadge()).toHaveTextContent("5"));
  });

  it("resumes syncing the badge once the role filter is cleared back to both", async () => {
    // Same keyed mock; `fullInbox` is swapped mid-test so the resumed sync has a
    // different total to pick up, which is the whole point of the assertion.
    let fullInbox = [makeConversation({ unreadCount: 5 })];
    (conversationsAPI.getConversations as jest.Mock).mockImplementation((params) =>
      Promise.resolve(
        params?.role
          ? makeResult([makeConversation({ id: 3, unreadCount: 1 })])
          : makeResult(fullInbox)
      )
    );

    renderScreen();
    await waitFor(() => expect(unreadBadge()).toHaveTextContent("5"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() =>
      expect(conversationsAPI.getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ role: "selling" })
      )
    );

    fullInbox = [makeConversation({ unreadCount: 7 })];
    await act(async () => {
      // Deselect — back to the full, unfiltered inbox.
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });
    await waitFor(() => expect(unreadBadge()).toHaveTextContent("7"));
  });
});

describe("Conversations — role-aware empty states", () => {
  it("shows the Selling empty state with a Post-a-listing CTA", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(makeResult([]));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-empty")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-selling"));
    });

    await waitFor(() => expect(screen.getByText("chat.empty.sellingTitle")).toBeTruthy());
    expect(screen.getByText("listing.postListing")).toBeTruthy();
  });

  it("shows the Buying empty state with a Browse CTA", async () => {
    (conversationsAPI.getConversations as jest.Mock).mockResolvedValue(makeResult([]));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("universal-list-empty")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId("role-chip-buying"));
    });

    await waitFor(() => expect(screen.getByText("chat.empty.buyingTitle")).toBeTruthy());
    expect(screen.getByText("chat.empty.browseAction")).toBeTruthy();
  });
});
