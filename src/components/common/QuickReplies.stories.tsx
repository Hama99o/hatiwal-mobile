/**
 * QuickReplies stories — covers buyer set, seller set, RTL, and dark surface.
 *
 * TASK-Q374: Quick-reply message presets in the chat composer.
 *
 * Stories:
 *   BuyerLTR        — buyer chips, English (LTR)
 *   SellerLTR       — seller chips, English (LTR)
 *   BuyerRTL        — buyer chips, Pashto/Dari (RTL)
 *   SellerRTL       — seller chips, RTL
 *   DarkSurface     — dark background to verify useColors() tokens
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { QuickReplies } from "./QuickReplies";
import { Text } from "@/components/reusables/text";

// Controlled wrapper — shows which phrase was last selected
function Wrapper({
  role,
  isRtl = false,
  darkBg = false,
}: {
  role: "buyer" | "seller";
  isRtl?: boolean;
  darkBg?: boolean;
}) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <View style={{ backgroundColor: darkBg ? "#0f172a" : "#f8f8f8", flex: 1 }}>
      {last ? (
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 13, color: darkBg ? "#e2e8f0" : "#333" }}>
            Selected: {last}
          </Text>
        </View>
      ) : null}
      <QuickReplies role={role} onSelect={setLast} />
    </View>
  );
}

const meta: Meta<typeof QuickReplies> = {
  title: "Components/QuickReplies",
  component: QuickReplies,
  decorators: [
    (Story) => (
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof QuickReplies>;

/** Buyer phrases — LTR (English) */
export const BuyerLTR: Story = {
  render: () => <Wrapper role="buyer" />,
};

/** Seller phrases — LTR (English) */
export const SellerLTR: Story = {
  render: () => <Wrapper role="seller" />,
};

/** Buyer phrases — RTL (Pashto / Dari) */
export const BuyerRTL: Story = {
  render: () => <Wrapper role="buyer" isRtl />,
};

/** Seller phrases — RTL */
export const SellerRTL: Story = {
  render: () => <Wrapper role="seller" isRtl />,
};

/** Dark surface — verifies useColors() at runtime */
export const DarkSurface: Story = {
  render: () => <Wrapper role="buyer" darkBg />,
};

/** Seller dark surface */
export const SellerDarkSurface: Story = {
  render: () => <Wrapper role="seller" darkBg />,
};
