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
