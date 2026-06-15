import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ViewsSparkline } from "./ViewsSparkline";
import type { ListingAnalyticsEntry } from "@/api/listings";

// Build an entry for a date N days ago
function daysAgoEntry(n: number, count: number): ListingAnalyticsEntry {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const dateStr = d.toISOString().slice(0, 10);
  return { date: dateStr, count };
}

// 7-entry dataset with realistic numbers
const ENTRIES_WITH_DATA: ListingAnalyticsEntry[] = [
  daysAgoEntry(6, 0),
  daysAgoEntry(5, 2),
  daysAgoEntry(4, 8),
  daysAgoEntry(3, 5),
  daysAgoEntry(2, 1),
  daysAgoEntry(1, 11),
  daysAgoEntry(0, 7), // today
];

// All zeros
const ENTRIES_ZERO: ListingAnalyticsEntry[] = Array.from({ length: 7 }, (_, i) =>
  daysAgoEntry(6 - i, 0)
);

// Spike on today
const ENTRIES_SPIKE: ListingAnalyticsEntry[] = [
  daysAgoEntry(6, 0),
  daysAgoEntry(5, 0),
  daysAgoEntry(4, 1),
  daysAgoEntry(3, 0),
  daysAgoEntry(2, 0),
  daysAgoEntry(1, 0),
  daysAgoEntry(0, 42), // viral today
];

const meta: Meta<typeof ViewsSparkline> = {
  title: "Components/ViewsSparkline",
  component: ViewsSparkline,
  argTypes: {
    loading: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: "#fff" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ViewsSparkline>;

// Realistic engagement data
export const WithData: Story = {
  args: {
    entries: ENTRIES_WITH_DATA,
    loading: false,
  },
};

// Loading skeleton state
export const Loading: Story = {
  args: {
    entries: [],
    loading: true,
  },
};

// All zeros — hairline bars only
export const AllZero: Story = {
  args: {
    entries: ENTRIES_ZERO,
    loading: false,
  },
};

// Viral spike today — today bar dominates
export const SpikeToday: Story = {
  args: {
    entries: ENTRIES_SPIKE,
    loading: false,
  },
};

// Empty entries — renders nothing
export const Empty: Story = {
  args: {
    entries: [],
    loading: false,
  },
};
