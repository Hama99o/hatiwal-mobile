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

jest.mock("@/stores/chat.store", () => ({
  useChatStore: jest.fn(() => ({ unreadMessageTotal: 0, setUnreadMessageTotal: jest.fn() })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

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
        item={makeConversation({ unreadCount: 3 })}
        onDelete={jest.fn()}
        index={0}
      />
    );
    // Badge is rendered inside <PulsingBadge> with testID "unread-badge-0"
    expect(screen.getByTestId("unread-badge-0")).toBeTruthy();
  });

  it("does NOT render unread badge when unreadCount is 0", () => {
    render(
      <ConversationRow
        item={makeConversation({ unreadCount: 0 })}
        onDelete={jest.fn()}
        index={1}
      />
    );
    expect(screen.queryByTestId("unread-badge-1")).toBeNull();
  });

  it("does NOT render unread badge when unreadCount is undefined", () => {
    const item = makeConversation();
    delete (item as Partial<Conversation>).unreadCount;
    render(<ConversationRow item={item} onDelete={jest.fn()} index={2} />);
    expect(screen.queryByTestId("unread-badge-2")).toBeNull();
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
  it("exposes testID conversation-row-{index} on the row Pressable", () => {
    render(<ConversationRow item={makeConversation({ id: 10 })} onDelete={jest.fn()} index={0} />);
    expect(screen.getByTestId("conversation-row-0")).toBeTruthy();
  });

  it("uses the provided index in the testID", () => {
    render(<ConversationRow item={makeConversation({ id: 20 })} onDelete={jest.fn()} index={3} />);
    expect(screen.getByTestId("conversation-row-3")).toBeTruthy();
  });

  it("defaults to index 0 when index prop is omitted", () => {
    render(<ConversationRow item={makeConversation({ id: 30 })} onDelete={jest.fn()} />);
    expect(screen.getByTestId("conversation-row-0")).toBeTruthy();
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
