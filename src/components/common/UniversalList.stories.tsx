/**
 * UniversalList stories
 *
 * Covers all four render states of the component:
 *   Loading   — skeleton grid or spinner shown while the fetcher is in-flight
 *   Error     — error affordance + retry button after a fetcher rejection
 *   Empty     — EmptyState shown when the fetcher resolves with zero items
 *   Populated — items rendered via renderItem after a successful fetch
 *
 * Each story uses a simple PlaceholderRow so the stories depend on nothing
 * outside of UniversalList itself.
 *
 * Usage in Storybook:
 *   Components / UniversalList / Loading
 *   Components / UniversalList / Error
 *   Components / UniversalList / Empty
 *   Components / UniversalList / Populated
 *   Components / UniversalList / PopulatedWithHeader
 *   Components / UniversalList / PopulatedGrid
 */

import React from "react";
import { View } from "react-native";
import { Text } from "@/components/reusables/text";
import type { Meta, StoryObj } from "@storybook/react-native";
import { UniversalList } from "./UniversalList";
import type { UniversalListConfig, ListFetchResult, ListQuery } from "./UniversalList";
import { Package, Search, Heart } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type StoryItem = { id: number; title: string; subtitle: string };

const SAMPLE_ITEMS: StoryItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
  subtitle: `Kabul · ${(i + 1) * 1000} AFN`,
}));

// ─── Shared fetchers ──────────────────────────────────────────────────────────

/** A fetcher that never resolves — keeps the list in loading state */
const loadingFetcher = (_query: ListQuery): Promise<ListFetchResult<StoryItem>> =>
  new Promise(() => {});

/** A fetcher that immediately rejects with a network error */
const errorFetcher = (_query: ListQuery): Promise<ListFetchResult<StoryItem>> =>
  Promise.reject(new Error("Failed to fetch listings"));

/** A fetcher that resolves with zero items */
const emptyFetcher = (_query: ListQuery): Promise<ListFetchResult<StoryItem>> =>
  Promise.resolve({ items: [], totalCount: 0, totalPages: 1, currentPage: 1 });

/** A fetcher that resolves with sample items */
const populatedFetcher = (_query: ListQuery): Promise<ListFetchResult<StoryItem>> =>
  Promise.resolve({
    items: SAMPLE_ITEMS,
    totalCount: SAMPLE_ITEMS.length,
    totalPages: 1,
    currentPage: 1,
  });

// ─── Shared placeholder components ───────────────────────────────────────────

/** Simple skeleton cell that mimics a card placeholder */
function SkeletonCell() {
  const colors = useColors();
  return (
    <View
      style={{
        height: 160,
        borderRadius: 12,
        backgroundColor: colors.muted,
        flex: 1,
      }}
    />
  );
}

/** Minimal row rendered for each item in the populated stories */
function PlaceholderRow({ item }: { item: StoryItem }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          backgroundColor: colors.muted,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
          {item.subtitle}
        </Text>
      </View>
    </View>
  );
}

/** Simple grid card rendered in the 2-column grid story */
function GridCard({ item }: { item: StoryItem }) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        height: 180,
        borderRadius: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.muted }} />
      <View style={{ padding: 8, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
          {item.subtitle}
        </Text>
      </View>
    </View>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof UniversalList> = {
  title: "Components/UniversalList",
  component: UniversalList,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UniversalList>;

// ─── 1. Loading ───────────────────────────────────────────────────────────────

/**
 * Loading state — skeleton grid.
 * The fetcher never resolves so the list stays in loading indefinitely.
 * Verifies that SkeletonComponent is rendered skeletonCount times in a grid.
 */
export const Loading: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-loading",
      fetcher: loadingFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
      SkeletonComponent: SkeletonCell,
      skeletonCount: 6,
      numColumns: 2,
    };
    return <UniversalList config={config} />;
  },
};

/**
 * Loading state — spinner fallback.
 * When no SkeletonComponent is provided, an ActivityIndicator is shown.
 */
export const LoadingSpinner: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-loading-spinner",
      fetcher: loadingFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
    };
    return <UniversalList config={config} />;
  },
};

// ─── 2. Error ─────────────────────────────────────────────────────────────────

/**
 * Error state — the fetcher rejected.
 * Shows the WifiOff icon, error heading, description, and a Retry button.
 * Pressing Retry calls the fetcher again (it will reject again in this story).
 */
export const Error: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-error",
      fetcher: errorFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
    };
    return <UniversalList config={config} />;
  },
};

// ─── 3. Empty ─────────────────────────────────────────────────────────────────

/**
 * Empty state — fetch succeeded but returned zero items.
 * Shows the EmptyState with an icon, title, description, and optional CTA.
 */
export const Empty: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-empty",
      fetcher: emptyFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
      emptyIcon: Search,
      emptyTitle: "No listings found",
      emptyDescription: "Try adjusting your search or filters to find what you're looking for.",
    };
    return <UniversalList config={config} />;
  },
};

/**
 * Empty state with an action button.
 * Provides a CTA ("Reset filters") so the user can recover from zero results.
 */
export const EmptyWithAction: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-empty-action",
      fetcher: emptyFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
      emptyIcon: Heart,
      emptyTitle: "No saved listings",
      emptyDescription: "Tap the heart icon on any listing to save it here.",
      emptyAction: { label: "Browse listings", onPress: () => {} },
    };
    return <UniversalList config={config} />;
  },
};

// ─── 4. Populated ─────────────────────────────────────────────────────────────

/**
 * Populated state — single-column list.
 * Renders 12 rows via PlaceholderRow with pull-to-refresh enabled.
 */
export const Populated: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-populated",
      fetcher: populatedFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
      emptyTitle: "No items",
    };
    return <UniversalList config={config} />;
  },
};

/**
 * Populated state — 2-column grid.
 * Verifies that numColumns=2 lays out the items in a grid via FlashList.
 */
export const PopulatedGrid: Story = {
  render: () => {
    const config: UniversalListConfig<StoryItem> = {
      id: "story-populated-grid",
      fetcher: populatedFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <GridCard item={item} />,
      numColumns: 2,
      SkeletonComponent: SkeletonCell,
      skeletonCount: 6,
      emptyTitle: "No listings",
      emptyDescription: "There are no listings in this category yet.",
      emptyIcon: Package,
    };
    return <UniversalList config={config} />;
  },
};

/**
 * Populated state with a ListHeaderComponent.
 * Demonstrates the stable header architecture: the header scrolls with the
 * list in the data state and stays mounted across body-branch transitions.
 */
export const PopulatedWithHeader: Story = {
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
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
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
            Search listings…
          </Text>
        </View>
      </View>
    );

    const config: UniversalListConfig<StoryItem> = {
      id: "story-populated-header",
      fetcher: populatedFetcher,
      keyExtractor: (item) => String(item.id),
      renderItem: ({ item }) => <PlaceholderRow item={item} />,
      ListHeaderComponent: Header,
      emptyTitle: "No items",
    };
    return <UniversalList config={config} />;
  },
};
