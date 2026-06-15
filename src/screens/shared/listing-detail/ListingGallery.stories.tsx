import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingGallery } from "./ListingGallery";

const PHOTOS = [
  "https://picsum.photos/seed/gallery1/800/600",
  "https://picsum.photos/seed/gallery2/800/600",
  "https://picsum.photos/seed/gallery3/800/600",
  "https://picsum.photos/seed/gallery4/800/600",
];

const meta: Meta<typeof ListingGallery> = {
  title: "Listings/ListingGallery",
  component: ListingGallery,
  argTypes: {
    aspectRatio: { control: "number" },
  },
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#111" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingGallery>;

// No photos — shows camera placeholder + "No photo" text
export const NoPhotos: Story = {
  args: { photos: [] },
};

// Single photo — no dots or counter shown
export const SinglePhoto: Story = {
  args: { photos: [PHOTOS[0]] },
};

// Two photos — swipeable, dots visible
export const TwoPhotos: Story = {
  args: { photos: [PHOTOS[0], PHOTOS[1]] },
};

// Four photos — full dot row + counter badge
export const FourPhotos: Story = {
  args: { photos: PHOTOS },
};

// Square aspect ratio (1:1)
export const SquareRatio: Story = {
  args: { photos: PHOTOS, aspectRatio: 1 },
};

// Wide aspect ratio (16:9)
export const WideRatio: Story = {
  args: { photos: PHOTOS, aspectRatio: 16 / 9 },
};

// Default 4:3 with all four photos — tap any photo to open fullscreen modal
export const WithFullscreenModal: Story = {
  args: { photos: PHOTOS, aspectRatio: 4 / 3 },
};
