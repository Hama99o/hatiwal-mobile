import { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  type LayoutChangeEvent,
} from "react-native";
import { X, MapPin, Check, TriangleAlert, Search } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import {
  getCurrentLocation,
  getCurrentLocationIfPermitted,
  type GeoErrorCode,
} from "@/utils/geolocation";
import { showPermissionDeniedAlert } from "@/lib/permissions";
import { searchPlaces, reverseGeocode, type GeocodeResult } from "@/utils/geocoding";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapCanvas from "./map/MapCanvas";
import { DEFAULT_CENTER, type MapCanvasCoords } from "./map/MapCanvas.types";

/** Preset search radii (km). Shared with Browse so the chips stay in sync. */
export const RADIUS_PRESETS = [1, 5, 10, 25, 50] as const;

export interface LocationRangeValue {
  coords: MapCanvasCoords;
  radiusKm: number;
  label: string | null; // human-readable place name, when known
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialCoords: MapCanvasCoords | null;
  initialRadius: number;
  onConfirm: (value: LocationRangeValue) => void;
  /** "range" (buyer: point + radius) or "point" (seller: exact location). */
  mode?: "range" | "point";
  /** Previously chosen place name — prefilled so re-opening keeps it. */
  initialLabel?: string | null;
}

export function LocationRangePicker({
  visible,
  onClose,
  initialCoords,
  initialRadius,
  onConfirm,
  mode = "range",
  initialLabel = null,
}: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  // Read the APP's theme via `colors.isDark` — not the nativewind color-scheme
  // hook this component used to call.
  //
  // This map rendered the LIGHT basemap inside dark chrome on both surfaces this
  // component owns — the browse filter and the create-listing pin picker — while
  // the listing-detail map (ListingMapSection, which already read
  // `colors.isDark`) was correctly dark in the same app, same cell, same tile
  // server. Caught by EYE in the map QA matrix screenshots, not by an assertion:
  // every testID was present and every step passed.
  //
  // Cause: this app's theme is its OWN store (`useThemeStore` via `useColors`:
  // "system" follows the OS, "dark"/"light" is an explicit user choice). The
  // nativewind hook does not read that store, so a user who picks Dark IN THE
  // APP on a light-OS phone got a light map — precisely the configuration the QA
  // cells run in, and the one most users who prefer dark are in.
  //
  // This was the last such consumer in src/; 144 files use `useColors()`.
  const dark = colors.isDark;
  const insets = useSafeAreaInsets();

  const [coords, setCoords] = useState<MapCanvasCoords>(initialCoords ?? DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState<number>(initialRadius || 5);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoError, setGeoError] = useState<GeoErrorCode | null>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // When we seed the search box with the existing label on open, skip the
  // auto-search for that seeded value so a dropdown doesn't pop up immediately.
  const skipSearchRef = useRef(false);

  const onMapLayout = (e: LayoutChangeEvent) => setMapHeight(e.nativeEvent.layout.height);

  // Debounced free-text place search (any village/city/landmark) via geocoding.
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const found = await searchPlaces(q);
      setResults(found);
      setSearching(false);
    }, 450);
    return () => clearTimeout(handle);
  }, [query]);

  const handleSelectResult = (result: GeocodeResult) => {
    // Picking a result means the seller is DONE typing, and leaving the IME up
    // hides the bottom of the sheet — which is exactly where "Confirm location"
    // sits. On a 360dp/411dp phone the sequence was: search "Herat", tap the
    // result, watch the pin land correctly, and then find no way to confirm it
    // (verified by screenshot: pin on هرات, confirm button entirely behind the
    // IME). Dismissing here is what the tap already implies, and unlike wrapping
    // the sheet in KeyboardAvoidingView it does not resize the map while typing.
    Keyboard.dismiss();
    setCoords({ latitude: result.latitude, longitude: result.longitude });
    setSelectedLabel(result.detail ? `${result.label}, ${result.detail}` : result.label);
    setQuery("");
    setResults([]);
    setGeoError(null);
  };

  // Dragging/tapping the map invalidates any previously chosen place name.
  const handleCenterChange = (c: MapCanvasCoords) => {
    setCoords(c);
    setSelectedLabel(null);
  };

  const geoErrorMessage = (code: GeoErrorCode): string => {
    switch (code) {
      case "denied":
        return t("browse.locationDenied");
      case "timeout":
        return t("browse.locationTimeout");
      case "unsupported":
        return t("browse.locationUnsupported");
      default:
        return t("browse.locationUnavailable");
    }
  };

  // Re-sync when the modal is re-opened with new initial values.
  useEffect(() => {
    if (visible) {
      setCoords(initialCoords ?? DEFAULT_CENTER);
      setRadiusKm(initialRadius || 5);
      setGeoError(null);
      // Prefill the search box with the current place name (don't auto-search it).
      skipSearchRef.current = !!initialLabel;
      setQuery(initialLabel ?? "");
      setResults([]);
      setSelectedLabel(initialLabel);
    }
  }, [visible, initialCoords, initialRadius, initialLabel]);

  // Centre on the user BY DEFAULT when we already have permission.
  //
  // DEFAULT_CENTER is Kabul city centre. Before this, the map always opened
  // there and "Use my location" was the ONLY way to move it — so a seller in
  // Herat or Kandahar who had already granted location permission still got a
  // Kabul pin, and if they did not notice they published a listing pinned to the
  // wrong city. On a marketplace where buyers filter by area and meet in person,
  // that is a data bug, not a cosmetic one.
  //
  // Two guards make this safe:
  //   * `initialCoords` wins — editing a listing must keep its saved pin, and a
  //     buyer re-opening the radius filter must keep the area they chose.
  //   * `getCurrentLocationIfPermitted` NEVER prompts. Firing the OS permission
  //     dialog just because a sheet opened would be worse than the bug, and a
  //     dialog shown at the wrong moment tends to get denied — which then
  //     poisons the setting for the button that legitimately asks.
  useEffect(() => {
    if (!visible || initialCoords) return;
    let cancelled = false;
    getCurrentLocationIfPermitted().then((c) => {
      // Don't fight the user: if they moved the pin or picked a place while the
      // fix was in flight, leave it alone.
      if (cancelled || !c) return;
      setCoords((prev) =>
        prev.latitude === DEFAULT_CENTER.latitude && prev.longitude === DEFAULT_CENTER.longitude
          ? { latitude: c.latitude, longitude: c.longitude }
          : prev
      );
    });
    return () => {
      cancelled = true;
    };
  }, [visible, initialCoords]);

  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    setGeoError(null);
    try {
      const result = await getCurrentLocation();
      if (result.coords) {
        setCoords({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        setSelectedLabel(null);
      } else if (result.error) {
        // Persistent inline banner (below) always shows the "location permission
        // needed" state so it never depends on the user noticing a transient alert —
        // no crash/hang either way. For the specifically-actionable "denied" case we
        // additionally surface the centralized, localized alert with an Open Settings
        // shortcut (Q3 audit, 2026-07-03) — timeout/unavailable/unsupported are not
        // permission issues, so Settings wouldn't help there.
        setGeoError(result.error);
        if (result.error === "denied") {
          showPermissionDeniedAlert("location", t);
        }
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handleConfirm = async () => {
    // Resolve a readable place name for the chosen point if we don't have one.
    let label = selectedLabel;
    if (!label) {
      setConfirming(true);
      label = await reverseGeocode(coords.latitude, coords.longitude);
      setConfirming(false);
    }
    onConfirm({ coords, radiusKm, label });
    onClose();
  };

  const rowDir = isRtl ? "row-reverse" : "row";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: rowDir,
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 52,
            paddingBottom: 12,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
            <X size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
            {mode === "point" ? t("listing.form.pickLocation") : t("browse.setLocationRange")}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Place search — a dedicated bar at the top, above the map */}
        <View
          style={{
            backgroundColor: colors.card,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: results.length > 0 ? 0 : 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: rowDir,
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.muted,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 46,
            }}
          >
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              testID="location-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder={t("browse.searchLocation")}
              placeholderTextColor={colors.mutedForeground}
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.foreground,
                textAlign: isRtl ? "right" : "left",
              }}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : query.length > 0 ? (
              <Pressable onPress={() => { setQuery(""); setResults([]); }} hitSlop={8}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          {/* Results — in normal flow, pushes the map down (never overlaps it) */}
          {results.length > 0 && (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
              {results.map((r, i) => (
                <Pressable
                  key={`${r.latitude},${r.longitude},${i}`}
                  testID="location-search-result"
                  onPress={() => handleSelectResult(r)}
                  style={{
                    flexDirection: rowDir,
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 4,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <MapPin size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                      {r.label}
                    </Text>
                    {!!r.detail && (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }} numberOfLines={1}>
                        {r.detail}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Map */}
        <View style={{ flex: 1 }} onLayout={onMapLayout}>
          {mapHeight > 0 && (
            <MapCanvas
              center={coords}
              radiusKm={mode === "range" ? radiusKm : 0}
              onCenterChange={handleCenterChange}
              height={mapHeight}
              primaryColor={colors.primary}
              dark={dark}
            />
          )}
        </View>

        {/* Controls */}
        <View
          style={{
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 14,
            // Clear the Android system nav bar with a 12px breathing gap
            // (28 on devices without a nav bar, matching the original).
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            gap: 14,
          }}
        >
          {/* Inline geolocation error — Alert.alert is unreliable on web */}
          {geoError && (
            <View
              style={{
                flexDirection: rowDir,
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.warningAlpha,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <TriangleAlert size={16} color={colors.warning} />
              <Text style={{ flex: 1, fontSize: 12, color: colors.foreground, textAlign: isRtl ? "right" : "left" }}>
                {geoErrorMessage(geoError)}
              </Text>
            </View>
          )}

          {/* Use my location — its own dedicated button, not overlapping the map */}
          {/* testID: while acquiring GPS the label is replaced by a spinner, so
              the words cannot identify this button for its whole lifetime. */}
          <Pressable
            testID="location-use-my-location"
            onPress={handleUseMyLocation}
            disabled={gpsLoading}
            style={{
              flexDirection: rowDir,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 12,
            }}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MapPin size={18} color={colors.primary} />
            )}
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
              {t("browse.useMyLocation")}
            </Text>
          </Pressable>

          {/* Radius chips — only for buyer "range" mode */}
          {mode === "range" && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground }}>
                {t("browse.searchRadius")}
              </Text>
              <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 8 }}>
                {RADIUS_PRESETS.map((km) => {
                  const selected = radiusKm === km;
                  return (
                    <Pressable
                      key={km}
                      testID={`location-radius-${km}`}
                      onPress={() => setRadiusKm(km)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.background,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? "700" : "500",
                          color: selected ? colors.primaryForeground : colors.foreground,
                        }}
                      >
                        {km} {t("browse.km")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* testID: same reason — the label swaps to a spinner while the chosen
              point is reverse-geocoded. */}
          <Pressable
            testID="location-confirm"
            onPress={handleConfirm}
            disabled={confirming}
            style={{
              flexDirection: rowDir,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
              opacity: confirming ? 0.7 : 1,
            }}
          >
            {confirming ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Check size={18} color={colors.primaryForeground} />
            )}
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryForeground }}>
              {t("browse.confirmLocation")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
