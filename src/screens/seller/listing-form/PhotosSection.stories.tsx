/**
 * PhotosSection.stories.tsx — TASK-P736 (review fix, test coverage).
 *
 * Covers: empty state, 1 photo (Cover badge), a mid-strip selection (reorder
 * hint), the max-photos cap (no "+" tile), the destructive `error` state in
 * both the empty AND with-photos layouts, dark mode, and RTL (Pashto/Dari —
 * Cover badge / ✕ / ★ corner-anchoring mirrors).
 *
 * Interactive: every story is wrapped so `onChange` updates local state,
 * matching ListingForm's own usage, so add/remove/reorder can be exercised
 * live in Storybook, not just screenshotted.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { PhotosSection, PhotoItem } from "./PhotosSection";

const PHOTO_1: PhotoItem = { uri: "https://picsum.photos/seed/hatiwal-photo-1/400/400", isRemote: true };
const PHOTO_2: PhotoItem = { uri: "https://picsum.photos/seed/hatiwal-photo-2/400/400", isRemote: true };
const PHOTO_3: PhotoItem = { uri: "https://picsum.photos/seed/hatiwal-photo-3/400/400", isRemote: true };

function PhotosSectionDemo({
  initialPhotos = [],
  maxPhotos,
  error,
}: {
  initialPhotos?: PhotoItem[];
  maxPhotos?: number;
  error?: string;
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  return (
    <View style={{ padding: 16 }}>
      <PhotosSection photos={photos} onChange={setPhotos} maxPhotos={maxPhotos} error={photos.length > 0 ? undefined : error} />
    </View>
  );
}

const meta: Meta<typeof PhotosSection> = {
  title: "Seller/PhotosSection",
  component: PhotosSection,
};

export default meta;
type Story = StoryObj<typeof PhotosSection>;

// ─── Empty — dashed "Add Photos" card ─────────────────────────────────────────

export const Empty: Story = {
  render: () => <PhotosSectionDemo />,
};

// ─── One photo — Cover badge on the only thumb ────────────────────────────────

export const OnePhoto: Story = {
  render: () => <PhotosSectionDemo initialPhotos={[PHOTO_1]} />,
};

// ─── Several photos — Cover badge on the first, ★/✕ on the rest, "+" tile ────

export const MultiplePhotos: Story = {
  render: () => <PhotosSectionDemo initialPhotos={[PHOTO_1, PHOTO_2, PHOTO_3]} />,
};

// ─── Max photos reached — no "+" add tile ─────────────────────────────────────

export const MaxPhotosReached: Story = {
  render: () => <PhotosSectionDemo initialPhotos={[PHOTO_1, PHOTO_2, PHOTO_3]} maxPhotos={3} />,
};

// ─── Error — TASK-P736's photo-required destructive state, empty layout ─────

export const ErrorEmpty: Story = {
  render: () => <PhotosSectionDemo error="Add at least one photo" />,
};

// ─── Error — TASK-P736's "live" listing photo-required state, with-photos
// layout (reachable only transiently — see PhotosSection.tsx's own comment
// on why "photos exist AND error" is otherwise unreachable in the real app) ──

export const ErrorWithPhotos: Story = {
  args: {
    photos: [PHOTO_1, PHOTO_2],
    onChange: () => {},
    error: "This listing needs at least one photo to stay live",
  },
};

// ─── Dark mode — dark background container (same convention as
// PublishSuccessSheet.stories.tsx's DarkSurface) ──────────────────────────────

export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <PhotosSectionDemo initialPhotos={[PHOTO_1, PHOTO_2, PHOTO_3]} />
    </View>
  ),
};

// ─── RTL locale (Pashto / Dari) — Cover badge / ✕ / ★ corner-anchoring
// mirrors. The component reads isRtl from useLocalization() at runtime;
// switch the device/Storybook locale to 'ps' or 'fa' to see the real mirror. ──

export const RTLLocale: Story = {
  render: () => (
    <View style={{ direction: "rtl" }}>
      <PhotosSectionDemo initialPhotos={[PHOTO_1, PHOTO_2, PHOTO_3]} />
    </View>
  ),
  parameters: {
    notes:
      "Switch device/Storybook locale to 'ps' or 'fa' to see the RTL mirror. The component reads isRtl from useLocalization() at runtime.",
  },
};
