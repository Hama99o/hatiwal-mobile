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

// Reserved — generic recovery copy, category known, seller known. Both
// recovery actions render.
export const Reserved: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
    sellerVerified: true,
  },
};

// Sold — same as Reserved but the terminal, dimmed-tone state.
export const Sold: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
    sellerVerified: true,
  },
};

// No category on the listing — falls back to the generic "Browse similar
// listings" label/route. "View their listings" still shows. Never an empty
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

// TASK-K729 (HIGH review fix) — the viewer IS the buyer the seller committed
// to: a positive headline, no recovery CTAs (nothing to recover from).
export const ReservedForYou: Story = {
  args: {
    status: "reserved",
    viewerIsSaleBuyer: true,
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

export const SoldToYou: Story = {
  args: {
    status: "sold",
    viewerIsSaleBuyer: true,
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// A long seller name (with the longer ps/fa button labels in mind) — the
// action row must never overflow. Buttons are `flex: 1` with
// `numberOfLines={1}` labels.
export const LongSellerName: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Mohammad Ismail Ahmadzai Popalzai",
  },
};

// Pashto RTL — long ps/fa CTA labels ("مشاهده موارد مشابه در {{category}}",
// "سایر آگهی‌های {{name}}") mirrored correctly, action row splits evenly.
export const ReservedPashtoRtl: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "احمد کریمی",
  },
};
