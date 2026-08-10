import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingUnavailableNotice } from "./ListingUnavailableNotice";

const meta: Meta<typeof ListingUnavailableNotice> = {
  title: "Chat/ListingUnavailableNotice",
  component: ListingUnavailableNotice,
};

export default meta;
type Story = StoryObj<typeof ListingUnavailableNotice>;

const CATEGORY = {
  id: 3,
  nameEn: "Electronics",
  namePs: "برقی توکي",
  nameFa: "برقیات",
  slug: "electronics",
};

// Reserved — category known, seller known. Both recovery actions render.
export const Reserved: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// Sold — same as Reserved but the terminal, dimmed-tone state.
export const Sold: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// No category on the listing — falls back to the generic "Browse similar
// listings" label/route. "More from seller" still shows. Never an empty
// action row.
export const NoCategoryFallback: Story = {
  args: {
    status: "reserved",
    category: null,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// No seller info on the conversation payload — only "Browse similar" shows;
// at least one recovery action always renders, never a dead end.
export const NoSellerInfo: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
  },
};

// Minimal payload — neither category nor seller. Still shows the generic
// Browse action.
export const MinimalPayload: Story = {
  args: {
    status: "reserved",
  },
};
