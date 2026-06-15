import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/api/conversations";

const now = "2024-06-15T09:00:00Z";

const makeMsg = (overrides: Partial<Message>): Message => ({
  id: 1,
  body: "Hello",
  kind: "text",
  readAt: null,
  createdAt: now,
  sender: { id: 1, name: "Ahmad" },
  ...overrides,
});

const meta: Meta<typeof MessageBubble> = {
  title: "Chat/MessageBubble",
  component: MessageBubble,
  decorators: [
    (Story) => (
      <View style={{ padding: 8, backgroundColor: "#f0f0f0" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

// ── Text messages ────────────────────────────────────────────────────────────

export const TextMine: Story = {
  args: {
    message: makeMsg({ body: "Is this still available?" }),
    isMine: true,
  },
};

export const TextTheirs: Story = {
  args: {
    message: makeMsg({ body: "Yes, come by this evening." }),
    isMine: false,
  },
};

export const TextMineRead: Story = {
  args: {
    message: makeMsg({ body: "Great, see you at 5 pm!", readAt: now }),
    isMine: true,
  },
};

export const TextLong: Story = {
  args: {
    message: makeMsg({
      body: "This is a very long message that goes on for quite a while to test wrapping behaviour in the bubble component and make sure the max-width constraint kicks in correctly.",
    }),
    isMine: false,
  },
};

// ── System message ────────────────────────────────────────────────────────────

export const SystemMessage: Story = {
  args: {
    message: makeMsg({ kind: "system", body: "Conversation started" }),
    isMine: false,
  },
};

// ── Offer messages ────────────────────────────────────────────────────────────

export const OfferMineAwaitingResponse: Story = {
  args: {
    message: makeMsg({ kind: "offer", body: "75000|AFN|85000" }),
    isMine: true,
    offerOutcome: null,
  },
};

export const OfferTheirsCanRespond: Story = {
  args: {
    message: makeMsg({ kind: "offer", body: "75000|AFN|85000" }),
    isMine: false,
    offerOutcome: null,
    onOfferRespond: (accepted) => console.log("offer respond", accepted),
  },
};

export const OfferAccepted: Story = {
  args: {
    message: makeMsg({ kind: "offer", body: "75000|AFN|85000" }),
    isMine: true,
    offerOutcome: "accepted",
  },
};

export const OfferDeclined: Story = {
  args: {
    message: makeMsg({ kind: "offer", body: "75000|AFN|85000" }),
    isMine: true,
    offerOutcome: "declined",
  },
};

// ── Meetup proposal messages ──────────────────────────────────────────────────

export const MeetupMineAwaitingResponse: Story = {
  args: {
    message: makeMsg({
      kind: "meetup_proposal",
      body: "Share Naw Park, Kabul | Tomorrow at 4 PM",
    }),
    isMine: true,
    meetupOutcome: null,
  },
};

export const MeetupTheirsCanRespond: Story = {
  args: {
    message: makeMsg({
      kind: "meetup_proposal",
      body: "Share Naw Park, Kabul | Tomorrow at 4 PM",
    }),
    isMine: false,
    meetupOutcome: null,
    onMeetupRespond: (accepted) => console.log("meetup respond", accepted),
  },
};

export const MeetupAccepted: Story = {
  args: {
    message: makeMsg({
      kind: "meetup_proposal",
      body: "Share Naw Park, Kabul | Tomorrow at 4 PM",
    }),
    isMine: true,
    meetupOutcome: "accepted",
  },
};

export const MeetupDeclined: Story = {
  args: {
    message: makeMsg({
      kind: "meetup_proposal",
      body: "Share Naw Park, Kabul | Tomorrow at 4 PM",
    }),
    isMine: true,
    meetupOutcome: "declined",
  },
};

// Meetup with only place, no time
export const MeetupNoTime: Story = {
  args: {
    message: makeMsg({
      kind: "meetup_proposal",
      body: "Kabul City Center",
    }),
    isMine: false,
    meetupOutcome: null,
    onMeetupRespond: (accepted) => console.log("meetup", accepted),
  },
};

// ── Accepted/declined response messages — these return null ──────────────────

export const MeetupAcceptedResponse_RendersNull: Story = {
  args: {
    message: makeMsg({ kind: "meetup_accepted", body: "" }),
    isMine: true,
  },
};

// ── Full thread view ──────────────────────────────────────────────────────────

export const FullThread: Story = {
  render: () => (
    <View style={{ gap: 0, backgroundColor: "#f0f0f0", padding: 8 }}>
      <MessageBubble
        message={makeMsg({ id: 1, body: "Still available?", kind: "text" })}
        isMine={false}
      />
      <MessageBubble
        message={makeMsg({ id: 2, body: "Yes! Come by tomorrow.", kind: "text", readAt: now })}
        isMine={true}
      />
      <MessageBubble
        message={makeMsg({ id: 3, kind: "offer", body: "70000|AFN|85000" })}
        isMine={false}
        onOfferRespond={(a) => console.log(a)}
        offerOutcome={null}
      />
      <MessageBubble
        message={makeMsg({ id: 4, kind: "meetup_proposal", body: "Share Naw | Tomorrow 5pm" })}
        isMine={true}
        meetupOutcome="accepted"
      />
    </View>
  ),
};
