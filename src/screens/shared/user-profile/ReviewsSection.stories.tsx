import React from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReviewsSection } from "./ReviewsSection";

const meta: Meta<typeof ReviewsSection> = {
  title: "Screens/UserProfile/ReviewsSection",
  component: ReviewsSection,
};

export default meta;
type Story = StoryObj<typeof ReviewsSection>;

const queryClient = new QueryClient();

export const Default: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <ReviewsSection userId={1} onViewAll={() => {}} />
    </QueryClientProvider>
  ),
};
