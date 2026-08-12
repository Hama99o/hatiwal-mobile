import React from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { AgreedDealBanner } from "./AgreedDealBanner";

const meta: Meta<typeof AgreedDealBanner> = {
  title: "Chat/AgreedDealBanner",
  component: AgreedDealBanner,
  args: {
    buyerName: "Ahmad Karimi",
    amount: 13500,
    currency: "AFN",
    onReserve: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AgreedDealBanner>;

// Base case — buyer accepted the seller's counter-offer (TASK-C763's whole
// point); a verified buyer with an avatar.
export const Default: Story = {
  args: {
    buyerVerified: true,
    buyerAvatarUrl: "https://i.pravatar.cc/150?img=12",
  },
};

// No avatar on file — UserAvatar falls back to an initial circle internally.
export const NoAvatar: Story = {
  args: {
    buyerAvatarUrl: null,
    buyerVerified: false,
  },
};

// Unverified buyer — no verified badge next to the name.
export const UnverifiedBuyer: Story = {
  args: {
    buyerVerified: false,
    buyerAvatarUrl: "https://i.pravatar.cc/150?img=33",
  },
};

// Large agreed amount — PriceTag / formatCurrency must not clip.
export const LargeAmount: Story = {
  args: {
    buyerName: "Zainab Hotak",
    amount: 4250000,
    currency: "AFN",
    buyerVerified: true,
  },
};

// Long buyer name — the title line and UserIdentity name both truncate
// gracefully instead of pushing the CTA off-screen.
export const LongBuyerName: Story = {
  args: {
    buyerName: "Mohammad Ehsan Zabihullah Karimi Ahmadzai",
    buyerVerified: true,
  },
};
