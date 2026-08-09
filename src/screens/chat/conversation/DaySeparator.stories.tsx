import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { DaySeparator } from "./DaySeparator";

const meta: Meta<typeof DaySeparator> = {
  title: "Chat/DaySeparator",
  component: DaySeparator,
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#f0f0f0" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DaySeparator>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const Today: Story = {
  args: { variant: "day", iso: new Date().toISOString() },
};

export const Yesterday: Story = {
  args: { variant: "day", iso: new Date(Date.now() - ONE_DAY_MS).toISOString() },
};

export const OlderDate: Story = {
  args: { variant: "day", iso: new Date(Date.now() - 20 * ONE_DAY_MS).toISOString() },
};

export const UnreadDivider: Story = {
  args: { variant: "unread" },
};

// Both variants together, as they'd appear stacked in a real thread.
export const InThreadContext: Story = {
  render: () => (
    <View style={{ gap: 2 }}>
      <DaySeparator variant="day" iso={new Date(Date.now() - 20 * ONE_DAY_MS).toISOString()} />
      <DaySeparator variant="day" iso={new Date(Date.now() - ONE_DAY_MS).toISOString()} />
      <DaySeparator variant="unread" />
      <DaySeparator variant="day" iso={new Date().toISOString()} />
    </View>
  ),
};
