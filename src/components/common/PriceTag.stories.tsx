import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PriceTag } from "./PriceTag";

const meta: Meta<typeof PriceTag> = {
  title: "Components/PriceTag",
  component: PriceTag,
  argTypes: {
    price: { control: "number" },
    currency: { control: "select", options: ["AFN", "USD", "EUR"] },
    size: { control: "select", options: ["lg", "md", "sm"] },
    tone: { control: "select", options: ["default", "warning", "muted"] },
  },
};

export default meta;
type Story = StoryObj<typeof PriceTag>;

export const AFNLarge: Story = {
  args: { price: 25000, currency: "AFN", size: "lg" },
};

export const AFNMedium: Story = {
  args: { price: 25000, currency: "AFN", size: "md" },
};

export const AFNSmall: Story = {
  args: { price: 25000, currency: "AFN", size: "sm" },
};

export const USD: Story = {
  args: { price: 350, currency: "USD", size: "md" },
};

export const EUR: Story = {
  args: { price: 320, currency: "EUR", size: "md" },
};

export const LargeAmount: Story = {
  args: { price: 1_350_000, currency: "AFN", size: "lg" },
};

export const SmallAmount: Story = {
  args: { price: 500, currency: "AFN", size: "sm" },
};

// Null price — renders nothing (empty)
export const NullPrice: Story = {
  args: { price: null as unknown as number, currency: "AFN", size: "md" },
};

// All three sizes stacked
export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <PriceTag price={25000} currency="AFN" size="lg" />
      <PriceTag price={25000} currency="AFN" size="md" />
      <PriceTag price={25000} currency="AFN" size="sm" />
    </View>
  ),
};

// All three currencies
export const AllCurrencies: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <PriceTag price={25000} currency="AFN" size="md" />
      <PriceTag price={350} currency="USD" size="md" />
      <PriceTag price={320} currency="EUR" size="md" />
    </View>
  ),
};

// TASK-C381 (review fix, DR) — the `tone` prop, used by the chat offer/
// counter bubbles: "warning" for a "mine" bubble's amount, "muted" for a
// superseded/no-longer-active offer's amount.
export const ToneDefault: Story = {
  args: { price: 85000, currency: "AFN", size: "lg", tone: "default" },
};

export const ToneWarning: Story = {
  args: { price: 80750, currency: "AFN", size: "lg", tone: "warning" },
};

export const ToneMuted: Story = {
  args: { price: 75000, currency: "AFN", size: "lg", tone: "muted" },
};

export const AllTones: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <PriceTag price={85000} currency="AFN" size="lg" tone="default" />
      <PriceTag price={80750} currency="AFN" size="lg" tone="warning" />
      <PriceTag price={75000} currency="AFN" size="lg" tone="muted" />
    </View>
  ),
};

// ── Multi-quantity (docs/SPIKE_LISTING_QUANTITY.md §12) ──────────────────────
// `perUnit` appends a muted "each" beside the amount. It exists to kill the
// worst ambiguity the quantity feature introduces: on a 15-bag listing a bare
// "AFN 14,000" can be read as the price of one bag or of all fifteen, and buyer
// and seller only discover they disagreed at the meetup — there is no payment
// step or delivery to reverse. The figure itself is unchanged, so the price
// keeps its place in the hierarchy.
export const PerUnit: Story = {
  args: { price: 14000, currency: "AFN", size: "lg", perUnit: true },
};

export const PerUnitVsTotal: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      {/* Single-unit listing — the majority case, visually untouched. */}
      <PriceTag price={14000} currency="AFN" size="lg" />
      {/* 15-unit listing — same figure, now unambiguous. */}
      <PriceTag price={14000} currency="AFN" size="lg" perUnit />
    </View>
  ),
};

export const PerUnitAllSizes: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <PriceTag price={14000} currency="AFN" size="lg" perUnit />
      <PriceTag price={14000} currency="AFN" size="md" perUnit />
      <PriceTag price={14000} currency="AFN" size="sm" perUnit />
    </View>
  ),
};
