import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ExpiryBadge } from "./ExpiryBadge";

// Helper: ISO string N days from now
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

const meta: Meta<typeof ExpiryBadge> = {
  title: "Components/ExpiryBadge",
  component: ExpiryBadge,
  argTypes: {
    status: {
      control: "select",
      options: ["draft", "active", "reserved", "sold"],
    },
    expired: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExpiryBadge>;

// Active, plenty of time — muted grey pill
export const Plenty: Story = {
  args: {
    status: "active",
    expiresAt: daysFromNow(28),
    expired: false,
  },
};

// Active, 3 days left — warning pill (at threshold)
export const WarningSoon: Story = {
  args: {
    status: "active",
    expiresAt: daysFromNow(3),
    expired: false,
  },
};

// Active, tomorrow — warning pill
export const ExpiresTomorrow: Story = {
  args: {
    status: "active",
    expiresAt: daysFromNow(1),
    expired: false,
  },
};

// Active, already expired by date (≤ 0 days) — destructive pill
export const ExpiredByDate: Story = {
  args: {
    status: "active",
    expiresAt: daysFromNow(-2),
    expired: false,
  },
};

// Active, server has set expired=true — destructive pill
export const ExpiredFlag: Story = {
  args: {
    status: "active",
    expiresAt: daysFromNow(-5),
    expired: true,
  },
};

// Draft — renders nothing (returns null)
export const DraftReturnsNull: Story = {
  args: {
    status: "draft",
    expiresAt: daysFromNow(10),
    expired: false,
  },
};

// Reserved — renders nothing
export const ReservedReturnsNull: Story = {
  args: {
    status: "reserved",
    expiresAt: daysFromNow(10),
    expired: false,
  },
};

// No expiresAt — renders nothing
export const NoExpiry: Story = {
  args: {
    status: "active",
    expiresAt: null,
    expired: false,
  },
};

// All visible states stacked for comparison
export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 10 }}>
      <ExpiryBadge status="active" expiresAt={daysFromNow(28)} expired={false} />
      <ExpiryBadge status="active" expiresAt={daysFromNow(3)} expired={false} />
      <ExpiryBadge status="active" expiresAt={daysFromNow(1)} expired={false} />
      <ExpiryBadge status="active" expiresAt={daysFromNow(-2)} expired={false} />
      <ExpiryBadge status="active" expiresAt={daysFromNow(-5)} expired={true} />
    </View>
  ),
};
