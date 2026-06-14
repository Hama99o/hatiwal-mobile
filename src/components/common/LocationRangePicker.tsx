import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  type LayoutChangeEvent,
} from "react-native";
import { X, MapPin, Check, TriangleAlert, Search } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { useColorScheme } from "nativewind";
import { useColors } from "@/hooks/useColors";
import { getCurrentLocation, type GeoErrorCode } from "@/utils/geolocation";
import { searchPlaces, reverseGeocode, type GeocodeResult } from "@/utils/geocoding";
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
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";

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

  const onMapLayout = (e: LayoutChangeEvent) => setMapHeight(e.nativeEvent.layout.height);

  // Debounced free-text place search (any village/city/landmark) via geocoding.
  useEffect(() => {
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
      setQuery("");
      setResults([]);
      setSelectedLabel(initialLabel);
    }
  }, [visible, initialCoords, initialRadius, initialLabel]);

  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    setGeoError(null);
    try {
      const result = await getCurrentLocation();
      if (result.coords) {
        setCoords({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        setSelectedLabel(null);
      } else if (result.error) {
        setGeoError(result.error);
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
            paddingBottom: 28,
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
          <Pressable
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

          <Pressable
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
