import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReviewCard } from "./ReviewCard";
import type { Review } from "@/api/reviews";

const meta: Meta<typeof ReviewCard> = {
  title: "Components/ReviewCard",
  component: ReviewCard,
};

export default meta;
type Story = StoryObj<typeof ReviewCard>;

const baseReview: Review = {
  id: 1,
  rating: 5,
  comment: "Great buyer, quick and fair. Met on time and paid in cash.",
  role: "of_buyer",
  visible: true,
  revealedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
  transactionId: 10,
  revieweeId: 42,
  reviewer: { id: 1, name: "Jane Doe", avatarUrl: null },
};

export const FiveStarsWithComment: Story = {
  args: { review: baseReview },
};

export const LowRating: Story = {
  args: { review: { ...baseReview, id: 2, rating: 2, comment: "Was late and item condition was worse than described." } },
};

export const NoComment: Story = {
  args: { review: { ...baseReview, id: 3, comment: null } },
};

export const LongComment: Story = {
  args: {
    review: {
      ...baseReview,
      id: 4,
      comment:
        "Really smooth transaction from start to finish. Communicated clearly about the meetup time and location, the item matched the listing photos exactly, and the price was fair. Would definitely deal with again.",
    },
  },
};

export const WithAvatar: Story = {
  args: {
    review: {
      ...baseReview,
      id: 5,
      reviewer: { id: 1, name: "Ahmad Karimi", avatarUrl: "https://i.pravatar.cc/100?img=12" },
    },
  },
};

export const List: Story = {
  render: () => (
    <View style={{ padding: 16 }}>
      <ReviewCard review={baseReview} />
      <ReviewCard review={{ ...baseReview, id: 2, rating: 2, comment: "Was late." }} />
      <ReviewCard review={{ ...baseReview, id: 3, comment: null }} />
    </View>
  ),
};
