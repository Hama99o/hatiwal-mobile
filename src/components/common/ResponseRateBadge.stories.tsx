import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ResponseRateBadge } from "./ResponseRateBadge";

const meta: Meta<typeof ResponseRateBadge> = {
  title: "Components/ResponseRateBadge",
  component: ResponseRateBadge,
  argTypes: {
    responseRatePercent: { control: { type: "number", min: 0, max: 100 } },
    responseTimeLabel: {
      control: "select",
      options: ["within_one_hour", "within_a_day", "within_a_few_days", null],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResponseRateBadge>;

// Fast responder — all three time-label variants

export const WithinOneHour: Story = {
  args: { responseRatePercent: 100, responseTimeLabel: "within_one_hour" },
};

export const WithinADay: Story = {
  args: { responseRatePercent: 80, responseTimeLabel: "within_a_day" },
};

export const WithinAFewDays: Story = {
  args: { responseRatePercent: 60, responseTimeLabel: "within_a_few_days" },
};

// Suppressed — null fields → should render nothing
export const NullRatePercent: Story = {
  args: { responseRatePercent: null, responseTimeLabel: "within_one_hour" },
};

export const NullTimeLabel: Story = {
  args: { responseRatePercent: 80, responseTimeLabel: null },
};

export const BothNull: Story = {
  args: { responseRatePercent: null, responseTimeLabel: null },
};

// Zero percent — should render nothing (contradictory signal suppressed)
export const ZeroPercent: Story = {
  args: { responseRatePercent: 0, responseTimeLabel: "within_a_few_days" },
};

// All visible variants side by side
export const AllTimeLabels: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <ResponseRateBadge responseRatePercent={100} responseTimeLabel="within_one_hour" />
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel="within_a_day" />
      <ResponseRateBadge responseRatePercent={60} responseTimeLabel="within_a_few_days" />
    </View>
  ),
};
