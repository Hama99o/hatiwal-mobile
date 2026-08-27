/**
 * StockBadge.stories.tsx
 *
 * StockBadge shipped with SF-M1 (Sell Flow Redesign) as an extraction of
 * logic that lived inline in three places, but never got its own story or
 * test — exactly the "don't repeat code, but also don't ship a shared
 * component unverified" gap this file closes. Covers both audiences, the
 * amber low-stock threshold, the SF-M4 "held" clause (with and without a
 * buyer name), the single-item no-render case, and RTL (Pashto) — where the
 * held/progress counts must render Eastern Arabic-Indic digits.
 */
import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { Text } from "@/components/reusables/text";
import { StockBadge } from "./StockBadge";

const meta: Meta<typeof StockBadge> = {
  title: "Components/StockBadge",
  component: StockBadge,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, gap: 12, alignItems: "flex-start" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StockBadge>;

// Buyer, plenty left — plain "N in stock", muted, no progress phrasing yet.
export const BuyerPlentyInStock: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 12, heldUnits: 0 },
    audience: "buyer",
  },
};

// Buyer, running out — amber "N of M left" (isLowStock's absolute-or-20% rule).
export const BuyerLowStock: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 2, heldUnits: 0 },
    audience: "buyer",
  },
};

// Buyer, a hold is open — "N available · M held", never a name (public payload).
export const BuyerWithHeld: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 },
    audience: "buyer",
  },
};

// Owner, nothing sold yet — plain count, not "15 of 15 left" (QA run-017: that
// phrasing is noise before the first sale).
export const OwnerNothingSoldYet: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 15, heldUnits: 0 },
    audience: "owner",
  },
};

// Owner, some sold — progress phrasing kicks in immediately (unlike buyer).
export const OwnerSomeSold: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 8, heldUnits: 0 },
    audience: "owner",
  },
};

// Owner, a hold is open WITH a known buyer name — "N held for Ahmad".
export const OwnerHeldWithBuyerName: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 },
    audience: "owner",
    heldBuyerName: "Ahmad Karimi",
  },
};

// Owner, a hold is open but the buyer name isn't known (legacy row) — falls
// back to the nameless phrasing instead of throwing/rendering "undefined".
export const OwnerHeldWithoutBuyerName: Story = {
  args: {
    listing: { multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 },
    audience: "owner",
  },
};

// The governing rule: a single-item listing renders NOTHING, for either
// audience — `hasStockToShow` gates on the server's own `multiUnit` flag.
export const SingleItemRendersNull: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, opacity: 0.6 }}>
        Nothing renders below this line — that is the correct, byte-identical
        behaviour for a single-item listing.
      </Text>
      <StockBadge listing={{ multiUnit: false, quantity: 1, availableUnits: 1 }} audience="buyer" />
      <StockBadge listing={{ multiUnit: false, quantity: 1, availableUnits: 0 }} audience="owner" />
    </View>
  ),
};

// RTL (Pashto) — forces `i18n` to `ps` for real, mirroring
// QuantityStepper.stories.tsx's own pattern, so both the badge alignment and
// every interpolated count (available/total/held) render Eastern
// Arabic-Indic digits, not Western ones.
export const RtlPashtoWithHeld: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return <Story />;
    },
  ],
  render: () => (
    <View style={{ alignItems: "flex-end", gap: 8, width: "100%" }}>
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }}
        audience="owner"
        heldBuyerName="احمد کریمي"
      />
    </View>
  ),
};

// All states stacked for a single-glance visual review (light/dark toggle is
// the device/simulator scheme — useColors() follows it reactively).
export const AllStates: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return <Story />;
    },
  ],
  render: () => (
    <View style={{ gap: 12 }}>
      <StockBadge listing={{ multiUnit: true, quantity: 15, availableUnits: 12 }} audience="buyer" />
      <StockBadge listing={{ multiUnit: true, quantity: 15, availableUnits: 2 }} audience="buyer" />
      <StockBadge listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }} audience="buyer" />
      <StockBadge listing={{ multiUnit: true, quantity: 15, availableUnits: 15 }} audience="owner" />
      <StockBadge listing={{ multiUnit: true, quantity: 15, availableUnits: 8 }} audience="owner" />
      <StockBadge
        listing={{ multiUnit: true, quantity: 15, availableUnits: 10, heldUnits: 3 }}
        audience="owner"
        heldBuyerName="Ahmad Karimi"
      />
    </View>
  ),
};
