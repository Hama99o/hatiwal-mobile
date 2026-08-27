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
 *   RowSoldNoBadge / RowReservedNoBadge — `showBadge={false}` (TASK-K729
 *                                       review fix, MUST-FIX): the state
 *                                       ACTUALLY used in production —
 *                                       ListingUnavailableNotice always
 *                                       passes `showBadge={false}` because
 *                                       Conversation.tsx's `ListingHeader`
 *                                       already renders a `StatusBadge`
 *                                       beside the listing title immediately
 *                                       above this banner; a second, identical
 *                                       pill here would be a third
 *                                       restatement of the same fact. These
 *                                       stories prove the pill-less variant
 *                                       still reads clearly — the leading
 *                                       accent edge + bold headline alone —
 *                                       in both light and dark.
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

// SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.2.1/§5.3) — ListingDetail.tsx's new
// call site: the reserved strip banner is KEPT (the ribbon), but now carries
// a second line explaining WHY the buyer can still message a listing that
// visibly says "Reserved". `layout="strip"` had no `subtitle` consumer
// before this ticket — this is the first story covering that combination.
export const StripReservedWithNote: Story = {
  args: {
    status: "reserved",
    title: "This item is reserved",
    subtitle: "The seller may still reply if the reservation falls through.",
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

// `showBadge={false}` — the state ACTUALLY used in production (TASK-K729
// review fix, MUST-FIX). ListingUnavailableNotice always passes this because
// Conversation.tsx's `ListingHeader` (the pinned card ~8px above this banner)
// already renders a `StatusBadge` beside the listing title for EVERY viewer —
// a second, identical pill here would be a THIRD restatement of the same
// status (the headline itself, e.g. "Item sold", already restates it once).
// Without its own story, this caller-relevant variant was only reachable via
// Jest assertions, not a visually-verifiable Storybook state — check both
// light and dark here.
export const RowSoldNoBadge: Story = {
  args: {
    status: "sold",
    title: "Item sold",
    subtitle: "This item has been sold.",
    layout: "row",
    showBadge: false,
  },
};

export const RowReservedNoBadge: Story = {
  args: {
    status: "reserved",
    title: "Reserved for you",
    subtitle: "The seller has reserved this item for you.",
    layout: "row",
    showBadge: false,
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
