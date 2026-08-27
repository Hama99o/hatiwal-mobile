/**
 * BuyerPickerSheet.stories.tsx (TASK-TX01)
 *
 * Storybook stories for the buyer-picker slide-up modal shown when a seller
 * reserves or marks a listing sold. Requires a live/mocked `/conversations`
 * endpoint to populate rows — in Storybook this simply shows the sheet UI
 * (loading/empty rows depend on the QueryClient's cache).
 */

import React, { useState } from "react";
import { View } from "react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import i18n from "@/i18n";
import { BuyerPickerSheet } from "./BuyerPickerSheet";

// Real remote thumbnail — the picsum.photos placeholder service used
// elsewhere in this repo's stories — so the confirm-mode thumbnail (the
// 44→60px hierarchy fix, and the sheet's own photo-first element) is
// exercised with an actual photo in at least one story, not just
// `listingThumbnailUrl={null}`.
const SAMPLE_THUMBNAIL = "https://picsum.photos/seed/hatiwal-carpet/240/240";

const meta: Meta<typeof BuyerPickerSheet> = {
  title: "Components/BuyerPickerSheet",
  component: BuyerPickerSheet,
};

export default meta;
type Story = StoryObj<typeof BuyerPickerSheet>;

const queryClient = new QueryClient();

function BuyerPickerSheetDemo({ action }: { action: "reserve" | "sold" }) {
  const [visible, setVisible] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ padding: 24, alignItems: "center" }}>
        <Button onPress={() => setVisible(true)}>
          <Text>Open Buyer Picker ({action})</Text>
        </Button>
        <BuyerPickerSheet
          visible={visible}
          onClose={() => setVisible(false)}
          listingId={1}
          price={25000}
          currency="AFN"
          action={action}
          onConfirm={() => setVisible(false)}
        />
      </View>
    </QueryClientProvider>
  );
}

export const Reserve: Story = {
  render: () => <BuyerPickerSheetDemo action="reserve" />,
};

export const Sold: Story = {
  render: () => <BuyerPickerSheetDemo action="sold" />,
};

export const OpenReserve: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={25000}
        currency="AFN"
        action="reserve"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

/**
 * TASK-O947 (cycle-4 design review) confirm mode — `preselectedBuyer` set.
 * Listing thumb + locked buyer identity + PriceTag + the confirmation
 * sentence, no conversation list, no "someone else" skip, no editable price.
 *
 * Review fix (MEDIUM, VISUAL TEST SURFACE OUT OF DATE) — this story used to
 * pass the PRE-FIX copy (`confirmTitle`/`confirmBody` baked a price into the
 * title and repeated it in the body); it now matches the SHIPPED en strings
 * built by `buildReserveAfterAcceptPrompt` (reserveAfterAccept.ts) —
 * title names only the buyer, body carries only the consequence. Also now
 * passes a REAL thumbnail + `verified`/`city` so the 44→60px photo-first
 * hierarchy fix and the trust badge/subtitle are exercised somewhere in LTR
 * (previously only the RTL story below set them).
 */
export const OpenConfirmMode: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={24000}
        currency="AFN"
        action="reserve"
        preselectedBuyer={{ id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true, city: "Kandahar" }}
        listingThumbnailUrl={SAMPLE_THUMBNAIL}
        listingTitle="Traditional Kandahari Carpet 3x4"
        confirmTitle="Reserve for Ahmad Karimi?"
        confirmBody="Other buyers can still message you, and the listing will show as Reserved."
        cancelLabel="Not now"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// Review fix (MEDIUM, ERROR FEEDBACK INVISIBLE ON ANDROID) — the inline
