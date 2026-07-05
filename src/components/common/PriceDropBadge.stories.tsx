import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { PriceDropBadge } from "./PriceDropBadge";

const meta: Meta<typeof PriceDropBadge> = {
  title: "Components/PriceDropBadge",
  component: PriceDropBadge,
  argTypes: {
    percent: { control: { type: "number", min: 0, max: 100 } },
    variant: {
      control: "select",
      options: ["detail", "card", "saved"],
    },
    oldPrice: { control: { type: "number" } },
    newPrice: { control: { type: "number" } },
    currency: { control: "text" },
    compact: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof PriceDropBadge>;

// Detail variant — used beside PriceTag on the listing detail screen
export const Detail15Percent: Story = {
  args: { percent: 15, variant: "detail" },
};

export const Detail30Percent: Story = {
  args: { percent: 30, variant: "detail" },
};

// Card variant — tiny overlay on a listing card thumbnail
export const Card15Percent: Story = {
  args: { percent: 15, variant: "card" },
  decorators: [
    (Story) => (
      <View style={{ width: 120, height: 80, backgroundColor: "#ccc", padding: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export const Card5Percent: Story = {
  args: { percent: 5, variant: "card" },
};

// Zero percent — should render nothing
export const ZeroPercent: Story = {
  args: { percent: 0, variant: "detail" },
};

// ── 'saved' variant — Saved screen per-buyer price-drop badge (TASK-Y316) ────

// Price dropped since the buyer saved it — old price struck through, new emphasized
export const SavedPriceDropped: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 4000, currency: "AFN" },
};

// Large drop
export const SavedLargePriceDropped: Story = {
  args: { variant: "saved", oldPrice: 100000, newPrice: 60000, currency: "AFN" },
};

// No drop — price unchanged since save — must render nothing
export const SavedNoDropUnchanged: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 5000, currency: "AFN" },
};

// No drop — price increased since save — must render nothing
export const SavedNoDropIncreased: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 6000, currency: "AFN" },
};

// Missing prices — must render nothing
export const SavedMissingPrices: Story = {
  args: { variant: "saved" },
};

// RTL (Pashto) — strikethrough price + mirrored arrow, right-aligned pill
export const SavedPriceDroppedRTL: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return (
        <View style={{ padding: 16, alignItems: "flex-end" }}>
          <Story />
        </View>
      );
    },
  ],
};

// RTL (Dari) — same as above, different locale
export const SavedPriceDroppedRTLDari: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => {
      i18n.changeLanguage("fa");
      return (
        <View style={{ padding: 16, alignItems: "flex-end" }}>
          <Story />
        </View>
      );
    },
  ],
};

// ── Compact form — used on the narrow 2-column Saved grid card ───────────────
// Drops the "Price dropped" label and the duplicated current price (the card's
// PriceTag hero already shows it) to stay on one line on a narrow card.

export const SavedCompactPriceDropped: Story = {
  args: { variant: "saved", compact: true, oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => (
      <View style={{ width: 160, padding: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export const SavedCompactLargePriceDropped: Story = {
  args: { variant: "saved", compact: true, oldPrice: 100000, newPrice: 60000, currency: "AFN" },
};

export const SavedCompactNoDropUnchanged: Story = {
  args: { variant: "saved", compact: true, oldPrice: 5000, newPrice: 5000, currency: "AFN" },
};

export const SavedCompactPriceDroppedRTL: Story = {
  args: { variant: "saved", compact: true, oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return (
        <View style={{ width: 160, padding: 16, alignItems: "flex-end" }}>
          <Story />
        </View>
      );
    },
  ],
};

export const SavedCompactPriceDroppedDark: Story = {
  args: { variant: "saved", compact: true, oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return (
        <View style={{ width: 160, padding: 16, backgroundColor: "#0f172a" }}>
          <Story />
        </View>
      );
    },
  ],
};

// Dark surface — verifies useColors() tokens (no hardcoded colors)
export const SavedPriceDroppedDark: Story = {
  args: { variant: "saved", oldPrice: 5000, newPrice: 4000, currency: "AFN" },
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return (
        <View style={{ padding: 16, backgroundColor: "#0f172a" }}>
          <Story />
        </View>
      );
    },
  ],
};

// All variants side by side
export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <PriceDropBadge percent={20} variant="detail" />
      <PriceDropBadge percent={20} variant="card" />
      <PriceDropBadge percent={5} variant="detail" />
      <PriceDropBadge percent={50} variant="card" />
      <PriceDropBadge variant="saved" oldPrice={5000} newPrice={4000} currency="AFN" />
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={4000} currency="AFN" />
    </View>
  ),
};
