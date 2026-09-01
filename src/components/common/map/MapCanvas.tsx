/**
 * MapCanvas — native map built on `@maplibre/maplibre-react-native` (MapLibre GL).
 *
 * ONE implementation for Android AND iOS. Both platforms used to run different
 * code (Android: MapLibre + CARTO raster tiles; iOS: `react-native-maps` +
 * Apple Maps) split across `MapCanvas.android.tsx` / `MapCanvas.ios.tsx`.
 * MapLibre supports both platforms natively, so there is no reason for two
 * files any more — this collapses them into one, which is less code AND
 * guarantees the two platforms render an identical map instead of drifting.
 *
 * Tiles + styles come from Hatiwal's own self-hosted basemap at
 * `map.hatiwal.com` (see `../../../../../hatiwal-map/README.md`) — vector
 * tiles covering Afghanistan, zoom 0-14 with smooth overzoom past that. No API
 * key, no request cap, no third-party watermark, no OSM tile-policy risk.
 * This REPLACES two prior, both broken/borrowed setups:
 *   - Android read CARTO's "free" raster endpoints, which CARTO has since
 *     started keying — the tile request still returns HTTP 200 but the image
 *     itself is watermarked "API KEY REQUIRED" diagonally across the map.
 *   - A stopgap pointed Android at `tile.openstreetmap.org`, a courtesy
 *     service that explicitly discourages app traffic — never shipped widely,
 *     replaced here rather than kept.
 * The old dark-mode trick — inverting a LIGHT raster tile's luminance via
 * `raster-brightness`/`raster-hue-rotate` paint properties, because no keyless
 * dark raster tileset existed — is gone too. It is no longer needed: our own
 * `hatiwal-dark-*` styles are real vector dark styles, designed dark from the
 * start (see hatiwal-map's style palette), not a filter over a light image.
 *
 * The style is picked by BOTH the app's theme (light/dark, the `dark` prop)
 * AND its current language (en/ps/fa, read from i18n) — see `styleUrl()`
 * below. The ps/fa styles render Kabul's streets/districts in real joined
 * Arabic script (falling back name:ps -> name:fa -> name -> name:latin
 * server-side; see hatiwal-map/README.md §8) instead of a Latin
 * transliteration, which is the whole point of shipping them.
 *
 * The tileset only covers Afghanistan (see AFGHANISTAN_BOUNDS below, which
 * matches every style's own declared source bounds exactly) — outside it
 * there are no tiles to show, so the camera is bounds-locked to the country.
 * Attribution is a licence condition of the underlying OpenMapTiles data, not
 * decoration — `attribution={true}` below keeps MapLibre's attribution
 * control on screen; do not disable it.
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
 * pin-drag. Tapping the map still recentres onto the tapped point. (This is the
 * one interaction iOS gains from converging onto MapLibre: it previously
 * dragged the pin directly via `react-native-maps`; the pan-to-centre pattern
 * below is what Android has always shipped and is fully native/gesture-driven.)
 */

import { useEffect, useMemo, useRef } from "react";
import { View, Pressable, type GestureResponderEvent } from "react-native";
import { Text } from "@/components/reusables/text";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { MapPin, Plus, Minus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { withAlpha } from "@/lib/color";
import type { MapCanvasProps, MapCanvasCoords } from "./MapCanvas.types";
// Type-only import — erased at runtime, so it never triggers the native module
// lookup that crashes Expo Go.
import type { CameraRef, PressEvent, ViewStateChangeEvent, LngLatBounds } from "@maplibre/maplibre-react-native";

// Expo Go can't load MapLibre's native module. Detect it and skip the require.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazily pull MapLibre's component exports ONLY outside Expo Go.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ML: any = null;
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ML = require("@maplibre/maplibre-react-native");
}

// Self-hosted basemap host — same EXPO_PUBLIC_* + fallback pattern as
// src/api/http.ts's BASE_URL. The map host is public (no auth, no key), so a
// committed fallback is safe — it is not a secret.
const MAP_BASE_URL = process.env.EXPO_PUBLIC_MAP_URL || "https://map.hatiwal.com";

// The 3 languages that map.hatiwal.com has a pre-built style for. Any other
// app language (there isn't one today) falls back to the English style.
const STYLE_LANGUAGES = new Set(["en", "ps", "fa"]);

