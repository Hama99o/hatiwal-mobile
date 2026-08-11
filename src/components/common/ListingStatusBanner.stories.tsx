/**
 * ListingStatusBanner stories — TASK-K729 review fix, MEDIUM (must fix).
 *
 * This is a shared component (`src/components/common/`) with its own two
 * documented layouts and two consumers, so per CLAUDE.md's "Mobile Testing
 * Rules" / docs/TESTING.md's "New shared component" checklist it needs its
 * own story matrix, not just Jest coverage:
 *
 *   StripReserved / StripSold        — layout="strip" (ListingDetail's
 *                                       full-bleed top banner)
 *   RowReserved / RowSold            — layout="row" (ListingUnavailableNotice's
 *                                       chat-thread card), WITH subtitle
 *   RowNoSubtitle                    — layout="row" WITHOUT a subtitle
 *   RowWithCtaChildren               — `children` (a CTA row) composed
 *                                       inside the same container
 *   RowWithCallerInset               — the `{ marginHorizontal: 12,
 *                                       marginTop: 8 }` inset
 *                                       ListingUnavailableNotice passes as
 *                                       `style`
 *   RowPashtoRtl                     — RTL mirror (switch device/Storybook
 *                                       locale to 'ps'/'fa' — the component
 *                                       reads `isRtl` from useLocalization()
 *                                       at runtime)
 *
 * Manual QA pass required alongside this file (docs/TESTING.md's Story
 * Checklist): light mode, dark mode (toggle the OS/device scheme —
 * `useColors()` follows `useColorScheme()`), LTR, RTL.
 */
import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Search, Store } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ListingStatusBanner } from "./ListingStatusBanner";

const meta: Meta<typeof ListingStatusBanner> = {
  title: "Components/ListingStatusBanner",
  component: ListingStatusBanner,
  argTypes: {
    status: { control: "select", options: ["reserved", "sold"] },
    layout: { control: "select", options: ["strip", "row"] },
  },
};

export default meta;
type Story = StoryObj<typeof ListingStatusBanner>;

// ── layout="strip" — ListingDetail's full-bleed top banner ─────────────────

export const StripReserved: Story = {
  args: {
    status: "reserved",
    title: "This item is reserved",
    layout: "strip",
  },
};

export const StripSold: Story = {
  args: {
    status: "sold",
    title: "This item has been sold",
    layout: "strip",
  },
};

// ── layout="row" — ListingUnavailableNotice's chat-thread card ─────────────

export const RowReserved: Story = {
  args: {
    status: "reserved",
    title: "Reserved",
    subtitle: "The seller has reserved this item for a buyer.",
    layout: "row",
  },
};

export const RowSold: Story = {
  args: {
    status: "sold",
    title: "Sold",
    subtitle: "This item has been sold.",
    layout: "row",
  },
};

// No reason line — e.g. a caller that only ever passes a headline.
export const RowNoSubtitle: Story = {
  args: {
    status: "reserved",
    title: "Reserved",
    layout: "row",
  },
};

// `children` (ListingUnavailableNotice's own recovery CTA row) composed
// inside the SAME container — proves the surface holds arbitrary content
// (buttons, not just text) without the fix's colors.card surface swallowing
// their own contrast.
export const RowWithCtaChildren: Story = {
  args: {
    status: "sold",
    title: "Sold",
    subtitle: "This item has been sold.",
    layout: "row",
  },
  render: (args) => (
    <ListingStatusBanner {...args}>
      <View style={{ flexDirection: "column", gap: 8, marginTop: 8 }}>
        <Button variant="default">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Search size={14} color="white" />
            <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
              Browse similar
            </Text>
          </View>
        </Button>
        <Button variant="outline">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Store size={14} />
            <Text style={{ fontSize: 12, fontWeight: "600" }}>View their listings</Text>
          </View>
        </Button>
      </View>
    </ListingStatusBanner>
  ),
};

// The exact `{ marginHorizontal: 12, marginTop: 8 }` inset
// ListingUnavailableNotice passes as `style` — TASK-K729 (review fix,
// MEDIUM — layout): without caller-owned outer spacing, `layout="row"`
// (a direct child of a flex:1, zero-padding screen root) stretched
// edge-to-edge, its side borders sat on the screen edges (clipped-looking
// corners) and its top border doubled up on ListingHeader's own hairline.
// The grey backdrop below stands in for that screen root so the inset is
// visible.
export const RowWithCallerInset: Story = {
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#e5e7eb", margin: -16 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    status: "reserved",
    title: "Reserved",
    subtitle: "The seller has reserved this item for a buyer.",
    layout: "row",
    style: { marginHorizontal: 12, marginTop: 8 },
  },
};

// RTL — switch device/Storybook locale to 'ps' or 'fa' to see the mirror;
// the component reads `isRtl` from useLocalization() at runtime (same
// pattern as ListingActionsSheet.stories.tsx's OpenRtl).
export const RowPashtoRtl: Story = {
  args: {
    status: "sold",
    title: "وپلورل شو",
    subtitle: "دا توکی خرید شوی دی.",
    layout: "row",
  },
};
