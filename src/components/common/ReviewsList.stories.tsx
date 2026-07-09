import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReviewsList } from "./ReviewsList";
import type { Review } from "@/api/reviews";

const meta: Meta<typeof ReviewsList> = {
  title: "Components/ReviewsList",
  component: ReviewsList,
};

export default meta;
type Story = StoryObj<typeof ReviewsList>;

const reviews: Review[] = [
  {
    id: 1,
    rating: 5,
    comment: "Great buyer, quick and fair.",
    role: "of_buyer",
    visible: true,
    revealedAt: "2026-07-05T00:00:00Z",
    createdAt: "2026-07-04T00:00:00Z",
    transactionId: 10,
    revieweeId: 42,
    reviewer: { id: 1, name: "Jane Doe", avatarUrl: null },
  },
  {
    id: 2,
    rating: 3,
    comment: null,
    role: "of_seller",
    visible: true,
    revealedAt: "2026-06-20T00:00:00Z",
    createdAt: "2026-06-19T00:00:00Z",
    transactionId: 9,
    revieweeId: 42,
    reviewer: { id: 2, name: "Ahmad Karimi", avatarUrl: "https://i.pravatar.cc/100?img=12" },
  },
];

export const Filled: Story = {
  args: { reviews },
};

export const Loading: Story = {
  args: { reviews: [], isLoading: true },
};

export const Empty: Story = {
  args: { reviews: [] },
};

export const SingleReview: Story = {
  args: { reviews: [reviews[0]] },
};
