import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { ConversationRow } from "./ConversationRow";
import type { Conversation } from "@/api/conversations";
import { action } from "@storybook/addon-actions";

const now = "2024-06-15T09:00:00Z";

const makeConversation = (
  overrides: Partial<Conversation> = {}
): Conversation => ({
  id: 1,
  status: "open",
  createdAt: now,
  lastMessageAt: now,
  lastMessageBody: "Is this still available?",
  lastMessageKind: "text",
  unreadCount: 0,
  listing: {
    id: 1,
    title: "Lenovo ThinkPad X1 Carbon",
    thumbnailUrl: "https://picsum.photos/seed/laptop/200/200",
    status: "active",
    price: 85000,
    currency: "AFN",
    location: "Kabul",
  },
  otherParticipant: {
    id: 2,
    name: "Ahmad Karimi",
    city: "Kabul",
    verified: true,
    avatarUrl: null,
  },
  ...overrides,
});

const meta: Meta<typeof ConversationRow> = {
  title: "Chat/ConversationRow",
  component: ConversationRow,
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#fff" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConversationRow>;

export const Default: Story = {
  args: {
    item: makeConversation(),
    onDelete: action("delete"),
  },
};

export const Unread: Story = {
  args: {
    item: makeConversation({ unreadCount: 3 }),
    onDelete: action("delete"),
  },
};

export const UnreadHighCount: Story = {
  args: {
    item: makeConversation({ unreadCount: 12 }),
    onDelete: action("delete"),
  },
};

export const MeetupPreview: Story = {
  args: {
    item: makeConversation({
      lastMessageKind: "meetup_proposal",
      lastMessageBody: "Share Naw Park | Tomorrow 4pm",
    }),
    onDelete: action("delete"),
  },
};

export const OfferPreview: Story = {
  args: {
    item: makeConversation({
      lastMessageKind: "offer",
      lastMessageBody: "75000|AFN",
    }),
    onDelete: action("delete"),
  },
};

export const SoldListing: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Lenovo ThinkPad X1 Carbon",
        thumbnailUrl: "https://picsum.photos/seed/laptop/200/200",
        status: "sold",
        price: 85000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
};

export const ReservedListing: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Lenovo ThinkPad X1 Carbon",
        thumbnailUrl: "https://picsum.photos/seed/laptop/200/200",
        status: "reserved",
        price: 85000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
};

export const NoThumbnail: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Hand-woven rug",
        thumbnailUrl: null,
        status: "active",
      },
    }),
    onDelete: action("delete"),
  },
};

export const NoMessages: Story = {
  args: {
    item: makeConversation({
      lastMessageBody: null,
      lastMessageKind: null,
      lastMessageAt: null,
    }),
    onDelete: action("delete"),
  },
};

// ── Role pill (TASK-R517) ─────────────────────────────────────────────────

export const SellingRole: Story = {
  args: {
    item: makeConversation({ viewerRole: "seller" }),
    onDelete: action("delete"),
  },
};

export const BuyingRole: Story = {
  args: {
    item: makeConversation({ viewerRole: "buyer" }),
    onDelete: action("delete"),
  },
};

export const UnverifiedParticipant: Story = {
  args: {
    item: makeConversation({
      otherParticipant: { id: 3, name: "New Seller", city: null, verified: false, avatarUrl: null },
    }),
    onDelete: action("delete"),
  },
};

// ── Price on the row (TASK-J471, design north star: price-prominence) ───────

export const NoPrice: Story = {
  args: {
    // Listing has no price at all — PriceTag must render nothing and leave
    // no empty gap next to the title/time.
    item: makeConversation({
      listing: {
        id: 1,
        title: "Hand-woven rug (price on request)",
        thumbnailUrl: "https://picsum.photos/seed/rug/200/200",
        status: "active",
      },
    }),
    onDelete: action("delete"),
  },
};

// Sold/reserved rows already show the price (see SoldListing/ReservedListing
// above) — muted tone via `isInactive`, matching the dimmed title/thumbnail.

// ── List-level search highlight (TASK-J471) — the identical treatment used
//    for in-thread message search (MessageBubble's HighlightedText) ─────────

export const MatchedSearch: Story = {
  args: {
    item: makeConversation({
      lastMessageBody: "Is this still available? Can we meet tomorrow?",
      lastMessageKind: "text",
    }),
    searchTerm: "available",
    onDelete: action("delete"),
  },
};

export const MatchedSearchInTitle: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Lenovo ThinkPad X1 Carbon",
        thumbnailUrl: "https://picsum.photos/seed/laptop/200/200",
        status: "active",
        price: 85000,
        currency: "AFN",
      },
    }),
    searchTerm: "carbon",
    onDelete: action("delete"),
  },
};

