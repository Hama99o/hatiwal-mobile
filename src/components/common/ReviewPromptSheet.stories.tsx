import React, { useState } from "react";
import { View } from "react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ReviewPromptSheet } from "./ReviewPromptSheet";

const meta: Meta<typeof ReviewPromptSheet> = {
  title: "Components/ReviewPromptSheet",
  component: ReviewPromptSheet,
};

export default meta;
type Story = StoryObj<typeof ReviewPromptSheet>;

const queryClient = new QueryClient();

function ReviewPromptSheetDemo({ callerRole }: { callerRole: "buyer" | "seller" }) {
  const [visible, setVisible] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Button onPress={() => setVisible(true)}>
          <Text>Rate as {callerRole === "seller" ? "seller (rating buyer)" : "buyer (rating seller)"}</Text>
        </Button>
        <ReviewPromptSheet
          visible={visible}
          onClose={() => setVisible(false)}
          transactionId={10}
          callerRole={callerRole}
          counterpartyName="Ahmad Karimi"
          counterpartyAvatarUrl={null}
        />
      </View>
    </QueryClientProvider>
  );
}

export const RateBuyer: Story = {
  render: () => <ReviewPromptSheetDemo callerRole="seller" />,
};

export const RateSeller: Story = {
  render: () => <ReviewPromptSheetDemo callerRole="buyer" />,
};

export const OpenWithAvatar: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <ReviewPromptSheet
        visible
        onClose={() => {}}
        transactionId={10}
        callerRole="seller"
        counterpartyName="Ahmad Karimi"
        counterpartyAvatarUrl="https://i.pravatar.cc/100?img=12"
      />
    </QueryClientProvider>
  ),
};
