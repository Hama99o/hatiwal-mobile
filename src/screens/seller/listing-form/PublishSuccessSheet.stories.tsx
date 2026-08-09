/**
 * PublishSuccessSheet.stories.tsx — TASK-J952.
 *
 * Covers: default (interactive open via button), pre-opened for visual
 * inspection, a listing with no photo (blurhash placeholder), dark mode
 * (dark background wrapper — same convention as CategoryPicker.stories.tsx),
 * and RTL locale (Pashto/Dari layout mirror).
 *
 * Pattern matches OfferSheet.stories.tsx / MeetupSheet.stories.tsx —
 * interactive wrapper for the open-from-button demo, plus direct-arg
 * stories for visual inspection.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import type { Listing } from "@/api/listings";
import { PublishSuccessSheet } from "./PublishSuccessSheet";

const MOCK_LISTING: Listing = {
  id: 501,
  title: "Lenovo ThinkPad X1 Carbon — Core i7, 16GB RAM",
  description: "Excellent condition, comes with charger.",
  price: 45000,
  currency: "AFN",
  condition: "good",
  status: "active",
  categoryId: 3,
  location: "Kabul, Shar-e-Naw",
  address: "Near the Blue Mosque",
  latitude: 34.5,
  longitude: 69.1,
  thumbnailUrl: "https://picsum.photos/seed/hatiwal-laptop/400/400",
  imageUrls: ["https://picsum.photos/seed/hatiwal-laptop/400/400"],
  images: ["https://picsum.photos/seed/hatiwal-laptop/400/400"],
  shareUrl: "https://hatiwal.example.com/l/501",
  viewsCount: 0,
  negotiable: true,
  createdAt: "2026-08-01T08:00:00Z",
  updatedAt: "2026-08-01T08:00:00Z",
  seller: { id: 1, name: "Ahmad Karimi", city: "Kabul" },
  category: { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "الکترونیک", slug: "electronics" },
};

const MOCK_LISTING_NO_PHOTO: Listing = {
  ...MOCK_LISTING,
  id: 502,
  title: "Wooden Dining Chair — Set of 4",
  thumbnailUrl: null,
  imageUrls: [],
  images: [],
};

const meta: Meta<typeof PublishSuccessSheet> = {
  title: "Seller/PublishSuccessSheet",
  component: PublishSuccessSheet,
};

export default meta;
type Story = StoryObj<typeof PublishSuccessSheet>;

// ─── Interactive demo wrapper ─────────────────────────────────────────────────

function PublishSuccessSheetDemo({ listing = MOCK_LISTING }: { listing?: Listing }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Button onPress={() => setVisible(true)}>
        <Text>Publish listing</Text>
      </Button>
      <PublishSuccessSheet visible={visible} listing={listing} onClose={() => setVisible(false)} />
    </View>
  );
}

// ─── Default — interactive, open via button ───────────────────────────────────

export const Default: Story = {
  render: () => <PublishSuccessSheetDemo />,
};

// ─── Pre-opened for visual inspection ─────────────────────────────────────────

export const Open: Story = {
  args: {
    visible: true,
    listing: MOCK_LISTING,
    onClose: () => {},
  },
};

// ─── No photo yet — blurhash placeholder tile in the summary row ─────────────

export const NoPhoto: Story = {
  args: {
    visible: true,
    listing: MOCK_LISTING_NO_PHOTO,
    onClose: () => {},
  },
};

// ─── Dark mode — dark background container (same convention as
// CategoryPicker.stories.tsx's DarkSurface; the component itself reads
// useColors() live so this verifies contrast against a dark surface) ─────────

export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <PublishSuccessSheet visible listing={MOCK_LISTING} onClose={() => {}} />
    </View>
  ),
};

// ─── RTL locale (Pashto / Dari) — layout mirrors horizontally ────────────────
// The component reads isRtl from useLocalization(); switch the device/
// Storybook locale to 'ps' or 'fa' to see the real RTL mirror at runtime.

export const RTLLocale: Story = {
  render: () => (
    <View style={{ direction: "rtl" }}>
      <PublishSuccessSheet visible listing={MOCK_LISTING} onClose={() => {}} />
    </View>
  ),
  parameters: {
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};
