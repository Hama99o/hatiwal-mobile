/**
 * LocationRangePicker stories — covers all documented modes and states.
 *
 * Modes:
 *   range — buyer distance-search: point on map + radius chip selector
 *   point — seller exact location: pin-only, no radius chips
 *
 * States per mode:
 *   Empty/initial     — no pre-selected coords, default Kabul center, no label
 *   PreselectedKabul  — Kabul coords pre-filled with a known place name + radius
 *   RTL               — simulates Pashto / Dari locale (direction="rtl" wrapper)
 *   DarkSurface       — dark background to verify useColors() token correctness
 *
 * Geocoding note:
 *   searchPlaces() is only called when the user types ≥2 characters in the
 *   search box. reverseGeocode() is only called on Confirm when no label is
 *   already set. Neither fires on mount, so no network mock is needed for the
 *   initial-render states. The "open" stories (visible=true) use a pre-set
 *   initialLabel so the confirm flow resolves without a network call either.
 *
 *   If you manually type in the search box inside Storybook, real Nominatim
 *   requests will fire (Afghanistan-scoped). This is intentional for interactive
 *   Storybook use; the acceptance criterion only requires no call on mount.
 */

import React, { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "@/components/reusables/button";
import { Text } from "@/components/reusables/text";
import { LocationRangePicker } from "./LocationRangePicker";
import type { LocationRangeValue } from "./LocationRangePicker";
import type { MapCanvasCoords } from "./map/MapCanvas.types";

// ---------------------------------------------------------------------------
// Realistic Afghan coordinate fixtures
// ---------------------------------------------------------------------------

/** Kabul city centre — the default/empty state center. */
const KABUL: MapCanvasCoords = { latitude: 34.5553, longitude: 69.2075 };

/** Mazar-i-Sharif — a distinct pre-selected location for the "preselected" stories. */
const MAZAR: MapCanvasCoords = { latitude: 36.7069, longitude: 67.1106 };

/** Herat — used for the seller / point-mode preselected story. */
const HERAT: MapCanvasCoords = { latitude: 34.3528, longitude: 62.2041 };

// ---------------------------------------------------------------------------
// Controlled wrapper — opens and closes the modal from a button
// ---------------------------------------------------------------------------

interface PickerWrapperProps {
  mode?: "range" | "point";
  initialCoords?: MapCanvasCoords | null;
  initialRadius?: number;
  initialLabel?: string | null;
  darkBg?: boolean;
}

function PickerWrapper({
  mode = "range",
  initialCoords = null,
  initialRadius = 5,
  initialLabel = null,
  darkBg = false,
}: PickerWrapperProps) {
  const [visible, setVisible] = useState(false);
  const [confirmedValue, setConfirmedValue] = useState<LocationRangeValue | null>(null);

  const handleConfirm = (value: LocationRangeValue) => {
    setConfirmedValue(value);
    setVisible(false);
  };

  const labelText = confirmedValue
    ? `${confirmedValue.label ?? "Unknown"} — ${
        mode === "range" ? `${confirmedValue.radiusKm} km` : "point"
      }`
    : "Not set";

  return (
    <View
      style={{
        padding: 20,
        gap: 16,
        flex: 1,
        backgroundColor: darkBg ? "#0f172a" : "#f8f9fa",
      }}
    >
      <Text style={{ color: darkBg ? "#f8fafc" : "#0f172a" }}>
        Mode: {mode}
      </Text>
      <Text style={{ color: darkBg ? "#94a3b8" : "#475569" }}>
        Confirmed: {labelText}
      </Text>
      <Button onPress={() => setVisible(true)}>
        <Text>Open Location Picker</Text>
      </Button>
      <LocationRangePicker
        visible={visible}
        onClose={() => setVisible(false)}
        initialCoords={initialCoords}
        initialRadius={initialRadius}
        initialLabel={initialLabel}
        onConfirm={handleConfirm}
        mode={mode}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pre-opened wrapper — renders the modal immediately (visible=true).
// Useful for direct visual inspection without pressing a button.
// Uses a pre-set initialLabel so Confirm never triggers reverseGeocode().
// ---------------------------------------------------------------------------

interface OpenPickerWrapperProps {
  mode?: "range" | "point";
  initialCoords?: MapCanvasCoords | null;
  initialRadius?: number;
  initialLabel?: string | null;
}

function OpenPickerWrapper({
  mode = "range",
  initialCoords = null,
  initialRadius = 5,
  initialLabel = null,
}: OpenPickerWrapperProps) {
  const [visible, setVisible] = useState(true);
  const [confirmedValue, setConfirmedValue] = useState<LocationRangeValue | null>(null);

  const handleConfirm = (value: LocationRangeValue) => {
    setConfirmedValue(value);
    setVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {!visible && (
        <View style={{ padding: 20, gap: 12 }}>
          <Text>
            Confirmed: {confirmedValue?.label ?? "—"}{" "}
            {mode === "range" ? `(${confirmedValue?.radiusKm ?? "?"}km)` : ""}
          </Text>
          <Button onPress={() => setVisible(true)}>
            <Text>Re-open</Text>
          </Button>
        </View>
      )}
      <LocationRangePicker
        visible={visible}
        onClose={() => setVisible(false)}
        initialCoords={initialCoords}
        initialRadius={initialRadius}
        initialLabel={initialLabel}
        onConfirm={handleConfirm}
        mode={mode}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof LocationRangePicker> = {
  title: "Components/LocationRangePicker",
  component: LocationRangePicker,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LocationRangePicker>;

// ---------------------------------------------------------------------------
// Range mode — buyer sets a point + radius for distance search
// ---------------------------------------------------------------------------

/**
 * Range mode — initial/empty state.
 * No pre-selected coords. Defaults to Kabul center, 5 km radius chip selected.
 * The search box is empty and no network call fires on mount.
 */
export const RangeEmpty: Story = {
  render: () => (
    <PickerWrapper mode="range" initialCoords={null} initialRadius={5} />
  ),
};

/**
 * Range mode — pre-selected Mazar-i-Sharif, 25 km radius.
 * Reopening the modal keeps the place name in the search box (skipSearchRef).
 * Confirming uses the pre-set label so reverseGeocode() is never called.
 */
export const RangePreselectedMazar: Story = {
  render: () => (
    <PickerWrapper
      mode="range"
      initialCoords={MAZAR}
      initialRadius={25}
      initialLabel="Mazar-i-Sharif, Balkh"
    />
  ),
};

/**
 * Range mode — Kabul, 10 km radius. Open on mount for direct visual inspection.
 * initialLabel provided → Confirm is safe without a network call.
 */
export const RangeOpenKabul: Story = {
  render: () => (
    <OpenPickerWrapper
      mode="range"
      initialCoords={KABUL}
      initialRadius={10}
      initialLabel="Kabul, Kabul Province"
    />
  ),
};

/**
 * Range mode — Mazar-i-Sharif open on mount, 25 km radius.
 */
export const RangeOpenMazar: Story = {
  render: () => (
    <OpenPickerWrapper
      mode="range"
      initialCoords={MAZAR}
      initialRadius={25}
      initialLabel="Mazar-i-Sharif, Balkh"
    />
  ),
};

// ---------------------------------------------------------------------------
// Point mode — seller picks an exact listing location (no radius chips)
// ---------------------------------------------------------------------------

/**
 * Point mode — initial/empty state.
 * Defaults to Kabul center, no radius chips rendered.
 */
export const PointEmpty: Story = {
  render: () => (
    <PickerWrapper mode="point" initialCoords={null} initialRadius={0} />
  ),
};

/**
 * Point mode — pre-selected Herat.
 * No radius section shown — confirms the mode guard works.
 */
export const PointPreselectedHerat: Story = {
  render: () => (
    <PickerWrapper
      mode="point"
      initialCoords={HERAT}
      initialRadius={0}
      initialLabel="Herat, Herat Province"
    />
  ),
};

/**
 * Point mode — Herat, open on mount for direct visual inspection.
 * Verifies the absence of radius chips in the bottom controls area.
 */
export const PointOpenHerat: Story = {
  render: () => (
    <OpenPickerWrapper
      mode="point"
      initialCoords={HERAT}
      initialRadius={0}
      initialLabel="Herat, Herat Province"
    />
  ),
};

// ---------------------------------------------------------------------------
// RTL — simulates Pashto / Dari locale
// ---------------------------------------------------------------------------

/**
 * Range mode, RTL layout.
 * The direction wrapper mirrors flexDirection row-reverse inside the component.
 * Verifies: header close/title order, search bar icon side, chip row direction.
 */
export const RTLRangeEmpty: Story = {
  render: () => (
    <View style={{ direction: "rtl", flex: 1 }}>
      <PickerWrapper mode="range" initialCoords={null} initialRadius={5} />
    </View>
  ),
};

/**
 * Point mode, RTL layout.
 */
export const RTLPointEmpty: Story = {
  render: () => (
    <View style={{ direction: "rtl", flex: 1 }}>
      <PickerWrapper mode="point" initialCoords={null} initialRadius={0} />
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Dark surface — verify useColors() tokens render correctly in dark mode
// ---------------------------------------------------------------------------

/**
 * Range mode, dark background container.
 * Colors come from useColors() inline styles, so this verifies the dark tokens.
 */
export const DarkSurfaceRange: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <PickerWrapper
        mode="range"
        initialCoords={KABUL}
        initialRadius={5}
        initialLabel="Kabul, Kabul Province"
        darkBg
      />
    </View>
  ),
};

/**
 * Point mode, dark background container.
 */
export const DarkSurfacePoint: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <PickerWrapper
        mode="point"
        initialCoords={HERAT}
        initialRadius={0}
        initialLabel="Herat, Herat Province"
        darkBg
      />
    </View>
  ),
};
