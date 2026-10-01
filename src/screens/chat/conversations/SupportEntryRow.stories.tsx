import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { SupportEntryRow } from "./SupportEntryRow";

const meta: Meta<typeof SupportEntryRow> = {
  title: "Chat/SupportEntryRow",
  component: SupportEntryRow,
  args: { onPress: () => undefined },
};
export default meta;
type Story = StoryObj<typeof SupportEntryRow>;

const lang = (code: string) => (Story: React.ComponentType) => {
  i18n.changeLanguage(code);
  return <View style={{ backgroundColor: "#fff" }}><Story /></View>;
};

export const English: Story = { decorators: [lang("en")] };
export const Opening: Story = { args: { isOpening: true }, decorators: [lang("en")] };
export const PashtoRtl: Story = { decorators: [lang("ps")] };
export const UrduRtl: Story = { decorators: [lang("ur")] };
