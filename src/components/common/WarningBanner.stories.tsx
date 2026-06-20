import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { WarningBanner } from "./WarningBanner";

const meta: Meta<typeof WarningBanner> = {
  title: "Components/WarningBanner",
  component: WarningBanner,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WarningBanner>;

const reasons = [
  { reason: "Posting spam listings", category: "spam", expiresAt: new Date().toISOString() },
  { reason: "Misleading item description", category: "inappropriate", expiresAt: new Date().toISOString() },
];

// One warning of three — plenty of room.
export const OneWarning: Story = {
  args: { activeCount: 1, threshold: 3, warnings: reasons.slice(0, 1) },
};

// Two of three — one away from a block.
export const TwoWarnings: Story = {
  args: { activeCount: 2, threshold: 3, warnings: reasons },
};

// At the limit — auto-suspended.
export const AtLimit: Story = {
  args: { activeCount: 3, threshold: 3, warnings: reasons },
};

// No active warnings — renders nothing.
export const NoneReturnsNull: Story = {
  args: { activeCount: 0, threshold: 3, warnings: [] },
};
