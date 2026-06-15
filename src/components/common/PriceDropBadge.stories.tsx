import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PriceDropBadge } from "./PriceDropBadge";

const meta: Meta<typeof PriceDropBadge> = {
  title: "Components/PriceDropBadge",
  component: PriceDropBadge,
  argTypes: {
    percent: { control: { type: "number", min: 0, max: 100 } },
    variant: {
      control: "select",
      options: ["detail", "card"],
    },
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

// All variants side by side
export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <PriceDropBadge percent={20} variant="detail" />
      <PriceDropBadge percent={20} variant="card" />
      <PriceDropBadge percent={5} variant="detail" />
      <PriceDropBadge percent={50} variant="card" />
    </View>
  ),
};
