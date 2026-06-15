/**
 * ListingMapSection stories
 *
 * The component shows a read-only map snippet for a listing's coordinates,
 * an optional address / location label beneath the map, and a "Get Directions"
 * button that opens the device's maps app.
 *
 * Stories:
 *   WithCoordinates        — full coords + address label
 *   WithCoordinatesOnly    — coords but no address/location label
 *   WithLocationFallback   — coords + location string (no address)
 *   WithoutAddressLabel    — coords, neither address nor location provided
 *   MultipleLocations      — three Afghan cities stacked for comparison
 *   RTL                    — simulates Pashto / Dari direction (row-reverse layout)
 *   DarkSurface            — dark background to verify useColors() token correctness
 *
 * Map rendering notes:
 *   On Storybook web the MapCanvas loads Leaflet from a CDN; it shows a loading
 *   skeleton until the CDN response arrives. This is expected behaviour — the
 *   stories are still useful for verifying labels, the directions button, and
 *   the address row. On Storybook native the tile-based renderer is used directly.
 *
 *   expo-location is NOT called on mount when the permission check resolves to
 *   "undetermined" (the most common first-launch state) — the component simply
 *   leaves the "Show My Location" button visible without making any async call.
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingMapSection } from "./ListingMapSection";

// ─── Afghan coordinate fixtures ──────────────────────────────────────────────

/** Kabul city centre */
const KABUL = { latitude: 34.5553, longitude: 69.2075 };

/** Herat city centre */
const HERAT = { latitude: 34.3528, longitude: 62.2041 };

/** Mazar-i-Sharif city centre */
const MAZAR = { latitude: 36.7069, longitude: 67.1106 };

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ListingMapSection> = {
  title: "Components/ListingMapSection",
  component: ListingMapSection,
  argTypes: {
    latitude: { control: "number" },
    longitude: { control: "number" },
    location: { control: "text" },
    address: { control: "text" },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: "#f8f9fa" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListingMapSection>;

// ─── Story: with full coordinates and address ─────────────────────────────────

/**
 * The primary happy-path state — coordinates are present and an address string
 * is shown beneath the map. The "Get Directions" button is always visible.
 */
export const WithCoordinates: Story = {
  args: {
    latitude: KABUL.latitude,
    longitude: KABUL.longitude,
    address: "Share Naw, Kabul, Afghanistan",
    location: "Kabul",
  },
};

// ─── Story: coordinates only, no label ───────────────────────────────────────

/**
 * Coordinates provided but neither address nor location set.
 * The address row beneath the map is hidden; only the map and directions
 * button render. Verifies the component handles the absent-label branch.
 */
export const WithCoordinatesOnly: Story = {
  args: {
    latitude: KABUL.latitude,
    longitude: KABUL.longitude,
  },
};

// ─── Story: location string fallback (no address) ────────────────────────────

/**
 * A location string is provided but address is absent.
 * The component should fall back to displaying the location string.
 */
export const WithLocationFallback: Story = {
  args: {
    latitude: HERAT.latitude,
    longitude: HERAT.longitude,
    location: "Herat, Herat Province",
  },
};

// ─── Story: explicit null address and location ────────────────────────────────

/**
 * Both address and location are explicitly null — the label row should not
 * render at all. Only the map and directions button are shown.
 */
export const WithoutAddressLabel: Story = {
  args: {
    latitude: MAZAR.latitude,
    longitude: MAZAR.longitude,
    address: null,
    location: null,
  },
};

// ─── Story: multiple cities stacked ─────────────────────────────────────────

/**
 * Three Afghan cities stacked in a column.
 * Useful for quickly comparing the visual weight and label text across
 * different coordinate sets.
 */
export const MultipleLocations: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <ListingMapSection
        latitude={KABUL.latitude}
        longitude={KABUL.longitude}
        address="Share Naw, Kabul"
      />
      <ListingMapSection
        latitude={HERAT.latitude}
        longitude={HERAT.longitude}
        address="Old City, Herat"
      />
      <ListingMapSection
        latitude={MAZAR.latitude}
        longitude={MAZAR.longitude}
        location="Mazar-i-Sharif"
      />
    </View>
  ),
};

// ─── Story: RTL layout ────────────────────────────────────────────────────────

/**
 * RTL (Pashto / Dari) layout simulation.
 * The address row and the directions button row use flexDirection row-reverse
 * when isRtl is true. Wrapping in a direction="rtl" View triggers that branch
 * in native; the component reads isRtl from useLocalization() at runtime.
 */
export const RTL: Story = {
  render: () => (
    <View style={{ direction: "rtl", flex: 1, padding: 16, backgroundColor: "#f8f9fa" }}>
      <ListingMapSection
        latitude={KABUL.latitude}
        longitude={KABUL.longitude}
        address="ولسوالۍ کابل، افغانستان"
        location="کابل"
      />
    </View>
  ),
};

// ─── Story: dark surface ──────────────────────────────────────────────────────

/**
 * Dark background container — verifies that useColors() tokens (border, card,
 * primary, mutedForeground) render correctly in dark mode.
 * The map tile contrast is also visible in this context.
 */
export const DarkSurface: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <ListingMapSection
        latitude={KABUL.latitude}
        longitude={KABUL.longitude}
        address="Share Naw, Kabul, Afghanistan"
      />
    </View>
  ),
};

/**
 * Dark surface — no address label variant.
 * Ensures the directions button and map border use dark-mode tokens correctly
 * even without a label row.
 */
export const DarkSurfaceNoLabel: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      <ListingMapSection
        latitude={HERAT.latitude}
        longitude={HERAT.longitude}
      />
    </View>
  ),
};
