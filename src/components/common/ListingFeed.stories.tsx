/**
 * ListingFeed stories
 *
 * ListingFeed is the single source of truth for listing-card rendering across
 * Browse, MyListings, and UserProfile. It wraps UniversalList and chooses
 * grid vs list rendering based on the viewMode prop.
 *
 * Stories cover:
 *   GridMode         — 2-column grid with real Afghan listing fixtures
 *   ListMode         — single-column list view
 *   EmptyState       — fetcher returns zero items (with title, description, action)
 *   WithStatus       — showStatus=true exposes status badges (seller view)
 *   Saved            — savedMap with pre-saved items, heart icons visible
 *   CustomRenderItem — renderListItem override (simulates SellerListingCard in list mode)
 *   WithHeader       — ListHeaderComponent (browse search bar above the feed)
 *   Loading          — fetcher never resolves — skeleton visible indefinitely
 *
 * Usage in Storybook:
 *   Components / ListingFeed / GridMode
 *   Components / ListingFeed / ListMode
 *   Components / ListingFeed / EmptyState
 *   Components / ListingFeed / WithStatus
 *   Components / ListingFeed / Saved
 *   Components / ListingFeed / CustomRenderItem
 *   Components / ListingFeed / WithHeader
 *   Components / ListingFeed / Loading
 */

import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { action } from "@storybook/addon-actions";
import { Package, Search, Heart } from "lucide-react-native";
import type { ListRenderItemInfo } from "@shopify/flash-list";

import { ListingFeed } from "./ListingFeed";
import type { ListingFeedProps } from "./ListingFeed";
import type { Listing } from "@/api/listings";
import type { ListFetchResult, ListQuery } from "./UniversalList";
import { useColors } from "@/hooks/useColors";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
  isSaved: false,
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

/** 8 diverse Afghan marketplace listings for realistic stories */
const SAMPLE_LISTINGS: Listing[] = [
  makeListing({ id: 1, title: "Samsung Galaxy S24 Ultra 512GB", price: 120000, location: "Kabul, Wazir Akbar Khan", thumbnailUrl: "https://picsum.photos/seed/phone/400/300" }),
  makeListing({ id: 2, title: "Toyota Corolla 2019 — full option", price: 1800000, currency: "AFN", location: "Mazar-e-Sharif", thumbnailUrl: "https://picsum.photos/seed/car/400/300", category: { id: 2, nameEn: "Vehicles", namePs: "موترونه", nameFa: "وسایل نقلیه", slug: "vehicles" }, categoryId: 2 }),
  makeListing({ id: 3, title: "Nike Air Max 270 — size 42", price: 18000, location: "Herat, Shahr-e-Now", thumbnailUrl: "https://picsum.photos/seed/shoes/400/300", category: { id: 3, nameEn: "Clothes", namePs: "جامې", nameFa: "لباس", slug: "clothes" }, categoryId: 3 }),
  makeListing({ id: 4, title: "Handmade Afghan Carpet 3×2m", price: 45000, location: "Kandahar", thumbnailUrl: "https://picsum.photos/seed/carpet/400/300", isViewed: true }),
  makeListing({ id: 5, title: "Apple MacBook Pro M3 14\" — mint", price: 220000, location: "Kabul, Qala-e-Fatullah", thumbnailUrl: "https://picsum.photos/seed/mac/400/300" }),
  makeListing({ id: 6, title: "Refrigerator Samsung — 400L", price: 32000, location: "Jalalabad", thumbnailUrl: null }),
  makeListing({ id: 7, title: "Sofa Set — 7 piece, good condition", price: 28000, location: "Kabul, Khair Khana", thumbnailUrl: "https://picsum.photos/seed/sofa/400/300", isSaved: true }),
  makeListing({ id: 8, title: "Dell XPS 15 — used 4 months", price: 95000, location: "Kabul, Shar-e-Naw", thumbnailUrl: "https://picsum.photos/seed/dell/400/300", status: "reserved" }),
];

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const populatedFetcher = (_query: ListQuery): Promise<ListFetchResult<Listing>> =>
  Promise.resolve({
    items: SAMPLE_LISTINGS,
    totalCount: SAMPLE_LISTINGS.length,
    totalPages: 1,
    currentPage: 1,
  });

const emptyFetcher = (_query: ListQuery): Promise<ListFetchResult<Listing>> =>
  Promise.resolve({ items: [], totalCount: 0, totalPages: 1, currentPage: 1 });

