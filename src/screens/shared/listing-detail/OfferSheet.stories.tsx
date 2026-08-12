/**
 * OfferSheet.stories.tsx
 *
 * Storybook stories for the OfferSheet slide-up modal.
 * Covers: default AFN sheet, USD currency variant, RTL locale (ps/fa),
 * and a disabled/invalid-input state where the submit button is inactive.
 *
 * Pattern matches MeetupSheet.stories.tsx — interactive wrapper for the
 * open-from-button demo, plus direct-arg stories for visual inspection.
 */

import React, { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { OfferSheet } from "./OfferSheet";

const meta: Meta<typeof OfferSheet> = {
  title: "Listings/OfferSheet",
  component: OfferSheet,
};

export default meta;
type Story = StoryObj<typeof OfferSheet>;

// ─── Interactive demo wrapper ─────────────────────────────────────────────────

function OfferSheetDemo({
  currency = "AFN",
  price = 25000,
  isBusy = false,
}: {
  currency?: string;
  price?: number;
  isBusy?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState("");
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Make an Offer</Text>
      </Button>
      <OfferSheet
        visible={visible}
        onClose={() => setVisible(false)}
        onSend={(offerAmount) => {
          console.log("offer sent", { offerAmount, currency });
          setVisible(false);
          setAmount("");
        }}
        offerAmount={amount}
        onChangeAmount={setAmount}
        currency={currency}
        price={price}
        isBusy={isBusy}
      />
    </View>
  );
}

// ─── Default (AFN, LTR) — interactive, open via button ───────────────────────

export const Default: Story = {
  render: () => <OfferSheetDemo currency="AFN" price={25000} />,
};

// ─── Pre-opened for visual inspection (AFN, LTR) ─────────────────────────────

export const Open: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: false,
  },
};

// ─── USD currency variant ─────────────────────────────────────────────────────

export const USDCurrency: Story = {
  render: () => <OfferSheetDemo currency="USD" price={150} />,
};

export const USDOpen: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "120",
    onChangeAmount: () => {},
    currency: "USD",
    price: 150,
    isBusy: false,
  },
};

// ─── RTL locale (Pashto / Dari) — layout mirrors horizontally ────────────────
// The component reads isRtl from useLocalization(); the decorator overrides
// that hook so Storybook can preview RTL layout without changing device language.

function OfferSheetRtlDemo() {
  const [amount, setAmount] = useState("");
  return (
    <OfferSheet
      visible={true}
      onClose={() => {}}
      onSend={(v) => console.log("rtl offer", v)}
      offerAmount={amount}
      onChangeAmount={setAmount}
      currency="AFN"
      price={18000}
      isBusy={false}
    />
  );
}

export const RTLLocale: Story = {
  render: () => <OfferSheetRtlDemo />,
  parameters: {
    // OfferSheet reads isRtl from useLocalization() at runtime.
    // To preview the RTL layout, switch the Storybook or device locale to
    // 'ps' (Pashto) or 'fa' (Dari) — both are RTL.
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};

// ─── Disabled / invalid input — submit button inactive ───────────────────────

export const EmptyAmount: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: false,
  },
};

export const BusySubmitting: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "20000",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: true,
  },
};

// ─── TASK-G083: Quick-amount chips — chips visible, none selected ─────────────
// Demonstrates the three suggestion chips (95%, 90%, 85% of asking price).
// No chip is pre-selected (offerAmount is empty).

export const WithQuickChips: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: false,
  },
};

// ─── TASK-G083: Quick-amount chips — 90% chip selected ───────────────────────
// offerAmount already matches the 90% chip value (22500), so that chip renders
// in its selected/highlighted state.

export const WithChipSelected: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "22500",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: false,
  },
};

// ─── TASK-G083: Quick-amount chips hidden — isBusy = true ────────────────────
// When an offer submission is in flight, chips are hidden (same as BusySubmitting
// above but explicitly named to document the TASK-G083 isBusy-hides-chips rule).

export const ChipsHiddenWhenBusy: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "22500",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 25000,
    isBusy: true,
  },
};

// ─── mode="counter" — folded in from the former CounterOfferSheet (TASK-C381) ─
// Same sheet, role-neutral counter copy: no chips, a "previous offer"
// reference line instead of "listed price", prefilled with the amount being
// responded to (mirrors handleOpenCounterSheet in Conversation.tsx).

export const CounterMode: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "9500",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 8000, // the offer/counter being responded to
    isBusy: false,
    mode: "counter",
  },
};

export const CounterModeInvalidAmount: Story = {
  args: {
    visible: true,
    onClose: () => {},
    onSend: () => {},
    offerAmount: "0",
    onChangeAmount: () => {},
    currency: "AFN",
    price: 8000,
    isBusy: false,
    mode: "counter",
  },
};

function OfferSheetCounterDemo() {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState("9500");
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Counter</Text>
      </Button>
      <OfferSheet
        visible={visible}
        onClose={() => setVisible(false)}
        onSend={(counterAmount) => {
          console.log("counter sent", { counterAmount });
          setVisible(false);
        }}
        offerAmount={amount}
        onChangeAmount={setAmount}
        currency="AFN"
        price={8000}
        isBusy={false}
        mode="counter"
      />
    </View>
  );
}

export const CounterModeInteractive: Story = {
  render: () => <OfferSheetCounterDemo />,
};
