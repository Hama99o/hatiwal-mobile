import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SafetyTipsSheet } from "./SafetyTipsSheet";

const meta: Meta<typeof SafetyTipsSheet> = {
  title: "Components/SafetyTipsSheet",
  component: SafetyTipsSheet,
};

export default meta;
type Story = StoryObj<typeof SafetyTipsSheet>;

// Controlled wrapper that lets you open/close the sheet from Storybook
function SafetyTipsSheetDemo() {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Open Safety Tips</Text>
      </Button>
      <SafetyTipsSheet visible={visible} onClose={() => setVisible(false)} />
    </View>
  );
}

// Default — light mode, English, closed until the trigger button is pressed
export const Default: Story = {
  render: () => <SafetyTipsSheetDemo />,
};

// Pre-opened for visual inspection in Storybook (no button needed) — light mode
export const Open: Story = {
  args: {
    visible: true,
    onClose: () => {},
  },
};

// Pre-opened — dark mode. SafetyTipsSheet reads all colors from useColors(),
// which follows the app-wide theme store / OS color scheme at runtime.
// Switch the device/Storybook color scheme to "dark" to preview it here.
export const OpenDark: Story = {
  args: {
    visible: true,
    onClose: () => {},
  },
  parameters: {
    notes:
      "Switch device/Storybook color scheme to dark. The component reads all colors from useColors() at runtime — no dark-specific prop.",
  },
};

// Pre-opened — RTL (Pashto / Dari). SafetyTipsSheet reads isRtl from
// useLocalization() at runtime; switch device/Storybook locale to 'ps' or
// 'fa' to preview the mirrored layout (icon + text row direction, alignment).
export const OpenRtl: Story = {
  args: {
    visible: true,
    onClose: () => {},
  },
  parameters: {
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};
