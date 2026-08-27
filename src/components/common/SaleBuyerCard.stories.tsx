import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SaleBuyerCard } from "./SaleBuyerCard";
import type { Listing, ListingSale } from "@/api/listings";

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 501,
    title: "Lenovo ThinkPad Laptop Core i5 8GB",
    description: "11th Gen Core i5, 8GB RAM, 256GB SSD.",
    price: 38000,
    currency: "AFN",
    status: "reserved",
    categoryId: 1,
    location: "Kandahar",
    address: null,
    latitude: null,
    longitude: null,
    thumbnailUrl: null,
    viewsCount: 42,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-01T10:00:00Z",
    seller: { id: 1, name: "Seller One", city: "Kandahar" },
    category: { id: 1, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "برقیات", slug: "electronics" },
    ...overrides,
  };
}

function buildSale(overrides: Partial<ListingSale> = {}): ListingSale {
  return {
    id: 9,
    status: "reserved",
    finalPrice: 38000,
    currency: "AFN",
    completedAt: null,
    buyer: { id: 42, name: "Ahmad Karimi", avatarUrl: "https://picsum.photos/seed/ahmad/100/100", verified: true },
    conversationId: 77,
    ...overrides,
  };
}

const meta: Meta<typeof SaleBuyerCard> = {
  title: "Components/SaleBuyerCard",
  component: SaleBuyerCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SaleBuyerCard>;

// Reserved, same final price as asking price — no price line shown.
export const Reserved: Story = {
  args: {
    listing: buildListing({ status: "reserved", price: 38000, sale: buildSale({ status: "reserved", finalPrice: 38000 }) }),
  },
};

// Reserved with a negotiated final price lower than the asking price.
export const ReservedWithNegotiatedPrice: Story = {
  args: {
    listing: buildListing({ status: "reserved", price: 38000, sale: buildSale({ status: "reserved", finalPrice: 32000 }) }),
  },
};

// Sold — terminal state, "Sold to {name}".
export const Sold: Story = {
  args: {
    listing: buildListing({
      status: "sold",
      price: 38000,
      sale: buildSale({ status: "sold", finalPrice: 35000, completedAt: "2026-07-10T12:00:00Z" }),
    }),
  },
};

// Buyer with no avatar photo — falls back to the initial-letter avatar via UserAvatar.
export const NoAvatarPhoto: Story = {
  args: {
    listing: buildListing({
      status: "reserved",
      sale: buildSale({ buyer: { id: 43, name: "Fatima Rahimi", avatarUrl: null, verified: false } }),
    }),
  },
};

// Legacy reserve/sold with a buyer but no matching conversation — CYCLE-4:
// the compact action relabels to "View Conversations" (instead of implying a
// one-tap DM into a thread that doesn't exist) and falls back to the
// listing-conversations list; see Jest tests for the routing assertion.
export const NoConversationRecorded: Story = {
  args: {
    listing: buildListing({
      status: "reserved",
      sale: buildSale({ conversationId: null }),
    }),
  },
};

// No sale on the listing at all (draft/active, or legacy buyer-less reserve) —
// renders nothing. Storybook shows an empty canvas for this state on purpose.
export const NoSaleRendersNothing: Story = {
  args: {
    listing: buildListing({ status: "active", sale: null }),
  },
};

// SF-M5 (docs/SELL_FLOW_REDESIGN.md §9) — a multi-unit batch sold to more
// than one buyer. This card still shows only the LATEST sale; the
// "+2 more · View all sales" link is the seller's way to the full ledger.
export const SoldWithMoreSales: Story = {
  args: {
    listing: buildListing({
      status: "sold",
      price: 14000,
      multiUnit: true,
      quantity: 15,
      availableUnits: 0,
      salesCount: 3,
      sale: buildSale({
        status: "sold",
        finalPrice: 14000,
        quantity: 5,
        completedAt: "2026-07-10T12:00:00Z",
      }),
    }),
  },
};
