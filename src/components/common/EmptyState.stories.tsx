import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { EmptyState } from "./EmptyState";
import { action } from "@storybook/addon-actions";
import { ShoppingBag, Heart, MessageCircle, Search, Package, Star } from "lucide-react-native";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const WithAction: Story = {
  args: {
    icon: ShoppingBag,
    title: "No listings yet",
    description: "Start selling by creating your first listing.",
    action: { label: "Create listing", onPress: action("create-pressed") },
  },
};

export const WithoutAction: Story = {
  args: {
    icon: Heart,
    title: "No saved listings",
    description: "Tap the heart on any listing to save it here.",
  },
};

export const WithDescription: Story = {
  args: {
    icon: Search,
    title: "No results found",
    description: "Try different keywords or remove some filters to see more listings.",
  },
};

export const MinimalTitleOnly: Story = {
  args: {
    icon: Package,
    title: "Nothing here yet",
  },
};

export const EmptyChat: Story = {
  args: {
    icon: MessageCircle,
    title: "No conversations",
    description: "Start a chat by tapping 'Chat with seller' on any listing.",
  },
};

export const EmptyReviews: Story = {
  args: {
    icon: Star,
    title: "No reviews yet",
    description: "Reviews appear after a successful transaction.",
  },
};