const loadingFetcher = (_query: ListQuery): Promise<ListFetchResult<Listing>> =>
  new Promise(() => {}); // never resolves

// ─── Default story args ───────────────────────────────────────────────────────

const defaultArgs: ListingFeedProps = {
  id: "story-feed",
  viewMode: "grid",
  fetcher: populatedFetcher,
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ListingFeed> = {
  title: "Components/ListingFeed",
  component: ListingFeed,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <Story />
      </View>
    ),
  ],
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof ListingFeed>;

// ─── 1. Grid mode ─────────────────────────────────────────────────────────────

/**
 * Grid mode — 2-column layout.
 *
 * This is the default Browse view. Each listing occupies half the screen width.
 * Photo-first cards with price, title, and location visible at a glance.
 * Verify: two columns, photos render, price tags visible, heart hidden (no savedMap).
 */
export const GridMode: Story = {
  args: {
    id: "story-grid",
    viewMode: "grid",
    fetcher: populatedFetcher,
    skeletonCount: 6,
    contentPaddingBottom: 20,
  },
};

// ─── 2. List mode ─────────────────────────────────────────────────────────────

/**
 * List mode — single-column horizontal cards.
 *
 * Used in Browse when the user switches to list view. Cards are wider with
 * thumbnail on the left and metadata on the right.
 * Verify: single column, thumbnail on left, price/title/location readable.
 */
export const ListMode: Story = {
  args: {
    id: "story-list",
    viewMode: "list",
    fetcher: populatedFetcher,
    skeletonCount: 5,
    contentPaddingBottom: 20,
  },
};

// ─── 3. Empty state ───────────────────────────────────────────────────────────

/**
 * Empty state — fetcher returned zero items.
 *
 * Used when search/filter returns no results, or the user has no saved listings.
 * Verify: empty icon visible, title/description present, action button tappable.
 */
export const EmptyState: Story = {
  args: {
    id: "story-empty",
    viewMode: "grid",
    fetcher: emptyFetcher,
    emptyIcon: Search,
    emptyTitle: "No listings found",
    emptyDescription: "Try adjusting your search or filters to find what you're looking for.",
    emptyAction: { label: "Reset filters", onPress: action("reset-filters") },
  },
};

/**
 * Empty state — saved listings tab (no favorites yet).
 * Uses the Heart icon as the empty icon, different copy.
 */
export const EmptySaved: Story = {
  args: {
    id: "story-empty-saved",
    viewMode: "list",
    fetcher: emptyFetcher,
    emptyIcon: Heart,
    emptyTitle: "No saved listings",
    emptyDescription: "Tap the heart icon on any listing to save it here.",
    emptyAction: { label: "Browse listings", onPress: action("browse") },
  },
};

/**
 * Empty state — seller's My Listings (no listings created yet).
 */
export const EmptySellerListings: Story = {
  args: {
    id: "story-empty-seller",
    viewMode: "list",
    fetcher: emptyFetcher,
    emptyIcon: Package,
    emptyTitle: "You haven't listed anything yet",
    emptyDescription: "Tap the + button to create your first listing.",
  },
};

// ─── 4. With status badges (seller view) ─────────────────────────────────────

/**
 * Seller view — grid mode with status badges.
 *
 * In My Listings, sellers see the status of each item (draft, active,
 * reserved, sold). Verify: status badge visible on cards, correct color per status.
 */
export const WithStatus: Story = {
  render: () => {
    const sellerListings: Listing[] = [
      makeListing({ id: 101, title: "Draft: Old laptop", status: "draft", thumbnailUrl: "https://picsum.photos/seed/d1/400/300" }),
      makeListing({ id: 102, title: "Active: Galaxy phone", status: "active", thumbnailUrl: "https://picsum.photos/seed/a1/400/300" }),
      makeListing({ id: 103, title: "Reserved: Sofa set", status: "reserved", thumbnailUrl: "https://picsum.photos/seed/r1/400/300" }),
      makeListing({ id: 104, title: "Sold: Carpet", status: "sold", thumbnailUrl: "https://picsum.photos/seed/s1/400/300" }),
    ];
    const fetcher = (_: ListQuery): Promise<ListFetchResult<Listing>> =>
      Promise.resolve({ items: sellerListings, totalCount: 4, totalPages: 1, currentPage: 1 });

    return (
      <ListingFeed
        id="story-status"
        viewMode="grid"
        fetcher={fetcher}
        showStatus
        contentPaddingBottom={20}
      />
    );
  },
};

// ─── 5. Saved listings (heart icons visible) ──────────────────────────────────

