import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ConditionChips } from "./ConditionChips";
import type { ListingCondition } from "@/api/listings";

const meta: Meta<typeof ConditionChips> = {
  title: "Components/ConditionChips",
  component: ConditionChips,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConditionChips>;

// Controlled wrapper for interactive stories
function ChipsWrapper({
  initial,
  allowClear,
}: {
  initial: ListingCondition | null;
  allowClear?: boolean;
}) {
  const [value, setValue] = useState<ListingCondition | null>(initial);
  return (
    <ConditionChips value={value} onChange={setValue} allowClear={allowClear} />
  );
}

// Form mode — one chip always selected (allowClear=false)
export const FormMode: Story = {
  render: () => <ChipsWrapper initial="brand_new" allowClear={false} />,
};

// Filter mode — tapping again clears (allowClear=true)
export const FilterMode: Story = {
  render: () => <ChipsWrapper initial={null} allowClear={true} />,
};

export const FilterModePreselected: Story = {
  render: () => <ChipsWrapper initial="good" allowClear={true} />,
};

// Nothing selected (form mode starting empty)
export const NoneSelected: Story = {
  render: () => <ChipsWrapper initial={null} allowClear={false} />,
};

// All four chips side by side — selected=like_new
export const SelectedLikeNew: Story = {
  render: () => <ChipsWrapper initial="like_new" allowClear={false} />,
};
