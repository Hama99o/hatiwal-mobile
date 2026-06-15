import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SellerListingCard } from "./SellerListingCard";
import type { Listing } from "@/api/listings";

const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  title: "Lenovo ThinkPad X1 Carbon",
  description: "Used 6 months. No scratches. Comes with charger.",
  price: 85000,
  currency: "AFN",
  status: "active",
  categoryId: 1,
  location: "Kabul, Share Naw",
  address: null,
  latitude: null,
  longitude: null,
  thumbnailUrl: "https://picsum.photos/seed/laptop/600/450",
  imageUrls: [
    "https://picsum.photos/seed/laptop/600/450",
    "https://picsum.photos/seed/laptop2/600/450",
    "https://picsum.photos/seed/laptop3/600/450",
  ],
  viewsCount: 42,
  conversationsCount: 5,
  isViewed: false,
  expiresAt: daysFromNow(25),
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

const meta: Meta<typeof SellerListingCard> = {
  title: "Seller/SellerListingCard",
  component: SellerListingCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SellerListingCard>;

// Active with multiple photos — primary action: Mark Sold
export const Active: Story = {
  args: { listing: makeListing({ status: "active" }) },
};

// Draft — primary action: Publish
export const Draft: Story = {
  args: { listing: makeListing({ status: "draft" }) },
};

// Reserved — primary action: Mark Sold; secondary: Activate
export const Reserved: Story = {
  args: { listing: makeListing({ status: "reserved" }) },
};

// Sold — no primary action (terminal state)
export const Sold: Story = {
  args: { listing: makeListing({ status: "sold" }) },
};

// Active, expiring soon (3 days) — warning ExpiryBadge
export const ExpiringSoon: Story = {
  args: {
    listing: makeListing({
      status: "active",
      expiresAt: daysFromNow(3),
    }),
  },
};

// Expired — amber badge, primary action is Renew
export const Expired: Story = {
  args: {
    listing: makeListing({
      status: "active",
      expired: true,
      expiresAt: daysFromNow(-5),
    }),
  },
};

// No photos — shows camera placeholder
export const NoPhoto: Story = {
  args: {
    listing: makeListing({
      thumbnailUrl: null,
      imageUrls: [],
    }),
  },
};

// Single photo — no dot indicators
export const SinglePhoto: Story = {
  args: {
    listing: makeListing({ imageUrls: ["https://picsum.photos/seed/rug/600/450"] }),
  },
};

// Long title — clamps to 2 lines
export const LongTitle: Story = {
  args: {
    listing: makeListing({
      title: "Samsung Galaxy S24 Ultra 512GB Phantom Black — mint condition, never dropped, original box and all accessories included",
    }),
  },
};

// Zero views, no conversations
export const NewListing: Story = {
  args: {
    listing: makeListing({ viewsCount: 0, conversationsCount: 0 }),
  },
};
