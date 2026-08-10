import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { TransactionStatsBadge } from "./TransactionStatsBadge";

const meta: Meta<typeof TransactionStatsBadge> = {
  title: "Components/TransactionStatsBadge",
  component: TransactionStatsBadge,
  argTypes: {
    soldCount: { control: { type: "number", min: 0 } },
    boughtCount: { control: { type: "number", min: 0 } },
    variant: { control: { type: "radio" }, options: ["meta", "pill"] },
  },
};

export default meta;
type Story = StoryObj<typeof TransactionStatsBadge>;

// Combined — both roles have history
export const SoldAndBought: Story = {
  args: { soldCount: 12, boughtCount: 3 },
};

// Seller-only history
export const SoldOnly: Story = {
  args: { soldCount: 5, boughtCount: 0 },
};

// Buyer-only history
export const BoughtOnly: Story = {
  args: { soldCount: 0, boughtCount: 4 },
};

// Suppressed — brand-new account, no history at all
export const NoHistory: Story = {
  args: { soldCount: 0, boughtCount: 0 },
};

// Suppressed — null/undefined fields (fields absent from an older API response)
export const NullFields: Story = {
  args: { soldCount: null, boughtCount: undefined },
};

// Large numbers — confirms locale-aware number formatting
export const LargeNumbers: Story = {
  args: { soldCount: 1240, boughtCount: 87 },
};

// All visible variants side by side
export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <TransactionStatsBadge soldCount={12} boughtCount={3} />
      <TransactionStatsBadge soldCount={5} boughtCount={0} />
      <TransactionStatsBadge soldCount={0} boughtCount={4} />
    </View>
  ),
};

// "pill" variant — elevated rounded chip used in the centered identity
// cluster on the public profile (TASK-TX02 review fix, MED — visual hierarchy)
export const Pill: Story = {
  args: { soldCount: 12, boughtCount: 3, variant: "pill" },
};

export const PillSoldOnly: Story = {
  args: { soldCount: 5, boughtCount: 0, variant: "pill" },
};

// Long RTL labels — confirms the text shrinks instead of overflowing/clipping
export const PillLongRtlLabel: Story = {
  args: { soldCount: 123, boughtCount: 45, variant: "pill" },
};
