/**
 * Unit tests for ConversationRow — the conversation list item.
 *
 * Coverage:
 *  1. Renders listing title and other participant name
 *  2. Renders unread count badge when unreadCount > 0
 *  3. Does NOT render unread badge when unreadCount is 0 or undefined
 *  4. Dims the row for sold/reserved listings (isInactive opacity logic via testID)
 *  5. Shows last message body (text preview)
 *  6. Shows meetup, offer, photo, file preview labels for special message kinds
 *  7. Navigates to the conversation thread on press
 *  8. Long-press calls confirmAlert (destructive delete confirm)
 *  9. onDelete fires after confirmation
 * 10. Handles null lastMessageAt / lastMessageBody gracefully
 * 11. Handles missing otherParticipant gracefully
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ConversationRow } from "../ConversationRow";
import type { Conversation } from "@/api/conversations";

// ── react-native-reanimated: full mock so useSharedValue/useAnimatedStyle work ─

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
  };
});

// ── Lucide icons ───────────────────────────────────────────────────────────────

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
  // TASK-R517: the role pill's leading icon.
  Store: "Store",
  ShoppingBag: "ShoppingBag",
}));

// ── @/lib/animation — reduce-motion + pulse mocks ─────────────────────────────

jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
  usePulse: () => ({}),
  AnimatedPressable: require("react-native").Pressable,
  useListItemEntering: () => () => undefined,
  triggerHaptic: jest.fn(),
}));

// ── confirmAlert — mock so we can verify it is called ─────────────────────────

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

// ── Zustand stores — not needed by ConversationRow directly ───────────────────


// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = "2026-06-25T09:00:00Z";

// TASK-J471 (review fix): `listing.price`/`listing.currency` below match the
// REAL `GET /api/v1/conversations` (`:list` view) payload, not just the
// `:detailed` single-conversation view — see
// hatiwal-api/app/serializers/conversation_serializer.rb's `:list` block
// (`field(:listing) { ... price: c.listing.price, currency: c.listing.currency }`)
// and its covering request spec
// (hatiwal-api/spec/requests/api/v1/conversations_spec.rb, "includes the
// listing's price and currency for the inbox PriceTag"). Before that fix the
// `:list` view never sent these fields, so this fixture — despite being a
// valid `Conversation` per the TS union type — described a payload the inbox
// never actually receives, and the suite passed while production rendered
// nothing.
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
      id: 10,
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
    ...overrides,
  };
}

// ── 1. Basic render ───────────────────────────────────────────────────────────

describe("ConversationRow — basic render", () => {
  it("renders the listing title", () => {
    render(<ConversationRow item={makeConversation()} onDelete={jest.fn()} />);
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });

  it("renders the other participant name via UserIdentity", () => {
    render(<ConversationRow item={makeConversation()} onDelete={jest.fn()} />);
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
  });

  it("renders the last message body as text preview", () => {
    render(<ConversationRow item={makeConversation()} onDelete={jest.fn()} />);
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });
});

// ── 2. Unread badge ───────────────────────────────────────────────────────────

describe("ConversationRow — unread badge", () => {
  it("renders unread count badge when unreadCount > 0", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 100, unreadCount: 3 })}
        onDelete={jest.fn()}
      />
    );
    // Badge is rendered inside <PulsingBadge> with testID keyed off item.id
    // (a stable identity — never the item's transient render-position index,
    // which shifts under list-level search/filtering — see cycle-3 CR fix).
    expect(screen.getByTestId("unread-badge-100")).toBeTruthy();
  });

  it("does NOT render unread badge when unreadCount is 0", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 101, unreadCount: 0 })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByTestId("unread-badge-101")).toBeNull();
  });

  it("does NOT render unread badge when unreadCount is undefined", () => {
    const item = makeConversation({ id: 102 });
    delete (item as Partial<Conversation>).unreadCount;
    render(<ConversationRow item={item} onDelete={jest.fn()} />);
    expect(screen.queryByTestId("unread-badge-102")).toBeNull();
  });
});

// ── 3. Special message kind previews ─────────────────────────────────────────

describe("ConversationRow — special message kind previews", () => {
  // t() returns key in tests, so chat.preview.* translations are returned as keys
  it("shows meetup preview for meetup_proposal kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "meetup_proposal",
          lastMessageBody: "Share Naw | 5pm",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.meetup")).toBeTruthy();
  });

  it("shows meetupAccepted preview for meetup_accepted kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "meetup_accepted",
          lastMessageBody: "Accepted",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.meetupAccepted")).toBeTruthy();
  });

  it("shows meetupDeclined preview for meetup_declined kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "meetup_declined",
          lastMessageBody: "Declined",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.meetupDeclined")).toBeTruthy();
  });

  it("shows offer preview for offer kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "offer",
          lastMessageBody: "75000|AFN",
        })}
        onDelete={jest.fn()}
      />
    );
    // t("chat.preview.offer", {...}) → "chat.preview.offer" in tests
    expect(screen.getByText("chat.preview.offer")).toBeTruthy();
  });

  // TASK-Z684 review fix: `offer_counter` used to fall through to `default`
  // and render the raw "amount|currency|listedPrice" metadata body instead
  // of a translated preview.
  it("shows offerCounter preview for offer_counter kind, not the raw metadata body", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "offer_counter",
          lastMessageBody: "70000|AFN|85000",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.offerCounter")).toBeTruthy();
    expect(screen.queryByText("70000|AFN|85000")).toBeNull();
  });

  it("shows offerAccepted preview for offer_accepted kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "offer_accepted",
          lastMessageBody: "Accepted",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.offerAccepted")).toBeTruthy();
  });

  it("shows offerDeclined preview for offer_declined kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "offer_declined",
          lastMessageBody: "Declined",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.offerDeclined")).toBeTruthy();
  });

  it("shows photo preview for image_message kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "image_message",
          lastMessageBody: "photo.jpg",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.photo")).toBeTruthy();
  });

  it("shows file preview for document kind", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageKind: "document",
          lastMessageBody: "file.pdf",
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.file")).toBeTruthy();
  });
});

// ── 4. Sold / reserved listing dimming ───────────────────────────────────────

describe("ConversationRow — inactive listing dimming", () => {
  // The sold/reserved rows use a faded thumbnail (opacity 0.45 via styles.thumbFaded)
  // and a mutedForeground title color. The cleanest way to confirm both states render
  // without crashing (color inspection is fragile) is a smoke test.
  it("renders without crashing for a sold listing", () => {
    expect(() =>
      render(
        <ConversationRow
          item={makeConversation({
            listing: { id: 1, title: "Old Laptop", thumbnailUrl: null, status: "sold" },
          })}
          onDelete={jest.fn()}
        />
      )
    ).not.toThrow();
  });

  it("renders without crashing for a reserved listing", () => {
    expect(() =>
      render(
        <ConversationRow
          item={makeConversation({
            listing: { id: 1, title: "Carpet", thumbnailUrl: null, status: "reserved" },
          })}
          onDelete={jest.fn()}
        />
      )
    ).not.toThrow();
  });

  it("renders without crashing for an active listing (normal)", () => {
    expect(() =>
      render(
        <ConversationRow
          item={makeConversation({
            listing: { id: 1, title: "Phone", thumbnailUrl: null, status: "active" },
          })}
          onDelete={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── 5. Navigation on press ────────────────────────────────────────────────────

describe("ConversationRow — press navigation", () => {
  it("calls router.push with the correct conversation route on press", () => {
    const mockPush = jest.fn();
    jest
      .spyOn(require("expo-router"), "useRouter")
      .mockReturnValue({ push: mockPush, replace: jest.fn(), back: jest.fn() });

    render(<ConversationRow item={makeConversation({ id: 42 })} onDelete={jest.fn()} />);
    fireEvent.press(screen.getByText("Lenovo ThinkPad X1 Carbon"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/42");
  });
});

// ── 6. Long-press opens action menu ──────────────────────────────────────────

describe("ConversationRow — row testID for Maestro", () => {
  // Cycle-3 CR fix: testID is keyed off the conversation's stable `item.id`,
  // never a transient render-position `index` — with list-level search
  // (TASK-Z684) the same conversation can render at a different position
  // depending on what's filtered in/out, so a position-based testID could
  // silently point E2E taps/assertions at the wrong conversation.
  it("exposes testID conversation-row-{item.id} on the row Pressable", () => {
    render(<ConversationRow item={makeConversation({ id: 10 })} onDelete={jest.fn()} />);
    expect(screen.getByTestId("conversation-row-10")).toBeTruthy();
  });

  it("keys the testID off item.id regardless of list position", () => {
    render(<ConversationRow item={makeConversation({ id: 20 })} onDelete={jest.fn()} />);
    expect(screen.getByTestId("conversation-row-20")).toBeTruthy();
  });

  it("keys the options-button testID off item.id too", () => {
    render(<ConversationRow item={makeConversation({ id: 30 })} onDelete={jest.fn()} />);
    expect(screen.getByTestId("conversation-options-30")).toBeTruthy();
  });
});

describe("ConversationRow — long-press action menu", () => {
  it("opens the action menu on long-press", () => {
    render(<ConversationRow item={makeConversation({ id: 99 })} onDelete={jest.fn()} />);
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("conversation-action-menu")).toBeTruthy();
  });

  it("shows Mark as read option when unreadCount > 0", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 99, unreadCount: 3 })}
        onDelete={jest.fn()}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-mark-read")).toBeTruthy();
    expect(screen.queryByTestId("menu-mark-unread")).toBeNull();
  });

  it("shows Mark as unread option when unreadCount === 0", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 99, unreadCount: 0 })}
        onDelete={jest.fn()}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-mark-unread")).toBeTruthy();
    expect(screen.queryByTestId("menu-mark-read")).toBeNull();
  });

  it("calls onMarkRead with the conversation id when Mark as read is pressed", () => {
    const onMarkRead = jest.fn();
    render(
      <ConversationRow
        item={makeConversation({ id: 42, unreadCount: 2 })}
        onDelete={jest.fn()}
        onMarkRead={onMarkRead}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-mark-read"));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(onMarkRead).toHaveBeenCalledWith(42);
  });

  it("calls onMarkUnread with the conversation id when Mark as unread is pressed", () => {
    const onMarkUnread = jest.fn();
    render(
      <ConversationRow
        item={makeConversation({ id: 55, unreadCount: 0 })}
        onDelete={jest.fn()}
        onMarkUnread={onMarkUnread}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-mark-unread"));
    expect(onMarkUnread).toHaveBeenCalledTimes(1);
    expect(onMarkUnread).toHaveBeenCalledWith(55);
  });

  it("shows the Delete option in the menu", () => {
    render(<ConversationRow item={makeConversation({ id: 99 })} onDelete={jest.fn()} />);
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-delete")).toBeTruthy();
  });

  it("fires confirmAlert when Delete is pressed from the menu", () => {
    const { confirmAlert } = require("@/utils/alert");
    render(<ConversationRow item={makeConversation({ id: 99 })} onDelete={jest.fn()} />);
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-delete"));
    expect(confirmAlert).toHaveBeenCalledTimes(1);
  });

  it("fires onDelete with the conversation id when the destructive button is confirmed", () => {
    const { confirmAlert } = require("@/utils/alert") as { confirmAlert: jest.Mock };
    const onDelete = jest.fn();

    confirmAlert.mockImplementation(
      (_title: string, _msg: string, buttons: Array<{ onPress?: () => void; style?: string }>) => {
        const destructive = buttons.find((b) => b.style === "destructive");
        destructive?.onPress?.();
      }
    );

    render(<ConversationRow item={makeConversation({ id: 99 })} onDelete={onDelete} />);
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-delete"));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(99);
  });
});

// ── 6b. Archive / Unarchive menu items ────────────────────────────────────────

describe("ConversationRow — archive / unarchive menu items", () => {
  it("shows Archive option in inbox tab (default)", () => {
    render(
      <ConversationRow item={makeConversation({ id: 10 })} tabMode="inbox" onDelete={jest.fn()} />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-archive")).toBeTruthy();
    expect(screen.queryByTestId("menu-unarchive")).toBeNull();
  });

  it("shows Unarchive option in archived tab", () => {
    render(
      <ConversationRow item={makeConversation({ id: 10 })} tabMode="archived" onDelete={jest.fn()} />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-unarchive")).toBeTruthy();
    expect(screen.queryByTestId("menu-archive")).toBeNull();
  });

  it("calls onArchive with the conversation id when Archive is pressed", () => {
    const onArchive = jest.fn();
    render(
      <ConversationRow
        item={makeConversation({ id: 42 })}
        tabMode="inbox"
        onDelete={jest.fn()}
        onArchive={onArchive}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-archive"));
    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onArchive).toHaveBeenCalledWith(42);
  });

  it("calls onUnarchive with the conversation id when Unarchive is pressed", () => {
    const onUnarchive = jest.fn();
    render(
      <ConversationRow
        item={makeConversation({ id: 55 })}
        tabMode="archived"
        onDelete={jest.fn()}
        onUnarchive={onUnarchive}
      />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    fireEvent.press(screen.getByTestId("menu-unarchive"));
    expect(onUnarchive).toHaveBeenCalledTimes(1);
    expect(onUnarchive).toHaveBeenCalledWith(55);
  });

  it("still shows Delete in the inbox tab menu (alongside Archive)", () => {
    render(
      <ConversationRow item={makeConversation({ id: 10 })} tabMode="inbox" onDelete={jest.fn()} />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-delete")).toBeTruthy();
    expect(screen.getByTestId("menu-archive")).toBeTruthy();
  });

  it("still shows Delete in the archived tab menu (alongside Unarchive)", () => {
    render(
      <ConversationRow item={makeConversation({ id: 10 })} tabMode="archived" onDelete={jest.fn()} />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    expect(screen.getByTestId("menu-delete")).toBeTruthy();
    expect(screen.getByTestId("menu-unarchive")).toBeTruthy();
  });

  it("defaults to inbox tab when tabMode prop is omitted", () => {
    render(
      <ConversationRow item={makeConversation({ id: 10 })} onDelete={jest.fn()} />
    );
    fireEvent(screen.getByText("Lenovo ThinkPad X1 Carbon"), "longPress");
    // inbox default shows Archive (not Unarchive)
    expect(screen.getByTestId("menu-archive")).toBeTruthy();
    expect(screen.queryByTestId("menu-unarchive")).toBeNull();
  });
});

// ── 6c. Role pill (TASK-R517) ─────────────────────────────────────────────────

describe("ConversationRow — role pill", () => {
  it("shows a Selling pill when viewerRole is 'seller'", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 1, viewerRole: "seller" })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId("role-pill-1")).toBeTruthy();
    expect(screen.getByText("chat.role.selling")).toBeTruthy();
  });

  it("shows a Buying pill when viewerRole is 'buyer'", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 2, viewerRole: "buyer" })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId("role-pill-2")).toBeTruthy();
    expect(screen.getByText("chat.role.buying")).toBeTruthy();
  });

  it("does NOT render the role pill when viewerRole is undefined", () => {
    const item = makeConversation({ id: 3 });
    delete (item as Partial<Conversation>).viewerRole;
    render(<ConversationRow item={item} onDelete={jest.fn()} />);
    expect(screen.queryByTestId("role-pill-3")).toBeNull();
  });

  // Review fix: the screen's active role scope makes the pill redundant —
  // every row in a Selling-only list is trivially "Selling".
  it("does NOT render the pill when the active role filter matches viewerRole (selling)", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 4, viewerRole: "seller" })}
        role="selling"
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByTestId("role-pill-4")).toBeNull();
  });

  it("does NOT render the pill when the active role filter matches viewerRole (buying)", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 5, viewerRole: "buyer" })}
        role="buying"
        onDelete={jest.fn()}
      />
    );
    expect(screen.queryByTestId("role-pill-5")).toBeNull();
  });

  it("still renders the pill when the active role filter does NOT match viewerRole", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 6, viewerRole: "seller" })}
        role="buying"
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId("role-pill-6")).toBeTruthy();
  });

  it("still renders the pill in the mixed/unfiltered inbox (role undefined)", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 7, viewerRole: "buyer" })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId("role-pill-7")).toBeTruthy();
  });
});

// ── 7. Edge cases ─────────────────────────────────────────────────────────────

describe("ConversationRow — edge cases", () => {
  it("renders without crashing when lastMessageAt is null", () => {
    expect(() =>
      render(
        <ConversationRow
          item={makeConversation({ lastMessageAt: null, lastMessageBody: null })}
          onDelete={jest.fn()}
        />
      )
    ).not.toThrow();
  });

  it("renders without crashing when otherParticipant is undefined", () => {
    const item = makeConversation();
    delete (item as Partial<Conversation>).otherParticipant;
    expect(() =>
      render(<ConversationRow item={item} onDelete={jest.fn()} />)
    ).not.toThrow();
  });

  it("shows noMessages placeholder when lastMessageBody is null", () => {
    render(
      <ConversationRow
        item={makeConversation({ lastMessageBody: null, lastMessageKind: null })}
        onDelete={jest.fn()}
      />
    );
    // t("chat.noMessages") → "chat.noMessages" in tests
    expect(screen.getByText("chat.noMessages")).toBeTruthy();
  });

  it("renders without crashing when thumbnailUrl is provided", () => {
    expect(() =>
      render(
        <ConversationRow
          item={makeConversation({
            listing: {
              id: 1,
              title: "Laptop",
              thumbnailUrl: "https://picsum.photos/seed/1/200/200",
              status: "active",
            },
          })}
          onDelete={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

// ── 8. Listing price via PriceTag (TASK-J471) ────────────────────────────────
// formatCurrency is mocked globally (src/__tests__/setup.ts) as
// `${currency} ${amount}` — e.g. price 85000 / currency "AFN" → "AFN 85000".

describe("ConversationRow — listing price", () => {
  it("renders the formatted price when the listing has a price", () => {
    render(
      <ConversationRow
        item={makeConversation({
          listing: {
            id: 10,
            title: "Lenovo ThinkPad X1 Carbon",
            thumbnailUrl: null,
            status: "active",
            price: 85000,
            currency: "AFN",
          },
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("AFN 85000")).toBeTruthy();
  });

  it("renders no price text (and no PriceTag) when the listing has no price", () => {
    render(
      <ConversationRow
        item={makeConversation({
          listing: {
            id: 11,
            title: "Hand-woven rug (price on request)",
            thumbnailUrl: null,
            status: "active",
          },
        })}
        onDelete={jest.fn()}
      />
    );
    // PriceTag returns null when price is null/undefined — nothing formatted
    // as a currency string should appear anywhere on the row.
    expect(screen.queryByText(/^AFN /)).toBeNull();
  });

  it("still shows the price (muted tone) on a sold listing", () => {
    render(
      <ConversationRow
        item={makeConversation({
          listing: {
            id: 12,
            title: "Old Laptop",
            thumbnailUrl: null,
            status: "sold",
            price: 40000,
            currency: "AFN",
          },
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("AFN 40000")).toBeTruthy();
  });

  it("still shows the price (muted tone) on a reserved listing", () => {
    render(
      <ConversationRow
        item={makeConversation({
          listing: {
            id: 13,
            title: "Carpet",
            thumbnailUrl: null,
            status: "reserved",
            price: 15000,
            currency: "AFN",
          },
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("AFN 15000")).toBeTruthy();
  });

  it("formats a non-default currency correctly", () => {
    render(
      <ConversationRow
        item={makeConversation({
          listing: {
            id: 14,
            title: "Camera",
            thumbnailUrl: null,
            status: "active",
            price: 300,
            currency: "USD",
          },
        })}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("USD 300")).toBeTruthy();
  });
});

// ── 8b. "listing" context (TASK-Q847) ────────────────────────────────────────
// The per-listing conversations screen (ListingConversations.tsx) renders
// every row with context="listing" — the listing thumbnail/title/PriceTag/
// StatusBadge group is dropped (every row already shares the SAME listing,
// which is the screen's own header) and the buyer's UserIdentity is
// promoted to the row's headline. The preview line, unread badge, time, and
// long-press menu must stay identical to the inbox.

describe("ConversationRow — listing context (TASK-Q847)", () => {
  it("defaults to inbox context (renders the listing title) when context is omitted", () => {
    render(<ConversationRow item={makeConversation()} onDelete={jest.fn()} />);
    expect(screen.getByText("Lenovo ThinkPad X1 Carbon")).toBeTruthy();
  });

  it("hides the listing title when context is 'listing'", () => {
    render(
      <ConversationRow item={makeConversation()} context="listing" onDelete={jest.fn()} />
    );
    expect(screen.queryByText("Lenovo ThinkPad X1 Carbon")).toBeNull();
  });

  it("hides the listing price (PriceTag) when context is 'listing'", () => {
    render(
      <ConversationRow item={makeConversation()} context="listing" onDelete={jest.fn()} />
    );
    // formatCurrency is mocked as `${currency} ${amount}` — see src/__tests__/setup.ts.
    expect(screen.queryByText("AFN 85000")).toBeNull();
  });

  it("shows the buyer's name exactly once (promoted to the row headline) when context is 'listing'", () => {
    render(
      <ConversationRow item={makeConversation()} context="listing" onDelete={jest.fn()} />
    );
    // Inbox context would additionally repeat the name in row2 — listing
    // context must show it only once, as the headline.
    expect(screen.getAllByText("Ahmad Karimi")).toHaveLength(1);
  });

  it("still shows the last-message preview text when context is 'listing'", () => {
    render(
      <ConversationRow item={makeConversation()} context="listing" onDelete={jest.fn()} />
    );
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("formats an offer preview (never the raw metadata) when context is 'listing'", () => {
    render(
      <ConversationRow
        item={makeConversation({ lastMessageKind: "offer", lastMessageBody: "75000|AFN" })}
        context="listing"
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("chat.preview.offer")).toBeTruthy();
    expect(screen.queryByText("75000|AFN")).toBeNull();
  });

  it("still shows the unread badge when context is 'listing'", () => {
    render(
      <ConversationRow
        item={makeConversation({ id: 200, unreadCount: 4 })}
        context="listing"
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByTestId("unread-badge-200")).toBeTruthy();
  });

  it("still opens the same long-press action menu when context is 'listing'", () => {
    render(
      <ConversationRow item={makeConversation({ id: 201 })} context="listing" onDelete={jest.fn()} />
    );
    fireEvent(screen.getByTestId("conversation-row-201"), "longPress");
    expect(screen.getByTestId("conversation-action-menu")).toBeTruthy();
    expect(screen.getByTestId("menu-mark-unread")).toBeTruthy();
    expect(screen.getByTestId("menu-archive")).toBeTruthy();
    expect(screen.getByTestId("menu-delete")).toBeTruthy();
  });

  it("still fires onDelete with the conversation id after confirmAlert in listing context", () => {
    const { confirmAlert } = require("@/utils/alert") as { confirmAlert: jest.Mock };
    confirmAlert.mockImplementation(
      (_title: string, _msg: string, buttons: Array<{ onPress?: () => void; style?: string }>) => {
        const destructive = buttons.find((b) => b.style === "destructive");
        destructive?.onPress?.();
      }
    );
    const onDelete = jest.fn();
    render(
      <ConversationRow item={makeConversation({ id: 202 })} context="listing" onDelete={onDelete} />
    );
    fireEvent(screen.getByTestId("conversation-row-202"), "longPress");
    fireEvent.press(screen.getByTestId("menu-delete"));
    expect(onDelete).toHaveBeenCalledWith(202);
  });

  it("renders without crashing when otherParticipant is undefined in listing context", () => {
    const item = makeConversation();
    delete (item as Partial<Conversation>).otherParticipant;
    expect(() =>
      render(<ConversationRow item={item} context="listing" onDelete={jest.fn()} />)
    ).not.toThrow();
  });
});

// ── 9. Search-term highlight on the preview line (TASK-J471) ────────────────
// Shares the exact `HighlightedText` component MessageBubble uses for
// in-thread message search — this only verifies ConversationRow wires its
// `searchTerm` prop through correctly, not the highlighter's own internals
// (see src/components/common/__tests__/HighlightedText.test.tsx for those).

describe("ConversationRow — search highlight", () => {
  it("renders the preview as one plain node when searchTerm is omitted", () => {
    render(<ConversationRow item={makeConversation()} onDelete={jest.fn()} />);
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("highlights the matching substring in the preview when searchTerm matches", () => {
    render(
      <ConversationRow
        item={makeConversation({
          lastMessageBody: "Is this still available?",
          lastMessageKind: "text",
        })}
        searchTerm="available"
        onDelete={jest.fn()}
      />
    );
    // The matched substring renders as its own segment, carrying the
    // warning-highlight style (see HighlightedText.test.tsx for the style
    // assertion) — its presence as an exact-text node is what this wiring
    // test cares about.
    expect(screen.getByText("available")).toBeTruthy();
  });

  it("matches case-insensitively while preserving the original casing", () => {
    render(
      <ConversationRow
        item={makeConversation({ lastMessageBody: "AVAILABLE now", lastMessageKind: "text" })}
        searchTerm="available"
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("AVAILABLE")).toBeTruthy();
  });

  it("renders the preview unsplit when searchTerm doesn't match the preview text", () => {
    render(
      <ConversationRow item={makeConversation()} searchTerm="xyz" onDelete={jest.fn()} />
    );
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("renders plain text when searchTerm is an empty string", () => {
    render(
      <ConversationRow item={makeConversation()} searchTerm="" onDelete={jest.fn()} />
    );
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });
});
