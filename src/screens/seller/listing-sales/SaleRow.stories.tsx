import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SaleRow } from "./SaleRow";
import type { Transaction } from "@/api/transactions";

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 501,
    status: "sold",
    finalPrice: 14000,
    currency: "AFN",
    quantity: 3,
    completedAt: "2026-07-10T12:00:00Z",
    createdAt: "2026-07-10T12:00:00Z",
    role: "seller",
    listing: { id: 42, title: "Handmade Rugs", thumbnailUrl: null, price: 14000, currency: "AFN", multiUnit: true, availableUnits: 10 },
    buyer: { id: 9, name: "Zahra Noori", avatarUrl: "https://picsum.photos/seed/zahra/100/100" },
    seller: { id: 1, name: "Ahmad", avatarUrl: null },
    ...overrides,
  };
}

const meta: Meta<typeof SaleRow> = {
  title: "Seller/ListingSales/SaleRow",
  component: SaleRow,
  decorators: [
    (Story) => (
      <View style={{ paddingVertical: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SaleRow>;

// Multi-unit sale — quantity + per-unit price shown.
export const MultiUnitSale: Story = {
  args: {
    transaction: buildTransaction(),
    multiUnit: true,
    onPress: () => {},
  },
};

// Single-item sale — no quantity line, price is the flat total.
export const SingleItemSale: Story = {
  args: {
    transaction: buildTransaction({ quantity: 1, finalPrice: 45000, currency: "AFN" }),
    multiUnit: false,
    onPress: () => {},
  },
};

// SF-B3 — sold to someone not on Hatiwal: a real, recorded ledger row with no
// counterparty account. Never the "buyer info unavailable" fallback.
export const OutsideBuyerSale: Story = {
  args: {
    transaction: buildTransaction({ buyer: null }),
    multiUnit: true,
    onPress: () => {},
  },
};

// No avatar photo — falls back to the initial-letter avatar via UserAvatar.
export const NoAvatarPhoto: Story = {
  args: {
    transaction: buildTransaction({ buyer: { id: 12, name: "Karim Yousafi", avatarUrl: null } }),
    multiUnit: true,
    onPress: () => {},
  },
};
