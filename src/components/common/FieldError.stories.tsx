import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { FieldError } from "./FieldError";

const meta: Meta<typeof FieldError> = {
  title: "Components/FieldError",
  component: FieldError,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FieldError>;

export const TitleRequired: Story = {
  args: { message: "Title is required (max 150 characters)" },
};

export const PhotoRequired: Story = {
  args: { message: "Add at least one photo before publishing" },
};

export const LocationRequired: Story = {
  args: { message: "Location is required — buyers filter listings by area" },
};

// No message — renders nothing.
export const NoErrorRendersNull: Story = {
  args: { message: "" },
};
