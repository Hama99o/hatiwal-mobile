/**
 * SavedSearches stories
 *
 * The component fetches via @tanstack/react-query, so every story needs a
 * QueryClient decorator that pre-seeds the cache with the desired fixture data.
 * This avoids network calls in Storybook and keeps stories instant.
 *
 * Stories
 * ───────
 * Populated   — four diverse saved-search chips (location, category, price, radius)
 * Single      — a single chip (minimal render)
 * EmptyState  — zero items → italic "apply filters" message
 * Loading     — cache not seeded → spinner (component fetches, never resolves in story)
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SavedSearches } from "./SavedSearches";
import type { SavedSearch } from "@/api/saved-searches";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE: SavedSearch = {
  id: 0,
  location: null,
  categoryId: null,
  categoryName: null,
  priceMin: null,
  priceMax: null,
  latitude: null,
  longitude: null,
  radius: null,
  locationBased: false,
  createdAt: "2025-01-01T00:00:00.000Z",
};

function makeSearch(id: number, overrides: Partial<SavedSearch> = {}): SavedSearch {
  return { ...BASE, id, ...overrides };
}

const FOUR_SEARCHES: SavedSearch[] = [
  makeSearch(1, { location: "Kabul, Share Naw" }),
  makeSearch(2, { categoryName: "Electronics", priceMin: 1000, priceMax: 50000 }),
  makeSearch(3, {
    locationBased: true,
    radius: 15,
    latitude: 34.52,
    longitude: 69.18,
    categoryName: "Vehicles",
  }),
  makeSearch(4, { location: "Herat", priceMin: 500, priceMax: 10000 }),
];

const ONE_SEARCH: SavedSearch[] = [
  makeSearch(1, { location: "Mazar-e-Sharif", categoryName: "Clothes" }),
];

// ─── Decorator factory ────────────────────────────────────────────────────────
// Pre-seeds the react-query cache so the component renders immediately without
// hitting any network endpoint.

function withPreseededCache(data: SavedSearch[]) {
  return function Decorator(Story: React.ComponentType) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    // Pre-seed the exact query key the component uses
    qc.setQueryData(["saved-searches"], data);
    return (
      <QueryClientProvider client={qc}>
        <Story />
      </QueryClientProvider>
    );
  };
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof SavedSearches> = {
  title: "Components/SavedSearches",
  component: SavedSearches,
  argTypes: {},
  decorators: [
    (Story) => (
      <View style={{ backgroundColor: "#f5f5f5", paddingVertical: 8 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SavedSearches>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Populated — four diverse chips covering all summary variants:
 *   location text, category + price range, radius + category, location + price.
 */
export const Populated: Story = {
  args: {
    onSelectSearch: (search: SavedSearch) => {
      console.log("Selected search:", search);
    },
  },
  decorators: [withPreseededCache(FOUR_SEARCHES)],
};

/**
 * Single — one chip only, minimal render.
 */
export const Single: Story = {
  args: {
    onSelectSearch: (search: SavedSearch) => {
      console.log("Selected search:", search);
    },
  },
  decorators: [withPreseededCache(ONE_SEARCH)],
};

/**
 * EmptyState — the list is empty, so the italic "apply filters" hint appears.
 */
export const EmptyState: Story = {
  args: {
    onSelectSearch: () => {},
  },
  decorators: [withPreseededCache([])],
};

/**
 * Loading — the QueryClient cache has no data and the query is inflight.
 * The component renders its ActivityIndicator spinner.
 */
export const Loading: Story = {
  args: {
    onSelectSearch: () => {},
  },
  decorators: [
    (Story) => {
      // Do NOT pre-seed the cache — let the component enter loading state.
      // We mock the API to a never-resolving promise so Storybook shows the spinner.
      const qc = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            queryFn: () => new Promise(() => {}),
          },
        },
      });
      return (
        <QueryClientProvider client={qc}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
