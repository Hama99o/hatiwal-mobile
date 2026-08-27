import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FieldNote } from "./FieldNote";

const meta: Meta<typeof FieldNote> = {
  title: "Components/FieldNote",
  component: FieldNote,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FieldNote>;

export const Info: Story = {
  args: { message: "How many are you asking about? This only shapes your first message." },
};

// SF-M7 — the reopen note under the quantity field on a sold listing.
export const Success: Story = {
  args: {
    message: "Saving will put this listing back on sale — with 5 available.",
    tone: "success",
  },
};

// No message — renders nothing.
export const NoMessageRendersNull: Story = {
  args: { message: "" },
};
