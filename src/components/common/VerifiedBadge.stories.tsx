import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { VerifiedBadge } from "./VerifiedBadge";

const meta: Meta<typeof VerifiedBadge> = {
  title: "Components/VerifiedBadge",
  component: VerifiedBadge,
  argTypes: {
    size: { control: "number" },
    withLabel: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof VerifiedBadge>;

export const Default: Story = {
  args: { size: 16, withLabel: false },
};

export const WithLabel: Story = {
  args: { size: 16, withLabel: true },
};

export const Large: Story = {
  args: { size: 24, withLabel: false },
};

export const LargeWithLabel: Story = {
  args: { size: 20, withLabel: true },
};

export const Small: Story = {
  args: { size: 12, withLabel: false },
};

// All variants together
export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <VerifiedBadge size={12} withLabel={false} />
      <VerifiedBadge size={16} withLabel={false} />
      <VerifiedBadge size={24} withLabel={false} />
      <VerifiedBadge size={16} withLabel={true} />
      <VerifiedBadge size={20} withLabel={true} />
    </View>
  ),
};
