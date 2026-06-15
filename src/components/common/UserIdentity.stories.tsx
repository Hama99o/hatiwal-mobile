import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { UserIdentity } from "./UserIdentity";
import { action } from "@storybook/addon-actions";

const meta: Meta<typeof UserIdentity> = {
  title: "Components/UserIdentity",
  component: UserIdentity,
  argTypes: {
    name: { control: "text" },
    avatarUrl: { control: "text" },
    verified: { control: "boolean" },
    subtitle: { control: "text" },
    size: { control: "number" },
    layout: { control: "select", options: ["row", "stacked"] },
    showName: { control: "boolean" },
    showAvatar: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof UserIdentity>;

export const RowWithAvatar: Story = {
  args: {
    name: "Ahmad Karimi",
    avatarUrl: "https://picsum.photos/seed/user1/100/100",
    verified: false,
    layout: "row",
    showName: true,
  },
};

export const RowNoAvatar: Story = {
  args: {
    name: "Omar Noori",
    avatarUrl: null,
    verified: false,
    layout: "row",
    showName: true,
  },
};

export const RowVerified: Story = {
  args: {
    name: "Fatima Rahimi",
    avatarUrl: null,
    verified: true,
    layout: "row",
    showName: true,
  },
};

export const RowWithSubtitle: Story = {
  args: {
    name: "Khalid Wardak",
    avatarUrl: null,
    verified: false,
    subtitle: "Kabul · Member since 2023",
    layout: "row",
    showName: true,
  },
};

export const RowVerifiedWithSubtitle: Story = {
  args: {
    name: "Maryam Ahmadi",
    avatarUrl: null,
    verified: true,
    subtitle: "Herat",
    layout: "row",
    showName: true,
  },
};

export const StackedLayout: Story = {
  args: {
    name: "Omar Noori",
    avatarUrl: null,
    verified: true,
    subtitle: "Kandahar",
    layout: "stacked",
    size: 72,
    showName: true,
  },
};

export const AvatarOnly: Story = {
  args: {
    name: "Ahmad Karimi",
    avatarUrl: null,
    showName: false,
    size: 44,
  },
};

/**
 * Profile header pattern: avatar is rendered separately (e.g. in a Pressable),
 * so UserIdentity shows only name + verified badge + subtitle — no duplicate avatar.
 */
export const NameOnlyNoAvatar: Story = {
  args: {
    name: "Maryam Ahmadi",
    avatarUrl: null,
    verified: true,
    subtitle: "Member since Jan 2024",
    layout: "stacked",
    showAvatar: false,
    nameSize: 20,
  },
};

export const Pressable: Story = {
  args: {
    name: "Ahmad Karimi",
    avatarUrl: null,
    verified: true,
    subtitle: "Kabul",
    layout: "row",
    showName: true,
    onPress: action("onPress"),
  },
};

export const LargeRow: Story = {
  args: {
    name: "Ahmad Karimi",
    avatarUrl: null,
    verified: true,
    subtitle: "Kabul",
    layout: "row",
    size: 64,
    showName: true,
  },
};

// Multiple rows showing the component in a list context
export const ListContext: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <UserIdentity name="Ahmad Karimi" verified={true} subtitle="Kabul · posted 2h ago" />
      <UserIdentity name="Fatima Rahimi" verified={false} subtitle="Herat" />
      <UserIdentity name="Omar Noori" verified={true} subtitle="Kandahar · posted 1d ago" />
    </View>
  ),
};
