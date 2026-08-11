/**
 * MapCanvas — native map built on `@maplibre/maplibre-react-native` (MapLibre GL).
 *
 * Uses keyless OpenStreetMap raster tiles (via CARTO's free basemaps) so the map
 * needs NO Google Maps API key and NO billing on any platform — Android and iOS
 * both render the same OSM map. Place search stays on Nominatim (see geocoding.ts).
 *
 * ── Expo Go ──────────────────────────────────────────────────────────────────
 * MapLibre is a custom native module and is NOT bundled in Expo Go, so importing
 * it there throws `MLRNCameraModule could not be found`. To keep the Expo Go dev
 * loop working, we detect Expo Go and (a) never `require` MapLibre there and
 * (b) render a lightweight placeholder instead. Real builds (dev-client / APK /
 * AAB / iOS) load MapLibre normally and show the real map.
 *
 * Three modes (same public contract as before — see MapCanvas.types.ts):
 *   • picker      (!readonly && !interactive) — a fixed centre pin; pan the map to
 *                  position it (or tap a spot) → fires onCenterChange. Gestures on.
 *   • interactive (interactive)               — pan/pinch the viewport; pin is a
 *                  map marker fixed at `center`; no onCenterChange. Gestures on.
 *   • readonly    (readonly)                  — static; all gestures off.
 *
 * v11 note: MapLibre markers are not draggable, so picker mode uses the common
 * "pin stays centred, move the map under it" pattern (smooth + native) instead of
 * pin-drag. Tapping the map still recentres onto the tapped point.
 */

import { useEffect, useRef } from "react";
import { View, Pressable, Text, type GestureResponderEvent } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { MapPin, Plus, Minus } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import { withAlpha } from "@/lib/color";
import type { MapCanvasProps, MapCanvasCoords } from "./MapCanvas.types";
// Type-only import — erased at runtime, so it never triggers the native module
// lookup that crashes Expo Go.
import type {
  CameraRef,
  PressEvent,
  ViewStateChangeEvent,
  StyleSpecification,
} from "@maplibre/maplibre-react-native";

// Expo Go can't load MapLibre's native module. Detect it and skip the require.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazily pull MapLibre's component exports ONLY outside Expo Go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ML: any = null;
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ML = require("@maplibre/maplibre-react-native");
}

// Free, keyless OSM raster tiles served by CARTO. Attribution is required and is
// shown via the map's built-in attribution button.
const TILE_URL = {
  light: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  dark: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
};
const ATTRIBUTION = "© OpenStreetMap contributors © CARTO";
const PIN_SIZE = 32;

function buildMapStyle(dark: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [dark ? TILE_URL.dark : TILE_URL.light],
        tileSize: 256,
        attribution: ATTRIBUTION,
      },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

// Pick a zoom level that frames roughly 2.5× the radius diameter for the given
// map pixel height (matches the old react-native-maps region framing).
function zoomForRadius(center: MapCanvasCoords, radiusKm: number, heightPx: number): number {
  const safeRadius = radiusKm > 0 ? radiusKm : 2;
  const latDeltaDeg = Math.max(0.01, (safeRadius * 5) / 111.32); // 2 * 2.5 = 5
  const latRad = (Number(center.latitude) * Math.PI) / 180;
  const h = heightPx > 0 ? heightPx : 210;
  const z = Math.log2((156543.03392 * Math.cos(latRad) * h) / (111320 * latDeltaDeg));
  return Math.min(18, Math.max(2, z));
}

