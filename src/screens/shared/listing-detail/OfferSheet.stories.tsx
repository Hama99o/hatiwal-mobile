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
