import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import * as Location from "expo-location";
import { Navigation, Crosshair, Maximize2, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { getCurrentLocation } from "@/utils/geolocation";
import MapCanvas from "./map/MapCanvas";

interface Props {
  latitude: number;
  longitude: number;
  location?: string | null;
  address?: string | null;
}

const PREVIEW_HEIGHT = 220;

export function ListingMapSection({ latitude, longitude, location, address }: Props) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const dark = colors.isDark;
  const { height: screenHeight } = useWindowDimensions();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [permissionState, setPermissionState] = useState<"unknown" | "granted" | "denied">(
    "unknown"
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapModal, setMapModal] = useState(false);

  // Silently check permission and get location on mount if already granted
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status === "granted") {
          setPermissionState("granted");
          getCurrentLocation().then((result) => {
            if (result.coords) setUserLocation(result.coords);
          });
        } else if (status === "denied") {
          setPermissionState("denied");
        }
        // 'undetermined' stays as 'unknown' — button prompts the user
      })
      .catch(() => {});
  }, []);

  const handleShowMyLocation = async () => {
    setLoadingLocation(true);
    const result = await getCurrentLocation();
    setLoadingLocation(false);
    if (result.coords) {
      setUserLocation(result.coords);
      setPermissionState("granted");
    } else {
      setPermissionState(result.error === "denied" ? "denied" : "unknown");
    }
  };

  const handleDirections = () => {
    const dest = `${latitude},${longitude}`;
    // iOS: Apple Maps with driving directions; Android: Google Maps universal deep-link
    const url =
      Platform.OS === "ios"
        ? `maps://app?daddr=${dest}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
    });
  };

  const rowDir = isRtl ? "row-reverse" : "row";
  const closeEdge = isRtl ? { left: 16 } : { right: 16 };
  const directionsEdge = isRtl ? { right: 16 } : { left: 16 };
  const gpsEdge = isRtl ? { left: 16 } : { right: 16 };

  return (
    <View style={{ gap: 12 }}>
      {/* ── Static preview — tap to open fullscreen ───────────────────── */}
      <View
        style={{
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Map renders behind the Pressable overlay so gestures don't conflict */}
        <MapCanvas
          center={{ latitude, longitude }}
          radiusKm={0}
          onCenterChange={() => {}}
          height={PREVIEW_HEIGHT}
          primaryColor={colors.primary}
          dark={dark}
          secondaryPin={userLocation ?? undefined}
          readonly
          interactive={false}
          gesturesEnabled={false}
        />

        {/* Full-area Pressable overlay — opens modal on tap */}
        <Pressable
          onPress={() => setMapModal(true)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityRole="button"
          accessibilityLabel={t("listing.detail.mapTapToInteract")}
        >
          {/* Expand hint icon — bottom corner */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 8,
              ...(isRtl ? { left: 8 } : { right: 8 }),
              backgroundColor: colors.card,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Maximize2 size={13} color={colors.mutedForeground} />
          </View>
        </Pressable>
      </View>

      {/* ── Address / location text ───────────────────────────────────── */}
      {(address || location) && (
        <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              flex: 1,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {address || location}
          </Text>
        </View>
      )}

      {/* ── Get Directions button ────────────────────────────────────── */}
      <Pressable
        onPress={handleDirections}
        style={{
          flexDirection: rowDir,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 11,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.primaryAlpha,
        }}
      >
        <Navigation size={16} color={colors.primary} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
          {t("listing.detail.getDirections")}
        </Text>
      </Pressable>

      {/* ── Fullscreen map modal ──────────────────────────────────────── */}
      <Modal
        visible={mapModal}
        animationType="slide"
        onRequestClose={() => setMapModal(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Full-screen interactive map */}
          <MapCanvas
            center={{ latitude, longitude }}
            radiusKm={0}
            onCenterChange={() => {}}
            height={screenHeight}
            primaryColor={colors.primary}
            dark={dark}
            secondaryPin={userLocation ?? undefined}
            readonly
            interactive
            gesturesEnabled
          />

          {/* Close button — top corner, safe area offset */}
          <Pressable
            onPress={() => setMapModal(false)}
            hitSlop={12}
            style={{
              position: "absolute",
              top: 48,
              ...closeEdge,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.22,
              shadowRadius: 4,
              elevation: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("listing.detail.mapDone")}
          >
            <X size={18} color={colors.foreground} />
          </Pressable>

          {/* Bottom action row */}
          <View
            style={{
              position: "absolute",
              bottom: 40,
              left: 16,
              right: 16,
              flexDirection: rowDir,
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Get Directions */}
            <Pressable
              onPress={() => {
                setMapModal(false);
                handleDirections();
              }}
              style={{
                flex: 1,
                flexDirection: rowDir,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 11,
                borderRadius: 24,
                backgroundColor: colors.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Navigation size={16} color={colors.primaryForeground} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primaryForeground }}>
                {t("listing.detail.getDirections")}
              </Text>
            </Pressable>

            {/* My Location — only when GPS not denied */}
            {permissionState !== "denied" && (
              <Pressable
                onPress={handleShowMyLocation}
                disabled={loadingLocation}
                hitSlop={8}
                style={{
                  flexDirection: rowDir,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 11,
                  paddingHorizontal: 16,
                  borderRadius: 24,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4,
                  opacity: loadingLocation ? 0.6 : 1,
                }}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Crosshair size={16} color={colors.primary} />
                )}
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                  {t("listing.detail.showMyLocation")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
