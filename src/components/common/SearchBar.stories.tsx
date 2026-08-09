/**
 * SearchBar stories
 *
 * Story inventory (per docs/TESTING.md — every shared component in all states):
 *   Empty        — no text, no clear button, placeholder visible
 *   Typed        — text present, animated clear (X) button visible
 *   Clear        — interactive wrapper; press the X and watch the field empty
 *   RTL          — Pashto direction, icon/clear mirrored, input right-aligned
 *   DarkSurface  — dark background, verifies useColors() tokens (no hardcoded hex)
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SearchBar } from "./SearchBar";

// Interactive wrapper — SearchBar is fully controlled, so stories that need
// to demonstrate typing/clearing behavior own their own state.
function SearchBarWrapper({
  initial = "",
  isRtl = false,
  darkBg = false,
  placeholder = "Search conversations...",
}: {
  initial?: string;
  isRtl?: boolean;
  darkBg?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: darkBg ? "#0f172a" : "#f8f8f8",
        direction: isRtl ? "rtl" : "ltr",
      }}
    >
      <SearchBar value={value} onChangeText={setValue} placeholder={placeholder} />
    </View>
  );
}

const meta: Meta<typeof SearchBar> = {
  title: "Components/SearchBar",
  component: SearchBar,
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

/** Empty — no clear button, placeholder visible. */
export const Empty: Story = {
  render: () => <SearchBarWrapper initial="" />,
};

/** Typed — a term is present, the animated clear (X) button is visible. */
export const Typed: Story = {
  render: () => <SearchBarWrapper initial="iPhone 13" />,
};

/** Clear — interactive; type in the field then tap the X to see it empty. */
export const Clear: Story = {
  render: () => <SearchBarWrapper initial="Toyota Corolla" />,
};

/** RTL — Pashto/Dari direction: icon on the right, text right-aligned, clear
 *  button mirrors to the leading (right) edge. */
export const RTL: Story = {
  render: () => <SearchBarWrapper initial="د موټر لټون" isRtl placeholder="لټون وکړئ..." />,
};

/** Dark surface — verifies every color comes from useColors() at runtime. */
export const DarkSurface: Story = {
  render: () => <SearchBarWrapper initial="Sofa" darkBg />,
};
