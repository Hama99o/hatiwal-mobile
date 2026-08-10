import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ComposerActionsSheet } from "./ComposerActionsSheet";

const meta: Meta<typeof ComposerActionsSheet> = {
  title: "Chat/ComposerActionsSheet",
  component: ComposerActionsSheet,
};

export default meta;
type Story = StoryObj<typeof ComposerActionsSheet>;

// Interactive: open from a button, logs each action to console
function ComposerActionsSheetDemo({
  canMakeOffer = true,
  disabled = false,
}: {
  canMakeOffer?: boolean;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Open composer actions</Text>
      </Button>
      <ComposerActionsSheet
        visible={visible}
        onClose={() => setVisible(false)}
        onPhoto={() => console.log("photo")}
        onFile={() => console.log("file")}
        onProposeMeetup={() => console.log("propose meetup")}
        onMakeOffer={() => console.log("make offer")}
        canMakeOffer={canMakeOffer}
        disabled={disabled}
      />
    </View>
  );
}

export const Default: Story = {
  render: () => <ComposerActionsSheetDemo />,
};

// Offer row shown — open conversation, listing active and negotiable
// (mirrors Conversation.tsx's canOfferInThread === true).
export const OfferRowShown: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPhoto: () => {},
    onFile: () => {},
    onProposeMeetup: () => {},
    onMakeOffer: () => {},
    canMakeOffer: true,
  },
};

// Offer row hidden — closed conversation, deleted/reserved/sold listing
// (TASK-K729), or firm price (mirrors Conversation.tsx's
// canOfferInThread === false). Photo/File/Meetup rows still show — only the
// offer row is gated.
export const OfferRowHidden: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPhoto: () => {},
    onFile: () => {},
    onProposeMeetup: () => {},
    onMakeOffer: () => {},
    canMakeOffer: false,
  },
};

// Upload in flight — a photo or file send is pending; every row is dimmed and
// disabled until it resolves.
export const UploadInFlight: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPhoto: () => {},
    onFile: () => {},
    onProposeMeetup: () => {},
    onMakeOffer: () => {},
    canMakeOffer: true,
    disabled: true,
  },
};
