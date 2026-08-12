import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { HighlightedText } from "./HighlightedText";

const meta: Meta<typeof HighlightedText> = {
  title: "Components/HighlightedText",
  component: HighlightedText,
  argTypes: {
    text: { control: "text" },
    query: { control: "text" },
    numberOfLines: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof HighlightedText>;

const baseStyle = { fontSize: 14 };

// ── No query — renders as plain text ────────────────────────────────────────

export const NoQuery: Story = {
  args: {
    text: "Is this still available? Can we meet tomorrow?",
  },
};

// ── Matched term — the shared treatment used by both MessageBubble (in-thread
//    search) and ConversationRow (inbox search, TASK-J471) ──────────────────

export const MatchedTerm: Story = {
  args: {
    text: "Is this still available? Can we meet tomorrow?",
    query: "available",
  },
};

export const MatchedTermAtStart: Story = {
  args: {
    text: "Price is 5000 AFN, negotiable",
    query: "Price",
  },
};

export const MultipleMatches: Story = {
  args: {
    text: "buy buy buy — best price in town",
    query: "buy",
  },
};

export const CaseInsensitiveMatch: Story = {
  args: {
    text: "AVAILABLE now, come see it today",
    query: "available",
  },
};

export const NoMatchFound: Story = {
  args: {
    text: "No overlap with this search term at all",
    query: "xyz",
  },
};

// ── Truncation — numberOfLines forwarded to the outer wrapping Text, the
//    exact pattern ConversationRow's preview line relies on ──────────────────

export const TruncatedWithMatch: Story = {
  args: {
    text: "This is a very long preview line that should truncate after one line once the matching term is highlighted inside it",
    query: "matching",
    numberOfLines: 1,
  },
  decorators: [(Story) => <View style={{ width: 240 }}><Story /></View>],
};

// ── Side-by-side comparison ───────────────────────────────────────────────────

export const AllStates: Story = {
  render: () => (
    <View style={{ gap: 16 }}>
      <HighlightedText text="No query — plain text" baseStyle={baseStyle} />
      <HighlightedText text="Matched: is this still available?" query="available" baseStyle={baseStyle} />
      <HighlightedText text="buy buy buy — best deal" query="buy" baseStyle={baseStyle} />
      <HighlightedText text="No match for xyz here" query="xyz" baseStyle={baseStyle} />
    </View>
  ),
};
