import { useState, useEffect } from "react";
import { Modal, View, Pressable, ActivityIndicator, type LayoutChangeEvent } from "react-native";
import { X, MapPin, Check, TriangleAlert } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { useColorScheme } from "nativewind";
import { useColors } from "@/hooks/useColors";
import { getCurrentLocation, type GeoErrorCode } from "@/utils/geolocation";
import MapCanvas from "./map/MapCanvas";
import { DEFAULT_CENTER, type MapCanvasCoords } from "./map/MapCanvas.types";

/** Preset search radii (km). Shared with Browse so the chips stay in sync. */
export const RADIUS_PRESETS = [1, 5, 10, 25, 50] as const;

export interface LocationRangeValue {
  coords: MapCanvasCoords;
  radiusKm: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialCoords: MapCanvasCoords | null;
  initialRadius: number;
  onConfirm: (value: LocationRangeValue) => void;
}

export function LocationRangePicker({
  visible,
  onClose,
  initialCoords,
  initialRadius,
  onConfirm,
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

  const onMapLayout = (e: LayoutChangeEvent) => setMapHeight(e.nativeEvent.layout.height);

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
    }
  }, [visible, initialCoords, initialRadius]);

  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    setGeoError(null);
    try {
      const result = await getCurrentLocation();
      if (result.coords) {
        setCoords({ latitude: result.coords.latitude, longitude: result.coords.longitude });
      } else if (result.error) {
        setGeoError(result.error);
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({ coords, radiusKm });
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
            {t("browse.setLocationRange")}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Map */}
        <View style={{ flex: 1 }} onLayout={onMapLayout}>
          {mapHeight > 0 && (
            <MapCanvas
              center={coords}
              radiusKm={radiusKm}
              onCenterChange={setCoords}
              height={mapHeight}
              primaryColor={colors.primary}
              dark={dark}
            />
          )}

          {/* Floating "Use my location" button */}
          <Pressable
            onPress={handleUseMyLocation}
            disabled={gpsLoading}
            style={{
              position: "absolute",
              bottom: 16,
              right: isRtl ? undefined : 16,
              left: isRtl ? 16 : undefined,
              flexDirection: rowDir,
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.card,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MapPin size={16} color={colors.primary} />
            )}
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
              {t("browse.useMyLocation")}
            </Text>
          </Pressable>
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

          <Pressable
            onPress={handleConfirm}
            style={{
              flexDirection: rowDir,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Check size={18} color={colors.primaryForeground} />
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primaryForeground }}>
              {t("browse.confirmLocation")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
