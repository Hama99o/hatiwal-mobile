import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingUnavailableActions } from "./ListingUnavailableActions";

const meta: Meta<typeof ListingUnavailableActions> = {
  title: "Common/ListingUnavailableActions",
  component: ListingUnavailableActions,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingUnavailableActions>;

const CATEGORY = {
  id: 3,
  nameEn: "Electronics",
  namePs: "برقی توکي",
  nameFa: "برقیات",
  slug: "electronics",
};

// ── Sold — band hits live stock: primary "See similar in {category}" with a
//    price band + secondary "More from {seller}" ─────────────────────────────
export const Sold: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000, 12000],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── Reserved — same degrade as Sold, plus the extra "may free up" line ───────
export const Reserved: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000, 12000],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── Category-only — similar stock exists but none of it falls inside the
//    ±30% band, so the CTA drops the band and keeps just the category ───────
export const CategoryOnlyBandMisses: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 8000,
    currency: "AFN",
    // Only a 1,200 item in stock — well outside 5,600-10,400.
    similarPrices: [1200],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── Category-only — non-AFN price never gets a dollar-numbered AFN band ─────
export const CategoryOnlyNonAfnPrice: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 900,
    currency: "USD",
    similarPrices: [90000],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── No category CTA at all — the `similar` rail is empty, so the seller CTA
//    is promoted to PRIMARY weight instead of reading like an afterthought ──
export const NoSimilarStockPromotesSeller: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── No category on the listing — category CTA omitted, seller CTA shown
//    (and promoted to primary, since there is no category CTA at all) ───────
export const NoCategory: Story = {
  args: {
    status: "reserved",
    category: null,
    similarPrices: [],
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// ── No seller on the listing — seller CTA omitted, category CTA shown ───────
export const NoSeller: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000],
    sellerId: null,
    sellerName: null,
  },
};

// ── Seller with no display name — falls back to the generic
//    "More from this Seller" rail heading instead of a named CTA ────────────
export const SellerNoName: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000],
    sellerId: 42,
    sellerName: null,
  },
};

// ── Neither category nor seller — never an empty button row: only the
//    status sentence remains ─────────────────────────────────────────────────
export const MinimalPayload: Story = {
  args: {
    status: "sold",
    category: null,
    similarPrices: [],
    sellerId: null,
    sellerName: null,
  },
};

// ── Pashto RTL — labels + layout mirror correctly. isRtl is read from
//    useLocalization() at runtime — switch the device/Storybook locale to
//    'ps' or 'fa' to see the actual mirrored labels and row direction. ───────
export const ReservedPashtoRtl: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000],
    sellerId: 42,
    sellerName: "احمد کریمی",
  },
};

// ── Long seller name — the stacked, full-width buttons must never overflow ──
export const LongSellerName: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    price: 70000,
    currency: "AFN",
    similarPrices: [90000],
    sellerId: 42,
    sellerName: "Mohammad Ismail Ahmadzai Popalzai",
  },
};
