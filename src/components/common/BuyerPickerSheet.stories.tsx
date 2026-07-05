/**
 * BuyerPickerSheet.stories.tsx (TASK-TX01)
 *
 * Storybook stories for the buyer-picker slide-up modal shown when a seller
 * reserves or marks a listing sold. Requires a live/mocked `/conversations`
 * endpoint to populate rows — in Storybook this simply shows the sheet UI
 * (loading/empty rows depend on the QueryClient's cache).
 */

import React, { useState } from "react";
import { View } from "react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { BuyerPickerSheet } from "./BuyerPickerSheet";

const meta: Meta<typeof BuyerPickerSheet> = {
  title: "Components/BuyerPickerSheet",
  component: BuyerPickerSheet,
};

export default meta;
type Story = StoryObj<typeof BuyerPickerSheet>;

const queryClient = new QueryClient();

function BuyerPickerSheetDemo({ action }: { action: "reserve" | "sold" }) {
  const [visible, setVisible] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Button onPress={() => setVisible(true)}>
          <Text>Open Buyer Picker ({action})</Text>
        </Button>
        <BuyerPickerSheet
          visible={visible}
          onClose={() => setVisible(false)}
          listingId={1}
          price={25000}
          currency="AFN"
          action={action}
          onConfirm={() => setVisible(false)}
        />
      </View>
    </QueryClientProvider>
  );
}

export const Reserve: Story = {
  render: () => <BuyerPickerSheetDemo action="reserve" />,
};

export const Sold: Story = {
  render: () => <BuyerPickerSheetDemo action="sold" />,
};

export const OpenReserve: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={25000}
        currency="AFN"
        action="reserve"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};
