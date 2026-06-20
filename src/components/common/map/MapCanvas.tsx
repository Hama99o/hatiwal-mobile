import { useState, useMemo } from "react";
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
const GRID_RADIUS = 4;
const GRID_SIZE = GRID_RADIUS * 2 + 1;
// Re-anchor the tile grid once the committed pan offset gets within one tile of
// the rendered grid's edge — keeps a healthy buffer so a single drag never
// reaches blank space, while keeping re-renders (and any rebase work) rare.
const REBASE_BUFFER = (GRID_RADIUS - 1) * TILE;

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

  // Pan offset is split in two so a finger-release never triggers a re-render
  // (which is what caused the "hold → jump → settle" glitch):
  //   • panX/panY  — the LIVE delta of the in-progress drag (0 when idle).
  //   • accX/accY  — the COMMITTED offset, accumulated across gestures. On
  //                  release we simply fold the live delta into the committed
  //                  offset on the UI thread — no setState, no tile re-render,
  //                  so the map stays exactly where the finger left it.
  // Tiles are only re-anchored (setMapCenter) lazily, once the committed offset
  // approaches the rendered grid's edge — see handlePanEnd / REBASE_BUFFER.
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const accX = useSharedValue(0);
  const accY = useSharedValue(0);
  const liveScale = useSharedValue(1);

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

  // Animated style: committed offset + live drag delta + live pinch scale.
  const tileGridStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: accX.value + panX.value },
      { translateY: accY.value + panY.value },
      { scale: liveScale.value },
    ],
  }));

  // Called after a drag is committed. Most releases do nothing — the map keeps
  // the committed offset and never re-renders. Only when the offset nears the
  // grid edge do we move the tile anchor to the current viewport centre, and we
  // back-solve the residual offset so `gridPos + offset` is identical before and
  // after — i.e. the visible position does not move. Both the shared-value write
  // and setMapCenter happen here on the JS thread, so they land together.
  const handlePanEnd = () => {
    if (!interactive) return;
    const ax = accX.value;
    const ay = accY.value;
    if (Math.abs(ax) < REBASE_BUFFER && Math.abs(ay) < REBASE_BUFFER) return;

    const newVcWorldX = vcWorldX - ax;
    const newVcWorldY = vcWorldY - ay;
    const newCenterTileX = Math.floor(newVcWorldX / TILE);
    const newCenterTileY = Math.floor(newVcWorldY / TILE);
    const newGridLeft = width / 2 - (newVcWorldX - (newCenterTileX - GRID_RADIUS) * TILE);
    const newGridTop = height / 2 - (newVcWorldY - (newCenterTileY - GRID_RADIUS) * TILE);

    accX.value = gridLeft + ax - newGridLeft;
    accY.value = gridTop + ay - newGridTop;
    setMapCenter({
      lat: worldYToLat(newVcWorldY, worldPx),
      lng: worldXToLng(newVcWorldX, worldPx),
    });
  };

  const handleZoom = (newZoom: number) => {
    const clamped = clampZoom(Math.round(newZoom));
    // The committed offset is in pixels at the current zoom; rescale it so the
    // viewport centre stays put across the zoom change (world px scale by 2^Δ).
    const ratio = Math.pow(2, clamped - zoom);
    accX.value = accX.value * ratio;
    accY.value = accY.value * ratio;
    setZoom(clamped);
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
      panX.value = 0;
      panY.value = 0;
    })
    .onUpdate((e) => {
      panX.value = e.translationX;
      panY.value = e.translationY;
    })
    .onEnd((e) => {
      // Fold the drag into the committed offset on the UI thread. Because
      // (accX + panX) is unchanged at this instant — accX gains exactly what
      // panX loses — there is zero visual movement on release, no setState, and
      // no tile re-render. The map simply stays where the finger left it.
      accX.value += e.translationX;
      accY.value += e.translationY;
      panX.value = 0;
      panY.value = 0;
      runOnJS(handlePanEnd)();
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
