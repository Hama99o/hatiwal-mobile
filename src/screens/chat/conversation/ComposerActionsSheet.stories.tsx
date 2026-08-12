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
  offerUnavailableReason,
}: {
  canMakeOffer?: boolean;
  disabled?: boolean;
  offerUnavailableReason?: string;
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
        offerUnavailableReason={offerUnavailableReason}
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

// Offer row hidden entirely — closed conversation, deleted listing, or firm
// price (mirrors Conversation.tsx's canOfferInThread === false with NO
// `offerUnavailableReason`). TASK-K729 (review fix, MEDIUM — states/story
// coverage): reserved/sold is NOT one of these cases anymore — it renders
// the row DISABLED with a reason instead (see `OfferRowDisabledReason`
// below), so it's deliberately excluded from this list now. Photo/File/
// Meetup rows still show — only the offer row is gated.
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

// TASK-K729 (review fix, MEDIUM — states/story coverage): the offer row is
// hidden SPECIFICALLY because the pinned listing is reserved/sold —
// `offerUnavailableReason` renders it anyway, disabled, dimmed to
// `colors.mutedForeground`, with a one-line reason subtitle instead of a
// silent gap (the same "explicit reason, not a vanished button" fix as the
// in-thread ListingUnavailableNotice, surfaced here too since a buyer/seller
// might tap "+" looking for it before ever seeing the notice).
export const OfferRowDisabledReason: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPhoto: () => {},
    onFile: () => {},
    onProposeMeetup: () => {},
    onMakeOffer: () => {},
    canMakeOffer: false,
    offerUnavailableReason: "Item sold",
  },
};

// Same reserved/sold reason row, but with an upload ALSO in flight — shows
// the two opacity paths are distinct: `disabled` dims the WHOLE row
// (including the reason subtitle) via the sheet-level 0.5 opacity, while the
// reason row's own icon/label dimming (mutedForeground, subtitle unaffected)
// applies regardless. Together they compound, which this story lets a
// reviewer eyeball in light and dark.
export const OfferRowDisabledReasonUploading: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onPhoto: () => {},
    onFile: () => {},
    onProposeMeetup: () => {},
    onMakeOffer: () => {},
    canMakeOffer: false,
    offerUnavailableReason: "Item sold",
    disabled: true,
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
