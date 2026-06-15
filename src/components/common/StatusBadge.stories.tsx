import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { StatusBadge } from "./StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "Components/StatusBadge",
  component: StatusBadge,
  argTypes: {
    status: {
      control: "select",
      options: ["draft", "active", "reserved", "sold"],
    },
    overlay: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Draft: Story = {
  args: { status: "draft" },
};

export const Active: Story = {
  args: { status: "active" },
};

export const Reserved: Story = {
  args: { status: "reserved" },
};

export const Sold: Story = {
  args: { status: "sold" },
};

// Overlay mode: renders as absolute strip — needs a container with defined height
export const OverlaySold: Story = {
  args: { status: "sold", overlay: true },
  decorators: [
    (Story) => (
      <View style={{ width: 200, height: 120, backgroundColor: "#ccc", position: "relative", overflow: "hidden" }}>
        <Story />
      </View>
    ),
  ],
};

export const OverlayReserved: Story = {
  args: { status: "reserved", overlay: true },
  decorators: [
    (Story) => (
      <View style={{ width: 200, height: 120, backgroundColor: "#ccc", position: "relative", overflow: "hidden" }}>
        <Story />
      </View>
    ),
  ],
};

// Overlay with draft/active — returns null (verify nothing renders)
export const OverlayActiveShouldBeNull: Story = {
  args: { status: "active", overlay: true },
  decorators: [
    (Story) => (
      <View style={{ width: 200, height: 120, backgroundColor: "#eee", position: "relative", overflow: "hidden" }}>
        <Story />
      </View>
    ),
  ],
};

// All four statuses side by side for quick visual comparison
export const AllStatuses: Story = {
  render: () => (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      <StatusBadge status="draft" />
      <StatusBadge status="active" />
      <StatusBadge status="reserved" />
      <StatusBadge status="sold" />
    </View>
  ),
};
