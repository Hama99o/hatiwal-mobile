/**
 * MapCanvas (iOS) — native map on `react-native-maps` with PROVIDER_DEFAULT, which
 * on iOS is Apple Maps (MapKit): free, no API key, no billing, no usage limits at
 * any scale, and it works in Expo Go too. Android uses MapLibre/OSM instead — see
 * MapCanvas.android.tsx. Place search stays on Nominatim (see geocoding.ts).
 *
 * Three modes (same contract as before):
 *   • picker      (!readonly && !interactive) — tap the map or drag the pin to
 *                  move it; fires onCenterChange. Gestures on.
 *   • interactive (interactive)               — pan/pinch the viewport; pin is
 *                  fixed at `center`; no onCenterChange. Gestures on.
 *   • readonly    (readonly)                  — static; all gestures off.
 */

import { useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import MapView, {
  Marker,
  Circle,
  PROVIDER_DEFAULT,
  type Region,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from "react-native-maps";
import { MapPin, Plus, Minus } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import { withAlpha } from "@/lib/color";
import type { MapCanvasProps, MapCanvasCoords } from "./MapCanvas.types";

// 1° latitude ≈ 111 km. Frame the radius circle with comfortable padding by
// showing roughly 2.5× its diameter.
function regionForRadius(center: MapCanvasCoords, radiusKm: number): Region {
  const safeRadius = radiusKm > 0 ? radiusKm : 2;
  const latDelta = Math.max(0.01, (safeRadius / 111) * 2 * 2.5);
  return {
    latitude: Number(center.latitude),
    longitude: Number(center.longitude),
    latitudeDelta: latDelta,
    longitudeDelta: latDelta,
  };
}

export default function MapCanvas({
  center,
  radiusKm,
  onCenterChange,
  height,
  primaryColor,
  dark,
  secondaryPin,
  readonly,
  interactive,
  gesturesEnabled = true,
}: MapCanvasProps) {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(regionForRadius(center, radiusKm));
  // Remember the last coordinate WE emitted so an external `center` change
  // (e.g. a "use my location" button) recenters the map, while our own pin
  // drag/tap does not fight the user by re-animating.
  const lastEmitted = useRef<string | null>(null);

  const isPicker = !readonly && !interactive;
  const gesturesOn = !readonly && gesturesEnabled;

  // Recenter only on EXTERNAL center changes.
  useEffect(() => {
    const key = `${center.latitude},${center.longitude}`;
    if (lastEmitted.current === key) return;
    mapRef.current?.animateToRegion(regionForRadius(center, radiusKm), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.latitude, center.longitude, radiusKm]);

  const emit = (coords: MapCanvasCoords) => {
    const next = { latitude: coords.latitude, longitude: coords.longitude };
    lastEmitted.current = `${next.latitude},${next.longitude}`;
    onCenterChange(next);
  };

  const handleMapPress = (e: MapPressEvent) => {
    if (!isPicker) return;
    emit(e.nativeEvent.coordinate);
  };

  const handleDragEnd = (e: MarkerDragStartEndEvent) => {
    emit(e.nativeEvent.coordinate);
  };

  const zoomBy = (factor: number) => {
    const r = regionRef.current;
    mapRef.current?.animateToRegion(
      {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: Math.max(0.002, r.latitudeDelta * factor),
        longitudeDelta: Math.max(0.002, r.longitudeDelta * factor),
      },
      200
    );
  };

  const zoomButtonStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  };

  return (
    <View style={{ width: "100%", height, overflow: "hidden" }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ width: "100%", height: "100%" }}
        initialRegion={regionRef.current}
        onRegionChangeComplete={(r) => {
          regionRef.current = r;
        }}
        onPress={handleMapPress}
        scrollEnabled={gesturesOn}
        zoomEnabled={gesturesOn}
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle={dark ? "dark" : "light"}
        toolbarEnabled={false}
        showsCompass={false}
        moveOnMarkerPress={false}
      >
        {/* Search / selection radius */}
        {radiusKm > 0 && (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            strokeColor={primaryColor}
            strokeWidth={2}
            fillColor={withAlpha(primaryColor, 0.18)}
          />
        )}

        {/* Main pin — draggable only in picker mode */}
        <Marker
          coordinate={center}
          draggable={isPicker}
          onDragEnd={isPicker ? handleDragEnd : undefined}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges
        >
          <MapPin size={32} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
        </Marker>

        {/* Secondary pin (e.g. user's current location) — a bright blue dot */}
        {secondaryPin && (
          <Marker coordinate={secondaryPin} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.mapUserDotBorder,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: colors.mapUserDotFill,
                }}
              />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Zoom +/- buttons (whenever gestures are active). Plain object styles —
          NEVER a function style on Pressable (NativeWind drops it). */}
      {gesturesOn && (
        <View style={{ position: "absolute", bottom: 10, left: 10, gap: 6 }}>
          <Pressable onPress={() => zoomBy(0.5)} style={zoomButtonStyle} hitSlop={4} accessibilityRole="button">
            <Plus size={18} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => zoomBy(2)} style={zoomButtonStyle} hitSlop={4} accessibilityRole="button">
            <Minus size={18} color={colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
