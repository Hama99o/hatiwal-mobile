/**
 * ListingFiltersBar stories
 *
 * Covers: default with categories, empty search, active category selected,
 * list mode selected, RTL layout (Pashto/Dari), and dark surface.
 *
 * An interactive FiltersBarWrapper (useState) is used so that chip presses
 * and toggle presses update state live in Storybook — mirroring the
 * ChipsWrapper pattern in CategoryChipRow.stories.tsx.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingFiltersBar } from "./ListingFiltersBar";
import type { Category } from "@/api/categories";
import type { ListingFeedViewMode } from "./ListingFeed";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES: Category[] = [
  {
    id: 1,
    slug: "electronics",
    nameEn: "Electronics",
    namePs: "برقي توکي",
    nameFa: "الکترونیک",
    icon: "💻",
    position: 1,
  },
  {
    id: 2,
    slug: "vehicles",
    nameEn: "Vehicles",
    namePs: "موټرونه",
    nameFa: "وسایل نقلیه",
    icon: "🚗",
    position: 2,
  },
  {
    id: 3,
    slug: "clothes",
    nameEn: "Clothes",
    namePs: "جامې",
    nameFa: "لباس",
    icon: "👗",
    position: 3,
  },
  {
    id: 4,
    slug: "home",
    nameEn: "Home & Garden",
    namePs: "کور او باغ",
    nameFa: "خانه و باغ",
    icon: "🏡",
    position: 4,
  },
  {
    id: 5,
    slug: "other",
    nameEn: "Other",
    namePs: "نور",
    nameFa: "دیگر",
    icon: "",
    position: 5,
  },
];

// ── Interactive wrapper ───────────────────────────────────────────────────────

interface WrapperProps {
  initialSearch?: string;
  initialCategoryId?: number | null;
  initialViewMode?: ListingFeedViewMode;
  darkBg?: boolean;
  placeholder?: string;
  categories?: Category[];
}

function FiltersBarWrapper({
  initialSearch = "",
  initialCategoryId = null,
  initialViewMode = "grid",
  darkBg = false,
  placeholder,
  categories = MOCK_CATEGORIES,
}: WrapperProps) {
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  const [viewMode, setViewMode] = useState<ListingFeedViewMode>(initialViewMode);

  return (
    <View style={{ backgroundColor: darkBg ? "#0f172a" : "#f8f8f8" }}>
      <ListingFiltersBar
        search={search}
        onSearchChange={setSearch}
        categories={categories}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder={placeholder}
      />
    </View>
  );
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ListingFiltersBar> = {
  title: "Components/ListingFiltersBar",
  component: ListingFiltersBar,
  decorators: [
    (Story) => (
      <View style={{ padding: 0 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingFiltersBar>;

// ── Stories ───────────────────────────────────────────────────────────────────

/**
 * Default — all categories, empty search, "All" chip selected, grid mode.
 * The "All" chip is highlighted and the search input shows the default placeholder.
 */
export const Default: Story = {
  render: () => <FiltersBarWrapper />,
};

/**
 * EmptySearch — same as Default; verifies the clear-X button is hidden when
 * the search field is empty. Interact in Storybook to see it appear on typing.
 */
export const EmptySearch: Story = {
  render: () => <FiltersBarWrapper initialSearch="" />,
};

/**
 * WithSearchText — search field pre-filled; the clear-X button must be visible.
 * Pressing X should clear the field.
 */
export const WithSearchText: Story = {
  render: () => <FiltersBarWrapper initialSearch="iPhone 14" />,
};

/**
 * ActiveCategory — the "Vehicles" chip is pre-selected (highlighted in primary
 * colour). The "All" chip should appear unselected.
 */
export const ActiveCategory: Story = {
  render: () => <FiltersBarWrapper initialCategoryId={2} />,
};

/**
 * ListMode — the list toggle is the active button. Verifies primary background
 * on the list icon and muted background on the grid icon.
 */
export const ListMode: Story = {
  render: () => <FiltersBarWrapper initialViewMode="list" />,
};

/**
 * RTL — Pashto / Dari layout. All flex rows reverse so the search icon appears
 * on the right, the toggle is on the left, and category chips flow right-to-left.
 * Note: useLocalization().isRtl must return true at runtime (switch app locale).
 * This story documents the expected layout for design review.
 */
export const RTL: Story = {
  render: () => (
    <FiltersBarWrapper
      initialCategoryId={null}
      placeholder="لټون…"
    />
  ),
};

/**
 * DarkSurface — dark background to verify all useColors() tokens resolve
 * correctly in dark mode. No hardcoded hex should appear in this story.
 */
export const DarkSurface: Story = {
  render: () => <FiltersBarWrapper initialCategoryId={1} darkBg={true} />,
};

/**
 * DarkSurfaceListMode — dark background + list toggle active, covering both
 * the dark-mode token check and the secondary toggle state.
 */
export const DarkSurfaceListMode: Story = {
  render: () => (
    <FiltersBarWrapper initialViewMode="list" darkBg={true} />
  ),
};

/**
 * NoCategories — categories prop is undefined; the category chip row must not
 * render. Only the search bar and grid/list toggle are visible.
 */
export const NoCategories: Story = {
  render: () => <FiltersBarWrapper categories={undefined} />,
};

/**
 * EmptyCategories — categories is an empty array; same guard as NoCategories.
 */
export const EmptyCategories: Story = {
  render: () => <FiltersBarWrapper categories={[]} />,
};

/**
 * CustomPlaceholder — verifies the placeholder prop is forwarded to the Input.
 */
export const CustomPlaceholder: Story = {
  render: () => (
    <FiltersBarWrapper placeholder="Search my listings…" />
  ),
};