/** `/styles/hatiwal-{light|dark}-{en|ps|fa}.json` — one of the 6 styles served by map.hatiwal.com. */
function styleUrl(dark: boolean, lang: string): string {
  const locale = STYLE_LANGUAGES.has(lang) ? lang : "en";
  return `${MAP_BASE_URL}/styles/hatiwal-${dark ? "dark" : "light"}-${locale}.json`;
}

// Afghanistan bounding box — matches the `bounds` declared on the `hatiwal`
// vector source in every hatiwal-{light,dark}-{en,ps,fa} style exactly (west,
// south, east, north). The tileset has no data outside it, and for a local
// marketplace where every listing is in-country, locking the camera here is
// better UX, not just a technical necessity.
//
// This constrains the VIEWPORT only, not the data: `maxBounds` clamps where
// the CAMERA can visually center, but never touches the `center`/`coords`
// value a caller holds in its own state (see LocationRangePicker's
// handleUseMyLocation -> setCoords). A seller whose GPS resolves abroad
// (maestro/maps/map_location_outside_afghanistan.yaml exists specifically to
// keep that working) still gets their true coordinate saved — the map may
// simply be unable to visually pan all the way to it, an acceptable, rare
// cosmetic tradeoff for keeping every in-country pan/zoom sane and on-tileset.
const AFGHANISTAN_BOUNDS: LngLatBounds = [60.48761, 29.368563, 74.90017, 38.50674];

const PIN_SIZE = 32;

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
  controlsBottomInset = 10,
  secondaryPin,
  readonly,
  interactive,
  gesturesEnabled = true,
}: MapCanvasProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
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

  // Style changes with EITHER the theme or the app language — both are read
  // live, so toggling either updates the map without remounting it.
  const mapStyle = useMemo(() => styleUrl(dark, i18n.language), [dark, i18n.language]);

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
        <Text
          style={{
            marginTop: 8,
            color: colors.mutedForeground,
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: 16,
          }}
        >
          {t("common.mapPreviewUnavailable")}
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
    <View
      testID="map-canvas"
      style={{ width: "100%", height, overflow: "hidden", backgroundColor: colors.background }}
    >
      <Map
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
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
        // Licence condition of the OpenMapTiles-derived tiles, not decoration —
        // every style already carries "© OpenMapTiles © OpenStreetMap
        // contributors" on its source; this keeps MapLibre's control visible
        // so that credit actually reaches the screen. Never set this false.
        attribution
        // Same clearance as the zoom controls, and for the same reason: in the
        // fullscreen listing map the caller paints a "Get Directions" /
        // "My Location" row across the bottom, and this badge sat underneath it.
        // It cannot simply be moved or hidden — attribution is a LICENCE
        // CONDITION of the OpenMapTiles-derived data, so "covered" is not an
        // acceptable resting state for it. Opposite corner from the zoom stack,
        // so the two never collide.
        attributionPosition={{ bottom: controlsBottomInset, right: 8 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: centerLngLat, zoom: zoomRef.current }}
          minZoom={2}
          maxZoom={19}
          maxBounds={AFGHANISTAN_BOUNDS}
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
        /* `controlsBottomInset`, not a hardcoded 10: a caller that paints its own
           chrome over the map (the fullscreen modal's "Get Directions" /
           "My Location" row) would otherwise cover these buttons. Reported from a
           device — and NO assertion caught it, because Maestro reads visibility
           from the view hierarchy, where an OCCLUDED element still counts as
           visible. Same blind spot as the dark-basemap bug: only looking finds
           it. */
        <View
          style={{
            position: "absolute",
            bottom: controlsBottomInset,
            left: 10,
            gap: 6,
          }}
        >
          <Pressable
            onPress={(_e: GestureResponderEvent) => zoomBy(1)}
            style={zoomButtonStyle}
            hitSlop={4}
            // QA: neither zoom control carried a testID, so nothing could target
            // them. They still lack an accessibilityLabel — icon-only controls
            // announce as an unnamed button to a screen reader. Flagged rather
            // than fixed here: that needs new copy in all three locales.
            testID="map-zoom-in"
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={(_e: GestureResponderEvent) => zoomBy(-1)}
            style={zoomButtonStyle}
            hitSlop={4}
            testID="map-zoom-out"
            accessibilityRole="button"
          >
            <Minus size={18} color={colors.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
