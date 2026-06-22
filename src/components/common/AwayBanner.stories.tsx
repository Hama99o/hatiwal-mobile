import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { AwayBanner } from "./AwayBanner";

const meta: Meta<typeof AwayBanner> = {
  title: "Components/AwayBanner",
  component: AwayBanner,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AwayBanner>;

// Away for 5 days — the banner should render with the localized date.
export const AwayFiveDays: Story = {
  args: {
    awayUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
};

// Away for exactly 1 day.
export const AwayOneDay: Story = {
  args: {
    awayUntil: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
};

// Null — the banner renders nothing.
export const NotAway: Story = {
  args: {
    awayUntil: null,
  },
};

// Past date — auto-expired; the banner renders nothing.
export const ExpiredAway: Story = {
  args: {
    awayUntil: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
};
