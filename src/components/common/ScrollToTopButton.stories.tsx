import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";

const meta: Meta<typeof ScrollToTopButton> = {
  title: "Components/ScrollToTopButton",
  component: ScrollToTopButton,
  decorators: [
    (Story) => (
      // The button positions itself absolutely against its nearest parent, so
      // the story needs a tall box to sit inside — otherwise it renders offscreen.
      <View style={{ height: 320, width: 300, justifyContent: "flex-start" }}>
        <Text style={{ padding: 12, opacity: 0.5 }}>list content…</Text>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ScrollToTopButton>;

/** Scrolled past the threshold — the only state the user actually sees. */
export const Visible: Story = {
  args: { visible: true, onPress: () => {}, bottomOffset: 16 },
};

/** Near the top: unmounted, so it can't swallow taps meant for the list. */
export const Hidden: Story = {
  args: { visible: false, onPress: () => {}, bottomOffset: 16 },
};

/** On a pushed route with no floating tab bar to clear. */
export const NoTabBarClearance: Story = {
  args: { visible: true, onPress: () => {}, bottomOffset: 0 },
};
