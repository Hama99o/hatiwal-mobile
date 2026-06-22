import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingCard } from "./ListingCard";
import { action } from "@storybook/addon-actions";
import type { Listing } from "@/api/listings";

// Minimal listing fixture factory
const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  title: "Lenovo ThinkPad X1 Carbon — excellent condition",
  description: "Used for 6 months. No scratches. Comes with charger.",
  price: 85000,
  currency: "AFN",
  status: "active",
  categoryId: 1,
  location: "Kabul, Share Naw",
  address: null,
  latitude: null,
  longitude: null,
  thumbnailUrl: "https://picsum.photos/seed/laptop/400/300",
  viewsCount: 24,
  isViewed: false,
  createdAt: "2024-01-10T08:00:00Z",
  updatedAt: "2024-01-10T08:00:00Z",
  seller: {
    id: 42,
    name: "Ahmad Karimi",
    city: "Kabul",
    verified: true,
    avatarUrl: null,
  },
  category: {
    id: 1,
    nameEn: "Electronics",
    namePs: "برقی توکي",
    nameFa: "الکترونیک",
    slug: "electronics",
  },
  ...overrides,
});

const meta: Meta<typeof ListingCard> = {
  title: "Components/ListingCard",
  component: ListingCard,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, maxWidth: 320 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingCard>;

export const Default: Story = {
  args: {
    listing: makeListing(),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const Saved: Story = {
  args: {
    listing: makeListing(),
    showStatus: false,
    isSaved: true,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const Unsaved: Story = {
  args: {
    listing: makeListing(),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const NoHeart: Story = {
  args: {
    listing: makeListing(),
    showStatus: false,
    // isSaved undefined → heart is hidden
    onPress: action("card-pressed"),
  },
};

export const ShowStatusActive: Story = {
  args: {
    listing: makeListing({ status: "active" }),
    showStatus: true,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const ShowStatusDraft: Story = {
  args: {
    listing: makeListing({ status: "draft" }),
    showStatus: true,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const ShowStatusReserved: Story = {
  args: {
    listing: makeListing({ status: "reserved" }),
    showStatus: true,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const ShowStatusSold: Story = {
  args: {
    listing: makeListing({ status: "sold" }),
    showStatus: true,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const NoPhoto: Story = {
  args: {
    listing: makeListing({ thumbnailUrl: null }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const LongTitle: Story = {
  args: {
    listing: makeListing({
      title: "Samsung Galaxy S24 Ultra 512GB Phantom Black — mint condition, never dropped, with original box, charger, and all accessories",
    }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const Viewed: Story = {
  args: {
    listing: makeListing({ isViewed: true }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const NoLocation: Story = {
  args: {
    listing: makeListing({ location: null }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

// Side-by-side grid (two columns) as it appears in Browse
export const TwoColumnGrid: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ListingCard
              listing={makeListing({ id: 1 })}
              isSaved={true}
              onSaveToggle={action("save")}
              onPress={action("press")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ListingCard
              listing={makeListing({ id: 2, thumbnailUrl: null, status: "reserved" })}
              showStatus={true}
              isSaved={false}
              onSaveToggle={action("save")}
              onPress={action("press")}
            />
          </View>
        </View>
      </View>
    ),
  ],
  render: () => <></>,
};

// ── List variant stories ──────────────────────────────────────────────────────

export const ListVariantDefault: Story = {
  args: {
    listing: makeListing(),
    variant: "list",
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export const ListVariantSaved: Story = {
  args: {
    listing: makeListing(),
    variant: "list",
    showStatus: false,
    isSaved: true,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export const ListVariantWithStatus: Story = {
  args: {
    listing: makeListing({ status: "reserved" }),
    variant: "list",
    showStatus: true,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export const ListVariantNoPhoto: Story = {
  args: {
    listing: makeListing({ thumbnailUrl: null }),
    variant: "list",
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export const ListVariantViewed: Story = {
  args: {
    listing: makeListing({ isViewed: true }),
    variant: "list",
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

// ── Verified / unverified seller stories ─────────────────────────────────────

export const VerifiedSeller: Story = {
  args: {
    listing: makeListing({
      seller: { id: 42, name: "Ahmad Karimi", city: "Kabul", verified: true, avatarUrl: null },
    }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const UnverifiedSeller: Story = {
  args: {
    listing: makeListing({
      seller: { id: 43, name: "Nasir Shah", city: "Kabul", verified: false, avatarUrl: null },
    }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

// ── Negotiable / firm-price stories ──────────────────────────────────────────

export const FirmPrice: Story = {
  args: {
    listing: makeListing({ negotiable: false }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const NegotiableDefault: Story = {
  args: {
    listing: makeListing({ negotiable: true }),
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
};

export const FirmPriceListVariant: Story = {
  args: {
    listing: makeListing({ negotiable: false }),
    variant: "list",
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

export const VerifiedSellerListVariant: Story = {
  args: {
    listing: makeListing({
      seller: { id: 42, name: "Ahmad Karimi", city: "Kabul", verified: true, avatarUrl: null },
    }),
    variant: "list",
    showStatus: false,
    isSaved: false,
    onSaveToggle: action("save-toggle"),
    onPress: action("card-pressed"),
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16 }}>
        <Story />
      </View>
    ),
  ],
};

// Feed of list-mode cards as it appears in Browse list mode
export const ListFeed: Story = {
  decorators: [
    (Story) => (
      <View style={{ padding: 12, gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <ListingCard
            key={i}
            listing={makeListing({ id: i, title: `Item ${i} — great condition`, price: 10000 * i })}
            variant="list"
            isSaved={i === 1}
            onSaveToggle={action("save")}
            onPress={action("press")}
          />
        ))}
      </View>
    ),
  ],
  render: () => <></>,
};
