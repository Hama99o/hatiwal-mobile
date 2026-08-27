/**
 * SaleRowEditSheet.stories.tsx (SF-M5, docs/SELL_FLOW_REDESIGN.md §10.3.1)
 *
 * "Change buyer" needs a live/mocked conversations query to populate rows —
 * in Storybook this simply shows the sheet UI (the row list depends on the
 * QueryClient's cache, exactly like BuyerPickerSheet's own stories).
 */
import React, { useState } from "react";
import { View } from "react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import { SaleRowEditSheet, type SaleRowEditOutcome } from "./SaleRowEditSheet";
import type { Transaction } from "@/api/transactions";

const meta: Meta<typeof SaleRowEditSheet> = {
  title: "Seller/ListingSales/SaleRowEditSheet",
  component: SaleRowEditSheet,
};

export default meta;
type Story = StoryObj<typeof SaleRowEditSheet>;

const queryClient = new QueryClient();

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

function SaleRowEditSheetDemo({
  transaction,
  multiUnit = true,
  maxQuantity = 13,
  outcome = { ok: true } as SaleRowEditOutcome,
}: {
  transaction: Transaction;
  multiUnit?: boolean;
  maxQuantity?: number;
  outcome?: SaleRowEditOutcome;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Button onPress={() => setVisible(true)}>
          <Text>Open Sale Edit Sheet</Text>
        </Button>
        <SaleRowEditSheet
          visible={visible}
          onClose={() => setVisible(false)}
          transaction={transaction}
          multiUnit={multiUnit}
          maxQuantity={maxQuantity}
          onSave={async () => outcome}
          onDelete={async () => outcome}
        />
      </View>
    </QueryClientProvider>
  );
}

// A multi-unit sale, registered buyer — the common case.
export const MultiUnitSale: Story = {
  render: () => <SaleRowEditSheetDemo transaction={buildTransaction()} multiUnit maxQuantity={13} />,
};

// A single-item sale — the quantity stepper is present but disabled (there's
// only ever one to sell).
export const SingleItemSale: Story = {
  render: () => (
    <SaleRowEditSheetDemo transaction={buildTransaction({ quantity: 1, finalPrice: 45000 })} multiUnit={false} maxQuantity={1} />
  ),
};

// SF-B3 — sold to someone not on Hatiwal: a real, recorded row with no
// counterparty account.
export const OutsideBuyerSale: Story = {
  render: () => <SaleRowEditSheetDemo transaction={buildTransaction({ buyer: null })} maxQuantity={13} />,
};

// SF-B4's one deliberate refusal: the sale already has a review — Delete and
// "Change buyer" are hidden, quantity/price stay editable, and the inline
// explanation renders instead of the server's raw English.
export const BlockedByExistingReview: Story = {
  render: () => (
    <SaleRowEditSheetDemo
      transaction={buildTransaction()}
      outcome={{ ok: false, blockedReviewed: true }}
    />
  ),
};
