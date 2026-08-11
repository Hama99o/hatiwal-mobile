import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FieldLabel } from "./FieldLabel";

const meta: Meta<typeof FieldLabel> = {
  title: "Components/FieldLabel",
  component: FieldLabel,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FieldLabel>;

export const Required: Story = {
  args: { children: "Price", required: true },
};

export const Optional: Story = {
  args: { children: "Description" },
};

export const RequiredWithNativeID: Story = {
  args: { children: "Title", required: true, nativeID: "title-label" },
};
