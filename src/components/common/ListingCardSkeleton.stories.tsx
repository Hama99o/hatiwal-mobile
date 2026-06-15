import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingCardSkeleton, ListingCardSkeletonGrid, ConversationRowSkeleton } from "./ListingCardSkeleton";

const meta: Meta<typeof ListingCardSkeleton> = {
  title: "Components/ListingCardSkeleton",
  component: ListingCardSkeleton,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, maxWidth: 320 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingCardSkeleton>;

export const Default: Story = {};

// Two skeletons stacked — mimics a loading column
export const Multiple: Story = {
  render: () => (
    <View style={{ gap: 10, padding: 16 }}>
      <ListingCardSkeleton />
      <ListingCardSkeleton />
      <ListingCardSkeleton />
    </View>
  ),
};

// Full 2-column grid (6 cards) as it loads in Browse
export const TwoColumnGrid: Story = {
  decorators: [
    () => (
      <View style={{ flex: 1 }}>
        <ListingCardSkeletonGrid count={6} />
      </View>
    ),
  ],
  render: () => <></>,
};

// Odd count — last row has a single card on the left
export const OddCount: Story = {
  decorators: [
    () => (
      <View style={{ flex: 1 }}>
        <ListingCardSkeletonGrid count={5} />
      </View>
    ),
  ],
  render: () => <></>,
};

// Conversation list loading state
export const ConversationRow: Story = {
  render: () => (
    <View style={{ backgroundColor: "#fff" }}>
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
    </View>
  ),
};
