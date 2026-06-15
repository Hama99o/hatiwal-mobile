import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { View, Pressable, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { MapPin, Plus, Minus } from "lucide-react-native";
import type { MapCanvasProps } from "./MapCanvas.types";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const TILE = 256;
const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 8;
const MAX_ZOOM = 18;
const GRID_RADIUS = 3;
const GRID_SIZE = GRID_RADIUS * 2 + 1;

function lngToWorldX(lng: number, worldPx: number) {
  return ((lng + 180) / 360) * worldPx;
}
function latToWorldY(lat: number, worldPx: number) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * worldPx;
}
function worldXToLng(x: number, worldPx: number) {
  return (x / worldPx) * 360 - 180;
}
function worldYToLat(y: number, worldPx: number) {
  const n = Math.PI * (1 - (2 * y) / worldPx);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}
function wrap(n: number, m: number) {
  return ((n % m) + m) % m;
}
function clampZoom(z: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
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
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [mapCenter, setMapCenter] = useState({
    lat: Number(center.latitude),
    lng: Number(center.longitude),
  });

  // Shared values for live gesture feedback (UI thread only)
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const liveScale = useSharedValue(1);

  // After handlePanEnd updates mapCenter, reset panX/panY synchronously before
  // the next paint. This avoids the "snap-back" glitch caused by resetting in the
  // gesture worklet before React can re-render tiles at the new center.
  const panResetPendingRef = useRef(false);
  useLayoutEffect(() => {
    if (panResetPendingRef.current) {
      panResetPendingRef.current = false;
      panX.value = 0;
      panY.value = 0;
    }
  }, [mapCenter.lat, mapCenter.lng]);

  const vcLat = interactive ? mapCenter.lat : Number(center.latitude);
  const vcLng = interactive ? mapCenter.lng : Number(center.longitude);
  const pinLat = Number(center.latitude);
  const pinLng = Number(center.longitude);

  const worldPx = TILE * Math.pow(2, zoom);
  const tilesPerAxis = Math.pow(2, zoom);

  const vcWorldX = lngToWorldX(vcLng, worldPx);
  const vcWorldY = latToWorldY(vcLat, worldPx);
  const centerTileX = Math.floor(vcWorldX / TILE);
  const centerTileY = Math.floor(vcWorldY / TILE);

  const gridTopLeftX = (centerTileX - GRID_RADIUS) * TILE;
  const gridTopLeftY = (centerTileY - GRID_RADIUS) * TILE;
  const vcInGridX = vcWorldX - gridTopLeftX;
  const vcInGridY = vcWorldY - gridTopLeftY;
  const gridLeft = width / 2 - vcInGridX;
  const gridTop = height / 2 - vcInGridY;

  const pinWorldX = lngToWorldX(pinLng, worldPx);
  const pinWorldY = latToWorldY(pinLat, worldPx);
  const pinInGridX = pinWorldX - gridTopLeftX;
  const pinInGridY = pinWorldY - gridTopLeftY;

  const metersPerPx =
    (156543.03392 * Math.cos((pinLat * Math.PI) / 180)) / Math.pow(2, zoom);
  const circleDiameter = (radiusKm * 1000 * 2) / metersPerPx;

  const tiles = useMemo(() => {
    const result: { key: string; url: string; left: number; top: number }[] = [];
    for (let dx = 0; dx < GRID_SIZE; dx++) {
      for (let dy = 0; dy < GRID_SIZE; dy++) {
        const tx = wrap(centerTileX - GRID_RADIUS + dx, tilesPerAxis);
        const ty = centerTileY - GRID_RADIUS + dy;
        if (ty < 0 || ty >= tilesPerAxis) continue;
        const url = dark
          ? `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tx}/${ty}.png`
          : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`;
        result.push({ key: `${dx}-${dy}`, url, left: dx * TILE, top: dy * TILE });
      }
    }
    return result;
  }, [centerTileX, centerTileY, tilesPerAxis, dark, zoom]);

  // Animated style: pan + live pinch scale applied together
  const tileGridStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: liveScale.value },
    ],
  }));

  const handlePanEnd = (tx: number, ty: number) => {
    panResetPendingRef.current = true;
    const newWorldX = vcWorldX - tx;
    const newWorldY = vcWorldY - ty;
    setMapCenter({
      lat: worldYToLat(newWorldY, worldPx),
      lng: worldXToLng(newWorldX, worldPx),
    });
  };

  const handleZoom = (newZoom: number) => {
    setZoom(clampZoom(Math.round(newZoom)));
  };

  const handleTap = (x: number, y: number) => {
    if (!width) return;
    const worldX = vcWorldX + (x - width / 2);
    const worldY = vcWorldY + (y - height / 2);
    const newLat = worldYToLat(worldY, worldPx);
    const newLng = worldXToLng(worldX, worldPx);
    setMapCenter({ lat: newLat, lng: newLng });
    onCenterChange({ latitude: newLat, longitude: newLng });
  };

  const panGesture = Gesture.Pan()
    .minDistance(6)
    .averageTouches(true)
    .onBegin(() => {
      // Clean slate at gesture start in case a previous useLayoutEffect reset
      // hasn't fired yet (rapid successive pans).
      panX.value = 0;
      panY.value = 0;
    })
    .onUpdate((e) => {
      panX.value = e.translationX;
      panY.value = e.translationY;
    })
    .onEnd((e) => {
      // panX/panY intentionally NOT reset here. useLayoutEffect resets them after
      // mapCenter state updates and tiles re-render at the new position, preventing
      // the one-frame snap-back glitch.
      runOnJS(handlePanEnd)(e.translationX, e.translationY);
    });

  // Pinch: scale the tile grid live; snap to nearest integer zoom on end
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      liveScale.value = Math.max(0.5, Math.min(3, e.scale));
    })
    .onEnd((e) => {
      const delta = Math.log2(Math.max(0.5, Math.min(3, e.scale)));
      liveScale.value = withTiming(1, { duration: 80 });
      runOnJS(handleZoom)(zoom + delta);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(handleTap)(e.x, e.y);
  });

  const gesture = (() => {
    if (interactive) {
      if (!gesturesEnabled) return Gesture.Pan().enabled(false);
      return Gesture.Simultaneous(panGesture, pinchGesture);
    }
    if (!readonly) return tapGesture;
    return Gesture.Pan().enabled(false);
  })();

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const secondaryInGrid =
    width > 0 && secondaryPin
      ? {
          x: lngToWorldX(Number(secondaryPin.longitude), worldPx) - gridTopLeftX,
          y: latToWorldY(Number(secondaryPin.latitude), worldPx) - gridTopLeftY,
        }
      : null;

  const zoomButtonStyle = {
    width: 32,
    height: 32,
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
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={onLayout}
        style={{ width: "100%", height, overflow: "hidden", backgroundColor: colors.mapWater }}
      >
        {width > 0 && (
          <Animated.View
            style={[
              tileGridStyle,
              {
                position: "absolute",
                left: gridLeft,
                top: gridTop,
                width: TILE * GRID_SIZE,
                height: TILE * GRID_SIZE,
              },
            ]}
          >
            {/* Map tiles */}
            {tiles.map((tt) => (
              <Image
                key={tt.key}
                source={{ uri: tt.url }}
                style={{
                  position: "absolute",
                  left: tt.left,
                  top: tt.top,
                  width: TILE,
                  height: TILE,
                }}
                contentFit="cover"
                transition={200}
              />
            ))}

            {/* Radius circle */}
            {circleDiameter > 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: pinInGridX - circleDiameter / 2,
                  top: pinInGridY - circleDiameter / 2,
                  width: circleDiameter,
                  height: circleDiameter,
                  borderRadius: circleDiameter / 2,
                  borderWidth: 2,
                  borderColor: primaryColor,
                  backgroundColor: primaryColor,
                  opacity: 0.18,
                }}
              />
            )}

            {/* Main pin */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: pinInGridX - 14,
                top: pinInGridY - 28,
                width: 28,
                height: 28,
              }}
            >
              <MapPin size={28} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
            </View>

            {/* Secondary pin (user location) */}
            {secondaryInGrid && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: secondaryInGrid.x - 9,
                  top: secondaryInGrid.y - 9,
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
            )}
          </Animated.View>
        )}

        {/* Dark mode overlay */}
        {dark && width > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.overlayButtonBg,
            }}
          />
        )}

        {/* Zoom +/- buttons (interactive mode only) */}
        {interactive && (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              gap: 4,
            }}
          >
            <Pressable
              onPress={() => handleZoom(zoom + 1)}
              style={({ pressed }) => [zoomButtonStyle, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={4}
            >
              <Plus size={16} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => handleZoom(zoom - 1)}
              style={({ pressed }) => [zoomButtonStyle, { opacity: pressed ? 0.7 : 1 }]}
              hitSlop={4}
            >
              <Minus size={16} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