// `errorMessage` slot rendered above the footer, added specifically because
// the sheet's own <Modal> occludes sonner-native's error toast on Android.
export const OpenConfirmModeError: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={24000}
        currency="AFN"
        action="reserve"
        preselectedBuyer={{ id: 42, name: "Ahmad Karimi", avatarUrl: null }}
        listingThumbnailUrl={SAMPLE_THUMBNAIL}
        listingTitle="Traditional Kandahari Carpet 3x4"
        confirmTitle="Reserve for Ahmad Karimi?"
        confirmBody="Other buyers can still message you, and the listing will show as Reserved."
        cancelLabel="Not now"
        errorMessage="Something went wrong reserving this listing. Please try again."
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// Review fix (LOW, VISUAL TEST GAP) — this story previously only hardcoded
// Pashto STRING PROPS while the app's i18n language stayed the Storybook
// default (English/LTR) — but every mirror decision in the component
// (`textAlign`, `flexDirection`, `alignItems`) reads `isRtl` from
// `useLocalization()` at RUNTIME, not from the props. So the one thing this
// story was named for — the RTL mirror — never actually rendered; you had to
// switch the device/Storybook locale by hand. The decorator below forces
// `i18n` to Pashto for real (same pattern as PriceDropBadge.stories.tsx's
// `SavedPriceDroppedRTL`), so the mirror is visible without any manual step.
// Also covers a long buyer name (wraps, never truncates the price) and a
// null listing thumbnail (the RemoteImage placeholder, not a broken image).
export const OpenConfirmModeRtl: Story = {
  decorators: [
    (Story) => {
      i18n.changeLanguage("ps");
      return <Story />;
    },
  ],
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={24000}
        currency="AFN"
        action="reserve"
        preselectedBuyer={{
          id: 42,
          name: "احمد ولي محمد کریمي زی",
          avatarUrl: null,
          verified: true,
          city: "کندهار",
        }}
        listingThumbnailUrl={null}
        listingTitle="د کندهار دستي فرش ۳x۴ متره"
        confirmTitle="د احمد ولي محمد کریمي زی لپاره خوندي کړئ؟"
        confirmBody="نور پیرودونکي لا هم تاسو ته پیغام لیکلی شي، او اعلان به د خوندي شوي په توګه ښکاره شي."
        cancelLabel="اوس نه"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

export const OpenConfirmModeSubmitting: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={24000}
        currency="AFN"
        action="reserve"
        preselectedBuyer={{ id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true, city: "Kandahar" }}
        listingThumbnailUrl={SAMPLE_THUMBNAIL}
        listingTitle="Traditional Kandahari Carpet 3x4"
        confirmTitle="Reserve for Ahmad Karimi?"
        confirmBody="Other buyers can still message you, and the listing will show as Reserved."
        cancelLabel="Not now"
        isSubmitting
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// ── Multi-quantity: "how many did you sell?" ─────────────────────────────────
// Only ever rendered when action="sold"/"reserve" AND more than one unit is
// left. On a single-unit listing the sheet is byte-for-byte what it is today
// — the spike's governing rule is that the seller of one carpet answers no
// new questions.
//
// Pre-filled with ONE unit, not the whole remainder — see the field's own
// `quantityText` doc in BuyerPickerSheet.tsx for why (a seller reported
// selling one item from a batch of 50 and watching the listing retire itself
// with "0 of 50 left"). Selling out is now a deliberate typed choice.
export const OpenSoldMultiUnit: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={14000}
        currency="AFN"
        action="sold"
        remainingQuantity={15}
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// The last two of a batch — the sale that will retire the listing (only if
// the seller explicitly types "2").
export const OpenSoldLastUnits: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={14000}
        currency="AFN"
        action="sold"
        remainingQuantity={2}
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// SF-B2/SF-M2 (Sell Flow Redesign): reserving a multi-unit listing now asks
// "how many are you holding?" too — mirroring the sold path field-for-field.
// Held units stay advisory (never subtracted from `available_units`).
export const OpenReserveMultiUnit: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={14000}
        currency="AFN"
        action="reserve"
        remainingQuantity={15}
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

// SF-M2 — the chat-initiated confirm-mode flow: "Mark sold" from
// ListingHeader, or "Place a hold" from ComposerActionsSheet's "+" menu, on a
// multi-unit listing. The buyer is already known (no picker), but the
// quantity field still appears — "how many are you holding/selling for
// Ahmad?" — feeding the reserve/sold call's optional `quantity`.
export const OpenConfirmModeMultiUnitSold: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={14000}
        currency="AFN"
        action="sold"
        remainingQuantity={15}
        preselectedBuyer={{ id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true, city: "Kandahar" }}
        listingThumbnailUrl={SAMPLE_THUMBNAIL}
        listingTitle="Box of 15 hand-woven coasters"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};

export const OpenConfirmModeMultiUnitHold: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <BuyerPickerSheet
        visible
        onClose={() => {}}
        listingId={1}
        price={14000}
        currency="AFN"
        action="reserve"
        remainingQuantity={15}
        preselectedBuyer={{ id: 42, name: "Ahmad Karimi", avatarUrl: null, verified: true, city: "Kandahar" }}
        listingThumbnailUrl={SAMPLE_THUMBNAIL}
        listingTitle="Box of 15 hand-woven coasters"
        confirmTitle="Place a hold for Ahmad Karimi?"
        onConfirm={() => {}}
      />
    </QueryClientProvider>
  ),
};
