/**
 * ListingFormSkeleton.stories.tsx — TASK-P736 (review fix, CR round 3).
 *
 * Pure presentational loading state — no props, no data. Covers light/dark
 * (via the shared DarkSurface decorator convention used elsewhere, e.g.
 * PublishSuccessSheet.stories.tsx) and RTL (Pashto/Dari — the component
 * reads `isRtl` from `useLocalization()` at runtime, so switch the device/
 * Storybook locale to see the row-reverse mirror on the Photos/Currency/
 * Condition skeleton rows).
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingFormSkeleton } from "./ListingFormSkeleton";

const meta: Meta<typeof ListingFormSkeleton> = {
  title: "Seller/ListingFormSkeleton",
  component: ListingFormSkeleton,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingFormSkeleton>;

// ─── Default (light) ───────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Dark mode — dark background container (same convention as
// PublishSuccessSheet.stories.tsx's DarkSurface; the Skeleton pulse reads
// colors from useColors() live, so this verifies contrast on a dark surface) ──

export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <ListingFormSkeleton />
    </View>
  ),
};

// ─── RTL locale (Pashto / Dari) — Photos/Currency/Condition rows mirror ──────

export const RTLLocale: Story = {
  render: () => (
    <View style={{ direction: "rtl", padding: 16 }}>
      <ListingFormSkeleton />
    </View>
  ),
  parameters: {
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};