/**
 * Browse with saved state — heart icons visible on cards.
 *
 * savedMap provides the optimistic save state (keyed by listing id).
 * Verify: heart icon shown on all cards, filled for saved items.
 */
export const Saved: Story = {
  args: {
    id: "story-saved",
    viewMode: "grid",
    fetcher: populatedFetcher,
    savedMap: { 1: false, 2: true, 3: false, 4: true, 5: false, 6: false, 7: true, 8: false },
    onSaveToggle: action("save-toggle"),
    contentPaddingBottom: 20,
  },
};

/**
 * List mode with saved state — hearts visible in horizontal card layout.
 */
export const SavedListMode: Story = {
  args: {
    id: "story-saved-list",
    viewMode: "list",
    fetcher: populatedFetcher,
    savedMap: { 1: true, 2: false, 3: true, 4: false, 5: true, 6: false, 7: true, 8: false },
    onSaveToggle: action("save-toggle"),
    contentPaddingBottom: 20,
  },
};

// ─── 6. Custom renderListItem (SellerListingCard simulation) ──────────────────

/**
 * Custom renderListItem — simulates MyListings injecting SellerListingCard.
 *
 * In list mode, sellers get action buttons (Edit, Delete, lifecycle controls).
 * The renderListItem override provides a custom card; grid mode continues to
 * use the standard compact ListingCard.
 *
 * Verify: "Edit" and "Delete" buttons rendered for each item.
 */
export const CustomRenderItem: Story = {
  render: () => {
    const colors = useColors();

    const renderSellerItem = ({ item }: ListRenderItemInfo<Listing>): React.ReactElement => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        {/* Thumbnail placeholder */}
        <View style={{ width: 80, height: 80, backgroundColor: colors.muted }} />
        {/* Info */}
        <View style={{ flex: 1, padding: 10, gap: 4 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            AFN {item.price.toLocaleString()}
          </Text>
        </View>
        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 6, paddingRight: 10 }}>
          <Pressable
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: colors.secondary,
              borderRadius: 6,
            }}
            onPress={action(`edit-${item.id}`)}
          >
            <Text style={{ fontSize: 12, color: colors.foreground }}>Edit</Text>
          </Pressable>
          <Pressable
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: colors.destructiveAlpha,
              borderRadius: 6,
            }}
            onPress={action(`delete-${item.id}`)}
          >
            <Text style={{ fontSize: 12, color: colors.destructive }}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );

    return (
      <ListingFeed
        id="story-custom-render"
        viewMode="list"
        fetcher={populatedFetcher}
        renderListItem={renderSellerItem}
        contentPaddingBottom={20}
      />
    );
  },
};

// ─── 7. With ListHeaderComponent ─────────────────────────────────────────────

/**
 * With header — search bar + category row above the feed.
 *
 * The header is passed as ListHeaderComponent. In loading/empty/error states
 * it renders in a stable outer container above the body-swap zone (keyboard
 * focus is preserved). In the data state it scrolls naturally with FlashList.
 *
 * Verify: header visible and scroll-integrated; grid items below the search bar.
 */
export const WithHeader: Story = {
  render: () => {
    const colors = useColors();
    const Header = (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
          Browse
        </Text>
        <View
          style={{
            height: 40,
            borderRadius: 8,
            backgroundColor: colors.muted,
            justifyContent: "center",
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            Search listings in Kabul…
          </Text>
        </View>
      </View>
    );

    return (
      <ListingFeed
        id="story-with-header"
        viewMode="grid"
        fetcher={populatedFetcher}
        ListHeaderComponent={Header}
        contentPaddingBottom={20}
      />
    );
  },
};

// ─── 8. Loading state ─────────────────────────────────────────────────────────

/**
 * Loading state — grid skeleton.
 *
 * The fetcher never resolves so the feed stays in loading state.
 * ListingCardSkeleton is shown skeletonCount=6 times in a 2-column grid.
 * Verify: skeleton grid visible, no items, no empty state.
 */
export const Loading: Story = {
  args: {
    id: "story-loading-grid",
    viewMode: "grid",
    fetcher: loadingFetcher,
    skeletonCount: 6,
  },
};

/**
 * Loading state — list skeleton.
 *
 * ListingCardListSkeleton is shown skeletonCount=5 times in a single column.
 * Verify: horizontal skeleton rows visible.
 */
export const LoadingList: Story = {
  args: {
    id: "story-loading-list",
    viewMode: "list",
    fetcher: loadingFetcher,
    skeletonCount: 5,
  },
};
