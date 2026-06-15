import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { MeetupSheet } from "./MeetupSheet";

const meta: Meta<typeof MeetupSheet> = {
  title: "Chat/MeetupSheet",
  component: MeetupSheet,
};

export default meta;
type Story = StoryObj<typeof MeetupSheet>;

// Interactive: open from a button, logs propose args to console
function MeetupSheetDemo({ isSubmitting = false }: { isSubmitting?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Propose Meetup</Text>
      </Button>
      <MeetupSheet
        visible={visible}
        onClose={() => setVisible(false)}
        onPropose={async (place, time) => {
          console.log("propose", { place, time });
          setVisible(false);
        }}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

export const Default: Story = {
  render: () => <MeetupSheetDemo />,
};

// Pre-opened for visual inspection
export const Open: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPropose: async () => {},
    isSubmitting: false,
  },
};

// Submitting state — button shows loading label, inputs disabled
export const Submitting: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPropose: async () => {},
    isSubmitting: true,
  },
};
