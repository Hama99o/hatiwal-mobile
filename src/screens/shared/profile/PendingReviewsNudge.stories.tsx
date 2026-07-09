import React from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PendingReviewsNudge } from "./PendingReviewsNudge";

const meta: Meta<typeof PendingReviewsNudge> = {
  title: "Screens/Profile/PendingReviewsNudge",
  component: PendingReviewsNudge,
};

export default meta;
type Story = StoryObj<typeof PendingReviewsNudge>;

const queryClient = new QueryClient();

// Note: this story renders against the live/mocked `/my/reviews/pending`
// endpoint via React Query — in Storybook without a mocked network layer it
// will show the "renders nothing" empty state, which is itself a valid state
// to visually confirm (no false-positive nudge).
export const Default: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <PendingReviewsNudge />
    </QueryClientProvider>
  ),
};
