import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ConditionBadge } from "./ConditionBadge";

const meta: Meta<typeof ConditionBadge> = {
  title: "Components/ConditionBadge",
  component: ConditionBadge,
  argTypes: {
    condition: {
      control: "select",
      options: ["brand_new", "like_new", "good", "fair"],
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConditionBadge>;

export const BrandNew: Story = {
  args: { condition: "brand_new" },
};

export const LikeNew: Story = {
  args: { condition: "like_new" },
};

export const Good: Story = {
  args: { condition: "good" },
};

export const Fair: Story = {
  args: { condition: "fair" },
};

export const AllConditions: Story = {
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <ConditionBadge condition="brand_new" />
      <ConditionBadge condition="like_new" />
      <ConditionBadge condition="good" />
      <ConditionBadge condition="fair" />
    </View>
  ),
};
