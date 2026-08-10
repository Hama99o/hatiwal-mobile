/**
 * ListingActionsSheet.stories.tsx (TASK-L863)
 *
 * Storybook stories for the seller "More" bottom sheet — covers the
 * draft/active/expired-active/reserved/sold row sets and light/dark/RTL.
 */
import React, { useState } from "react";
import { View } from "react-native";
import {
  CheckCircle2,
  Clock,
  EyeOff,
  RotateCcw,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingActionsSheet, type ListingActionRow } from "./ListingActionsSheet";

const meta: Meta<typeof ListingActionsSheet> = {
  title: "Components/ListingActionsSheet",
  component: ListingActionsSheet,
};

export default meta;
type Story = StoryObj<typeof ListingActionsSheet>;

// Mirrors useListingLifecycle's moreActions for an active (non-expired) listing.
const activeActions: ListingActionRow[] = [
  { key: "sold", label: "Mark as Sold", icon: CheckCircle2, onPress: () => console.log("sold") },
  { key: "unpublish", label: "Unpublish", icon: EyeOff, onPress: () => console.log("unpublish") },
  { key: "edit", label: "Edit", icon: Pencil, onPress: () => console.log("edit") },
  { key: "duplicate", label: "Duplicate", icon: Copy, onPress: () => console.log("duplicate") },
  { key: "delete", label: "Delete", icon: Trash2, onPress: () => console.log("delete"), danger: true },
];

// Mirrors an expired-active listing — Mark sold AND Mark reserved both still reachable.
const expiredActiveActions: ListingActionRow[] = [
  { key: "sold", label: "Mark as Sold", icon: CheckCircle2, onPress: () => console.log("sold") },
  { key: "reserve", label: "Mark as Reserved", icon: Clock, onPress: () => console.log("reserve") },
  { key: "unpublish", label: "Unpublish", icon: EyeOff, onPress: () => console.log("unpublish") },
  { key: "edit", label: "Edit", icon: Pencil, onPress: () => console.log("edit") },
  { key: "duplicate", label: "Duplicate", icon: Copy, onPress: () => console.log("duplicate") },
  { key: "delete", label: "Delete", icon: Trash2, onPress: () => console.log("delete"), danger: true },
];

// Mirrors a reserved listing — Activate (undo reservation) + the evergreen trio.
const reservedActions: ListingActionRow[] = [
  { key: "activate", label: "Make active", icon: RotateCcw, onPress: () => console.log("activate") },
  { key: "edit", label: "Edit", icon: Pencil, onPress: () => console.log("edit") },
  { key: "duplicate", label: "Duplicate", icon: Copy, onPress: () => console.log("duplicate") },
  { key: "delete", label: "Delete", icon: Trash2, onPress: () => console.log("delete"), danger: true },
];

// Mirrors a sold (terminal) listing — Duplicate stays reachable even here.
const soldActions: ListingActionRow[] = [
  { key: "edit", label: "Edit", icon: Pencil, onPress: () => console.log("edit") },
  { key: "duplicate", label: "Duplicate", icon: Copy, onPress: () => console.log("duplicate") },
  { key: "delete", label: "Delete", icon: Trash2, onPress: () => console.log("delete"), danger: true },
];

function ListingActionsSheetDemo({ actions }: { actions: ListingActionRow[] }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Open More</Text>
      </Button>
      <ListingActionsSheet visible={visible} onClose={() => setVisible(false)} actions={actions} />
    </View>
  );
}

export const Active: Story = {
  render: () => <ListingActionsSheetDemo actions={activeActions} />,
};

export const ExpiredActive: Story = {
  render: () => <ListingActionsSheetDemo actions={expiredActiveActions} />,
};

export const Reserved: Story = {
  render: () => <ListingActionsSheetDemo actions={reservedActions} />,
};

export const Sold: Story = {
  render: () => <ListingActionsSheetDemo actions={soldActions} />,
};

// Pre-opened for visual inspection — light mode. ListingActionsSheet reads
// all colors from useColors(), which follows the app-wide theme store at
// runtime — no dark-specific prop needed.
export const Open: Story = {
  args: {
    visible: true,
    onClose: () => {},
    actions: activeActions,
  },
};

// Pre-opened — dark mode. Switch device/Storybook color scheme to "dark" to preview.
export const OpenDark: Story = {
  args: {
    visible: true,
    onClose: () => {},
    actions: activeActions,
  },
  parameters: {
    notes:
      "Switch device/Storybook color scheme to dark. The component reads all colors from useColors() at runtime — no dark-specific prop.",
  },
};

// Pre-opened — RTL (Pashto / Dari). Rows mirror (icon + label direction) and
// text aligns to the trailing edge; switch device/Storybook locale to 'ps' or
// 'fa' to preview.
export const OpenRtl: Story = {
  args: {
    visible: true,
    onClose: () => {},
    actions: activeActions,
  },
  parameters: {
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};

// Disabled — a mutation is already in flight; every row dims and ignores taps.
export const Disabled: Story = {
  args: {
    visible: true,
    onClose: () => {},
    actions: activeActions,
    disabled: true,
  },
};
