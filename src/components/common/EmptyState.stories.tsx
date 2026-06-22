import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { EmptyState } from "./EmptyState";
import { action } from "@storybook/addon-actions";
import { ShoppingBag, Heart, MessageCircle, Search, Package, Star } from "lucide-react-native";
import {
  NoResultsIllustration,
  SavedIllustration,
  ChatIllustration,
  ListingsIllustration,
} from "./empty-illustrations";

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

// ── Icon fallback stories (existing behaviour, unchanged) ────────────────────

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

// ── Illustration stories (new — one per high-frequency surface) ──────────────

export const IllustrationNoResults: Story = {
  name: "Illustration / Browse no-results",
  args: {
    illustration: <NoResultsIllustration size={96} />,
    title: "Nothing matches your search",
    description: "Try different keywords or reset your filters.",
    action: { label: "Reset filters", onPress: action("reset-pressed") },
  },
};

export const IllustrationSaved: Story = {
  name: "Illustration / Saved (empty)",
  args: {
    illustration: <SavedIllustration size={96} />,
    title: "No saved listings yet",
    description: "Tap the heart on any listing to save it here.",
    action: { label: "Browse listings", onPress: action("browse-pressed") },
  },
};

export const IllustrationChat: Story = {
  name: "Illustration / Chat (no conversations)",
  args: {
    illustration: <ChatIllustration size={96} />,
    title: "No conversations yet",
    description: "Start a chat by tapping 'Chat with seller' on any listing.",
    action: { label: "Browse listings", onPress: action("browse-pressed") },
  },
};

export const IllustrationMyListings: Story = {
  name: "Illustration / My Listings (empty shop)",
  args: {
    illustration: <ListingsIllustration size={96} />,
    title: "You haven't posted anything yet",
    description: "Create your first listing to start selling.",
    action: { label: "Post a listing", onPress: action("post-pressed") },
  },
};

// ── Edge cases ───────────────────────────────────────────────────────────────

export const IllustrationNoAction: Story = {
  name: "Illustration / No action (description only)",
  args: {
    illustration: <SavedIllustration size={96} />,
    title: "Nothing saved",
    description: "Items you save will appear here.",
  },
};

export const IllustrationTitleOnly: Story = {
  name: "Illustration / Title only",
  args: {
    illustration: <ChatIllustration size={96} />,
    title: "No conversations",
  },
};