export const NoSearchMatchInPreview: Story = {
  args: {
    item: makeConversation(),
    // Term doesn't appear in the preview text — renders exactly like the
    // no-search-term state (no highlight, no crash).
    searchTerm: "xyz",
    onDelete: action("delete"),
  },
};

// ── Long title — title must shrink (flex: 1) so the price + timestamp never
//    truncate or get pushed off-screen ────────────────────────────────────

export const LongTitle: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Genuine leather sofa set, 3+2+1, imported from Turkey, barely used, excellent condition",
        thumbnailUrl: "https://picsum.photos/seed/sofa/200/200",
        status: "active",
        price: 125000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
};

export const LongTitleUnread: Story = {
  args: {
    item: makeConversation({
      unreadCount: 2,
      listing: {
        id: 1,
        title: "Genuine leather sofa set, 3+2+1, imported from Turkey, barely used, excellent condition",
        thumbnailUrl: "https://picsum.photos/seed/sofa/200/200",
        status: "active",
        price: 125000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
};

// ── Row1 crowding regression guard (TASK-J471 review fix) — a vehicles-scale
//    price ("AFN 1,250,000") + a >7-day-old timestamp (which includes the
//    year, e.g. "Jun 1, 2024") used to sit in the same row as the role pill
//    and could overflow/clip at 360pt width. The pill now lives in row2
//    (beside the participant name), so row1 only ever fits title + price +
//    time — this story is the layout's regression guard at that width. ──────

export const LongPriceOldTimestampWithRolePill: Story = {
  args: {
    item: makeConversation({
      viewerRole: "buyer",
      lastMessageAt: "2024-01-15T09:00:00Z", // > 7 days before `now` (2024-06-15)
      listing: {
        id: 1,
        title: "Toyota Corolla 2018",
        thumbnailUrl: "https://picsum.photos/seed/corolla/200/200",
        status: "active",
        price: 1_250_000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
  decorators: [(Story: React.ComponentType) => <View style={{ width: 360, backgroundColor: "#fff" }}><Story /></View>],
};

// ── RTL (Pashto / Dari) ───────────────────────────────────────────────────────

export const RTLPashto: Story = {
  args: {
    item: makeConversation(),
    onDelete: action("delete"),
  },
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return (
        <View style={{ backgroundColor: "#fff" }}>
          <Story />
        </View>
      );
    },
  ],
};

export const RTLDariWithSearch: Story = {
  args: {
    item: makeConversation({
      lastMessageBody: "Is this still available? Can we meet tomorrow?",
      lastMessageKind: "text",
    }),
    searchTerm: "available",
    onDelete: action("delete"),
  },
  decorators: [
    (Story) => {
      i18n.changeLanguage("fa");
      return (
        <View style={{ backgroundColor: "#fff" }}>
          <Story />
        </View>
      );
    },
  ],
};

export const RTLLongTitle: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Genuine leather sofa set, 3+2+1, imported from Turkey, barely used, excellent condition",
        thumbnailUrl: "https://picsum.photos/seed/sofa/200/200",
        status: "active",
        price: 125000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return (
        <View style={{ backgroundColor: "#fff" }}>
          <Story />
        </View>
      );
    },
  ],
};

// ── Dark surface — verifies useColors() tokens (no hardcoded colors). Resets
//    the language to "en" (LTR stories above this point may have left it as
//    ps/fa) so the dark-mode check isn't also, incidentally, an RTL story. ──

export const DarkSurface: Story = {
  args: {
    item: makeConversation(),
    onDelete: action("delete"),
  },
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return (
        <View style={{ backgroundColor: "#0f172a" }}>
          <Story />
        </View>
      );
    },
  ],
};

export const DarkSurfaceSold: Story = {
  args: {
    item: makeConversation({
      listing: {
        id: 1,
        title: "Lenovo ThinkPad X1 Carbon",
        thumbnailUrl: "https://picsum.photos/seed/laptop/200/200",
        status: "sold",
        price: 85000,
        currency: "AFN",
      },
    }),
    onDelete: action("delete"),
  },
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return (
        <View style={{ backgroundColor: "#0f172a" }}>
          <Story />
        </View>
      );
    },
  ],
};

// Full list of rows stacked
export const ConversationList: Story = {
  render: () => (
    <View style={{ backgroundColor: "#fff" }}>
      {[
        makeConversation({ id: 1, unreadCount: 2 }),
        makeConversation({ id: 2, lastMessageKind: "meetup_proposal", lastMessageBody: "Share Naw | 5pm", unreadCount: 0 }),
        makeConversation({ id: 3, listing: { id: 2, title: "Samsung TV", thumbnailUrl: null, status: "sold" }, unreadCount: 0 }),
        makeConversation({ id: 4, lastMessageKind: "offer", lastMessageBody: "40000|AFN", unreadCount: 1 }),
      ].map((item) => (
        <ConversationRow key={item.id} item={item} onDelete={action("delete")} />
      ))}
    </View>
  ),
};
