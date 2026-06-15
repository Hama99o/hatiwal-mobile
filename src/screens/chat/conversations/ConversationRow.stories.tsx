import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
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
    index: 0,
  },
};

export const Unread: Story = {
  args: {
    item: makeConversation({ unreadCount: 3 }),
    onDelete: action("delete"),
    index: 0,
  },
};

export const UnreadHighCount: Story = {
  args: {
    item: makeConversation({ unreadCount: 12 }),
    onDelete: action("delete"),
    index: 0,
  },
};

export const MeetupPreview: Story = {
  args: {
    item: makeConversation({
      lastMessageKind: "meetup_proposal",
      lastMessageBody: "Share Naw Park | Tomorrow 4pm",
    }),
    onDelete: action("delete"),
    index: 0,
  },
};

export const OfferPreview: Story = {
  args: {
    item: makeConversation({
      lastMessageKind: "offer",
      lastMessageBody: "75000|AFN",
    }),
    onDelete: action("delete"),
    index: 0,
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
    index: 0,
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
    index: 0,
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
    index: 0,
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
    index: 0,
  },
};

export const UnverifiedParticipant: Story = {
  args: {
    item: makeConversation({
      otherParticipant: { id: 3, name: "New Seller", city: null, verified: false, avatarUrl: null },
    }),
    onDelete: action("delete"),
    index: 0,
  },
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
      ].map((item, i) => (
        <ConversationRow key={item.id} item={item} onDelete={action("delete")} index={i} />
      ))}
    </View>
  ),
};
