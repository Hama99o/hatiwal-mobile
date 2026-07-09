import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { RatingDisplay } from "./RatingDisplay";

const meta: Meta<typeof RatingDisplay> = {
  title: "Components/RatingDisplay",
  component: RatingDisplay,
  argTypes: {
    size: { control: "select", options: ["sm", "lg"] },
  },
};

export default meta;
type Story = StoryObj<typeof RatingDisplay>;

export const SmallInline: Story = {
  args: { avgRating: 4.8, reviewCount: 45, size: "sm" },
};

export const LargeProfileStat: Story = {
  args: { avgRating: 4.8, reviewCount: 45, size: "lg" },
};

export const PerfectScore: Story = {
  args: { avgRating: 5, reviewCount: 1, size: "sm" },
};

export const LowScore: Story = {
  args: { avgRating: 2.1, reviewCount: 12, size: "sm" },
};

export const EmptySmall: Story = {
  args: { avgRating: null, reviewCount: 0, size: "sm" },
};

export const EmptyLarge: Story = {
  args: { avgRating: null, reviewCount: 0, size: "lg" },
};

export const Tappable: Story = {
  args: { avgRating: 4.8, reviewCount: 45, size: "lg", onPress: () => {} },
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <RatingDisplay avgRating={4.8} reviewCount={45} size="lg" />
      <RatingDisplay avgRating={4.8} reviewCount={45} size="sm" />
      <RatingDisplay avgRating={null} reviewCount={0} size="sm" />
    </View>
  ),
};
