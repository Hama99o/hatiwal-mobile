import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { UserAvatar } from "./UserAvatar";

const meta: Meta<typeof UserAvatar> = {
  title: "Components/UserAvatar",
  component: UserAvatar,
  argTypes: {
    name: { control: "text" },
    avatarUrl: { control: "text" },
    size: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const WithInitials: Story = {
  args: {
    name: "Ahmad Karimi",
    avatarUrl: null,
    size: 44,
  },
};

export const WithImage: Story = {
  args: {
    name: "Omar Noori",
    avatarUrl: "https://picsum.photos/seed/user1/100/100",
    size: 44,
  },
};

export const LargeSize: Story = {
  args: {
    name: "Fatima Rahimi",
    avatarUrl: null,
    size: 84,
  },
};

export const SmallSize: Story = {
  args: {
    name: "Khalid Wardak",
    avatarUrl: null,
    size: 28,
  },
};

export const SingleInitial: Story = {
  args: {
    name: "Z",
    avatarUrl: null,
    size: 44,
  },
};

// Multiple sizes side by side
export const SizeComparison: Story = {
  render: () => (
    <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
      <UserAvatar name="Ahmad" size={28} />
      <UserAvatar name="Omar" size={44} />
      <UserAvatar name="Fatima" size={64} />
      <UserAvatar name="Khalid" size={84} />
    </View>
  ),
};
