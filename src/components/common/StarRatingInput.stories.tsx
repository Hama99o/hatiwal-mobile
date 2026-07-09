import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { StarRatingInput } from "./StarRatingInput";

const meta: Meta<typeof StarRatingInput> = {
  title: "Components/StarRatingInput",
  component: StarRatingInput,
};

export default meta;
type Story = StoryObj<typeof StarRatingInput>;

function InteractiveDemo({ initial = 0, disabled = false }: { initial?: number; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return <StarRatingInput value={value} onChange={setValue} disabled={disabled} />;
}

export const Empty: Story = {
  render: () => <InteractiveDemo initial={0} />,
};

export const ThreeStars: Story = {
  render: () => <InteractiveDemo initial={3} />,
};

export const FiveStars: Story = {
  render: () => <InteractiveDemo initial={5} />,
};

export const Disabled: Story = {
  render: () => <InteractiveDemo initial={4} disabled />,
};

export const Small: Story = {
  render: () => {
    const [value, setValue] = useState(4);
    return <StarRatingInput value={value} onChange={setValue} size={20} />;
  },
};

export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 16, padding: 16 }}>
      <InteractiveDemo initial={0} />
      <InteractiveDemo initial={3} />
      <InteractiveDemo initial={5} />
      <InteractiveDemo initial={4} disabled />
    </View>
  ),
};
