/**
 * QuantityStepper.stories.tsx (SF-M6)
 *
 * Covers every state: default size, small size, at-min (decrement disabled),
 * at-max (increment disabled), disabled, tap-to-edit, and RTL (Pashto) —
 * mirroring BuyerPickerSheet.stories.tsx's own pattern of forcing `i18n` to
 * Pashto for real via a decorator, since `isRtl` is read from
 * `useLocalization()` at runtime, not from a prop.
 */
import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { Text } from "@/components/reusables/text";
import { QuantityStepper, type QuantityStepperProps } from "./QuantityStepper";

const meta: Meta<typeof QuantityStepper> = {
  title: "Components/QuantityStepper",
  component: QuantityStepper,
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof QuantityStepper>;

// Controlled wrapper — QuantityStepper is fully controlled (value/onChange),
// so every interactive story needs local state to actually respond to taps.
function StepperWrapper(props: Omit<QuantityStepperProps, "value" | "onChange"> & { initial: number }) {
  const { initial, ...rest } = props;
  const [value, setValue] = useState(initial);
  return <QuantityStepper value={value} onChange={setValue} {...rest} />;
}

// Default — the common case: mid-range value, plenty of room either side.
export const Default: Story = {
  render: () => <StepperWrapper initial={3} max={15} />,
};

// Small size — the density used inline (e.g. BuyerPickerSheet's row).
export const Small: Story = {
  render: () => <StepperWrapper initial={3} max={15} size="sm" />,
};

// At min — decrement disabled, increment still active. Hatiwal never shows a
// "0 of something" quantity, so min defaults to 1.
export const AtMin: Story = {
  render: () => <StepperWrapper initial={1} max={15} />,
};

// At max — increment disabled. `max` is always availableUnitsOf(listing) —
// a buyer can never ask for more than what's actually left.
export const AtMax: Story = {
  render: () => <StepperWrapper initial={15} max={15} />,
};

// Only one unit ever available — both buttons disabled, matching a listing
// that is technically `multiUnit` but has exactly one left.
export const SingleUnitLeft: Story = {
  render: () => <StepperWrapper initial={1} max={1} />,
};

// Disabled — e.g. while a mutation using this value is in flight.
export const Disabled: Story = {
  render: () => <StepperWrapper initial={3} max={15} disabled />,
};

// Tap-to-edit — resolves the "14 taps to reach 15" tension: tap the number to
// type a big jump directly instead of holding "+". Interact in the Storybook
// canvas: tap "3", type a number, submit.
export const TapToEditLargeBatch: Story = {
  render: () => (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 12, opacity: 0.6 }}>
        Tap the number, type e.g. "12", then submit — clamps to max.
      </Text>
      <StepperWrapper initial={1} max={50} />
    </View>
  ),
};

// The exact copy this control renders under, on ListingDetail — never
// "Buy"/checkout framing, per docs/SELL_FLOW_REDESIGN.md §3.3.
export const AsUsedOnListingDetail: Story = {
  render: () => (
    <View style={{ gap: 6, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", opacity: 0.7 }}>
        How many are you asking about?
      </Text>
      <StepperWrapper initial={1} max={13} testID="listing-detail-quantity-stepper" />
    </View>
  ),
};

// RTL (Pashto) — forces `i18n` to `ps` for real so `useLocalization().isRtl`
// actually flips the row to row-reverse and the digits render Arabic-Indic,
// exactly like BuyerPickerSheet.stories.tsx's own `OpenConfirmModeRtl`.
export const RtlPashto: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return <Story />;
    },
  ],
  render: () => (
    <View style={{ gap: 6, alignItems: "flex-end" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", opacity: 0.7 }}>
        تاسو د څو دانو په اړه پوښتنه کوئ؟
      </Text>
      <StepperWrapper initial={3} max={15} />
    </View>
  ),
};

// All states stacked for a single-glance visual review.
export const AllStates: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("en");
      return <Story />;
    },
  ],
  render: () => (
    <View style={{ gap: 16 }}>
      <StepperWrapper initial={1} max={15} />
      <StepperWrapper initial={7} max={15} />
      <StepperWrapper initial={15} max={15} />
      <StepperWrapper initial={3} max={15} size="sm" />
      <StepperWrapper initial={3} max={15} disabled />
    </View>
  ),
};

// ── SF-M9 (FlowApp #298): atMaxReason ────────────────────────────────────────
//
// `BuyerPickerSheet` is consumer #1: the ceiling is stated, not just enforced
// — "Only 15 left. Edit the listing if you have more." — the moment the
// seller reaches it (never before, and never while mid-edit). Optional: every
// OTHER consumer that never passes it (SaleRowEditSheet, ListingDetail as of
// this ticket) renders exactly as before.

export const AtCapWithReason: Story = {
  render: () => (
    <View style={{ gap: 6, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", opacity: 0.7 }}>How many did you sell?</Text>
      <StepperWrapper initial={15} max={15} atMaxReason="Only 15 left. Edit the listing if you have more." />
    </View>
  ),
};

// Dark surface — verifies useColors() tokens (no hardcoded colors), same
// convention as PriceDropBadge.stories.tsx's own dark stories.
export const AtCapWithReasonDark: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: "#0f172a" }}>
        <Story />
      </View>
    ),
  ],
  render: () => <StepperWrapper initial={15} max={15} atMaxReason="Only 15 left. Edit the listing if you have more." />,
};

// RTL (Pashto) — same real-i18n-flip pattern as `RtlPashto` above; the reason
// text itself is caller-supplied (BuyerPickerSheet's own translated string),
// so this story passes the actual Pashto copy rather than the English one.
export const AtCapWithReasonRtlPashto: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return <Story />;
    },
  ],
  render: () => (
    <View style={{ gap: 6, alignItems: "flex-end" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", opacity: 0.7 }}>څو دانې مو وپلورلې؟</Text>
      <StepperWrapper initial={15} max={15} atMaxReason="یوازې ۱۵ پاتې دي. که نور لرئ، اعلان سمول کړئ." />
    </View>
  ),
};
