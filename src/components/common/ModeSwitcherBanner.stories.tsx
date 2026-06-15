import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ModeSwitcherBanner } from "./ModeSwitcherBanner";
import { useModeStore } from "@/stores/mode.store";

const meta: Meta<typeof ModeSwitcherBanner> = {
  title: "Components/ModeSwitcherBanner",
  component: ModeSwitcherBanner,
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ModeSwitcherBanner>;

// Buyer mode — blue primary strip
export const BuyerMode: Story = {
  decorators: [
    (Story) => {
      useModeStore.setState({ mode: "buyer" });
      return <Story />;
    },
  ],
};

// Seller mode — amber warning strip
export const SellerMode: Story = {
  decorators: [
    (Story) => {
      useModeStore.setState({ mode: "seller" });
      return <Story />;
    },
  ],
};

// Both modes stacked for visual comparison
export const BothModes: Story = {
  render: () => {
    useModeStore.setState({ mode: "buyer" });
    return (
      <View style={{ gap: 2 }}>
        <ModeSwitcherBanner />
        {/* Reset to seller to render a second banner */}
        {(() => {
          useModeStore.setState({ mode: "seller" });
          return <ModeSwitcherBanner />;
        })()}
      </View>
    );
  },
};