// A GeoJSON polygon approximating a circle of `radiusKm` around `center`.
function circleFeature(center: MapCanvasCoords, radiusKm: number): GeoJSON.Feature {
  const points = 64;
  const latOff = radiusKm / 111.32;
  const lngOff = radiusKm / (111.32 * Math.cos((Number(center.latitude) * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    ring.push([
      Number(center.longitude) + lngOff * Math.cos(theta),
      Number(center.latitude) + latOff * Math.sin(theta),
    ]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} };
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
  const cameraRef = useRef<CameraRef>(null);
  const zoomRef = useRef<number>(zoomForRadius(center, radiusKm, height));
  // Remember the last coordinate WE emitted so an external `center` change
  // (e.g. a "use my location" button) recenters the map, while our own pan/tap
  // does not fight the user by re-animating.
  const lastEmitted = useRef<string | null>(null);
  // Ignore the region-change event caused by our OWN programmatic camera moves
  // (initial load, tap, zoom buttons, external recenter) so only user pans emit.
  const suppressRegion = useRef<boolean>(true);

  const isPicker = !readonly && !interactive;
  const gesturesOn = !readonly && gesturesEnabled;

  const centerLngLat: [number, number] = [Number(center.longitude), Number(center.latitude)];

  // Recenter only on EXTERNAL center changes.
  useEffect(() => {
    if (isExpoGo) return;
    const key = `${center.latitude},${center.longitude}`;
    if (lastEmitted.current === key) return;
    const z = zoomForRadius(center, radiusKm, height);
    zoomRef.current = z;
    suppressRegion.current = true;
    cameraRef.current?.easeTo({
      center: [Number(center.longitude), Number(center.latitude)],
      zoom: z,
      duration: 350,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.latitude, center.longitude, radiusKm, height]);

  // ── Expo Go: no native map available — render a neat placeholder so the app
  //    (and its map screens) still loads. Real maps show in built apps. ────────
  if (isExpoGo) {
    return (
      <View
        style={{
          width: "100%",
          height,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.muted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <MapPin size={28} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
        <Text style={{ marginTop: 8, color: colors.mutedForeground, fontSize: 12, textAlign: "center", paddingHorizontal: 16 }}>
          Map preview is only available in the built app (not Expo Go).
        </Text>
      </View>
    );
  }

  const { Map, Camera, Marker, GeoJSONSource, Layer } = ML;

  const emit = (lng: number, lat: number) => {
    lastEmitted.current = `${lat},${lng}`;
    onCenterChange({ latitude: lat, longitude: lng });
  };

  const handlePress = (e: { nativeEvent: PressEvent }) => {
    if (!isPicker) return;
    const [lng, lat] = e.nativeEvent.lngLat;
    suppressRegion.current = true;
    cameraRef.current?.easeTo({ center: [lng, lat], zoom: zoomRef.current, duration: 250 });
    emit(lng, lat);
  };

  const handleRegionDidChange = (e: { nativeEvent: ViewStateChangeEvent }) => {
    zoomRef.current = e.nativeEvent.zoom;
    if (suppressRegion.current) {
      suppressRegion.current = false;
      return;
    }
    if (isPicker) {
      const [lng, lat] = e.nativeEvent.center;
      emit(lng, lat);
    }
  };

  const zoomBy = (delta: number) => {
    const z = Math.min(19, Math.max(2, zoomRef.current + delta));
    zoomRef.current = z;
    suppressRegion.current = true;
    cameraRef.current?.zoomTo(z, { duration: 200 });
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
      <Map
        style={{ width: "100%", height: "100%" }}
        mapStyle={buildMapStyle(dark)}
        onPress={handlePress}
        onRegionDidChange={handleRegionDidChange}
        dragPan={gesturesOn}
        touchZoom={gesturesOn}
        doubleTapZoom={gesturesOn}
        doubleTapHoldZoom={gesturesOn}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        scaleBar={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: centerLngLat, zoom: zoomRef.current }}
          minZoom={2}
          maxZoom={19}
        />

        {/* Search / selection radius */}
        {radiusKm > 0 && (
          <GeoJSONSource id="radius" data={circleFeature(center, radiusKm)}>
            <Layer
              id="radius-fill"
              type="fill"
              source="radius"
              paint={{ "fill-color": withAlpha(primaryColor, 0.18) }}
            />
            <Layer
              id="radius-line"
              type="line"
              source="radius"
              paint={{ "line-color": primaryColor, "line-width": 2 }}
            />
          </GeoJSONSource>
        )}

        {/* Main pin as a map marker in interactive/readonly modes (stays on the
            location as you pan). In picker mode it's a fixed centre overlay below. */}
        {!isPicker && (
          <Marker lngLat={centerLngLat} anchor="bottom">
            <View>
              <MapPin size={PIN_SIZE} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
            </View>
          </Marker>
        )}

        {/* Secondary pin (e.g. user's current location) — a bright blue dot */}
        {secondaryPin && (
          <Marker
            lngLat={[Number(secondaryPin.longitude), Number(secondaryPin.latitude)]}
            anchor="center"
          >
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
      </Map>

      {/* Picker mode: a fixed pin at the map centre. Its tip points at the exact
          centre coordinate (translated up by half its height). */}
      {isPicker && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ transform: [{ translateY: -PIN_SIZE / 2 }] }}>
            <MapPin size={PIN_SIZE} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
          </View>
        </View>
      )}

      {/* Zoom +/- buttons (whenever gestures are active). Plain object styles —
          NEVER a function style on Pressable (NativeWind drops it). */}
      {gesturesOn && (
        <View style={{ position: "absolute", bottom: 10, left: 10, gap: 6 }}>
          <Pressable
            onPress={(_e: GestureResponderEvent) => zoomBy(1)}
            style={zoomButtonStyle}
            hitSlop={4}
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={(_e: GestureResponderEvent) => zoomBy(-1)}
            style={zoomButtonStyle}
            hitSlop={4}
            accessibilityRole="button"
          >
            <Minus size={18} color={colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
