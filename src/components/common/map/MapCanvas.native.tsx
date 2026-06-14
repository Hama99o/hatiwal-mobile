import { useState, useMemo } from "react";
import { View, Pressable, type LayoutChangeEvent, type GestureResponderEvent } from "react-native";
import { Image } from "expo-image";
import { MapPin } from "lucide-react-native";
import type { MapCanvasProps } from "./MapCanvas.types";

/**
 * Native map canvas — renders raw OpenStreetMap raster tiles in a 3×3 grid
 * centered on the selected point, with a radius circle + pin overlaid.
 *
 * No map library, no WebView: just tile math + <Image>. Keyless tiles keep it
 * dependency-free and Expo Go compatible. Tap the map to move the pin.
 */

const TILE = 256;
const ZOOM = 12;

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

export default function MapCanvas({
  center,
  radiusKm,
  onCenterChange,
  height,
  primaryColor,
  dark,
}: MapCanvasProps) {
  const [width, setWidth] = useState(0);

  const worldPx = TILE * Math.pow(2, ZOOM);
  const tilesPerAxis = Math.pow(2, ZOOM);

  const centerWorldX = lngToWorldX(center.longitude, worldPx);
  const centerWorldY = latToWorldY(center.latitude, worldPx);

  const centerTileX = Math.floor(centerWorldX / TILE);
  const centerTileY = Math.floor(centerWorldY / TILE);

  // Top-left world pixel of the 3×3 grid.
  const gridTopLeftX = (centerTileX - 1) * TILE;
  const gridTopLeftY = (centerTileY - 1) * TILE;

  // Where the center coordinate sits inside the grid, then offset so it lands
  // at the middle of the visible viewport.
  const pointInGridX = centerWorldX - gridTopLeftX;
  const pointInGridY = centerWorldY - gridTopLeftY;
  const gridLeft = width / 2 - pointInGridX;
  const gridTop = height / 2 - pointInGridY;

  // Meters-per-pixel (Web Mercator) → circle diameter in px.
  const metersPerPx =
    (156543.03392 * Math.cos((center.latitude * Math.PI) / 180)) / Math.pow(2, ZOOM);
  const circleDiameter = (radiusKm * 1000 * 2) / metersPerPx;

  const tiles = useMemo(() => {
    const result: { key: string; url: string; left: number; top: number }[] = [];
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        const tx = wrap(centerTileX - 1 + dx, tilesPerAxis);
        const ty = centerTileY - 1 + dy;
        if (ty < 0 || ty >= tilesPerAxis) continue;
        const url = dark
          ? `https://a.basemaps.cartocdn.com/dark_all/${ZOOM}/${tx}/${ty}.png`
          : `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`;
        result.push({ key: `${dx}-${dy}`, url, left: dx * TILE, top: dy * TILE });
      }
    }
    return result;
  }, [centerTileX, centerTileY, tilesPerAxis, dark]);

  const handlePress = (e: GestureResponderEvent) => {
    if (!width) return;
    const { locationX, locationY } = e.nativeEvent;
    const worldX = centerWorldX + (locationX - width / 2);
    const worldY = centerWorldY + (locationY - height / 2);
    onCenterChange({
      latitude: worldYToLat(worldY, worldPx),
      longitude: worldXToLng(worldX, worldPx),
    });
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Pressable
      onLayout={onLayout}
      onPress={handlePress}
      style={{ width: "100%", height, overflow: "hidden", backgroundColor: "#e5e7eb" }}
    >
      {width > 0 && (
        <View style={{ position: "absolute", left: gridLeft, top: gridTop, width: TILE * 3, height: TILE * 3 }}>
          {tiles.map((tt) => (
            <Image
              key={tt.key}
              source={{ uri: tt.url }}
              style={{ position: "absolute", left: tt.left, top: tt.top, width: TILE, height: TILE }}
              contentFit="cover"
              transition={150}
            />
          ))}
        </View>
      )}

      {/* Radius circle — centered on the viewport (= selected point) */}
      {width > 0 && circleDiameter > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: width / 2 - circleDiameter / 2,
            top: height / 2 - circleDiameter / 2,
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

      {/* Center pin */}
      {width > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: width / 2 - 14,
            top: height / 2 - 28,
            width: 28,
            height: 28,
          }}
        >
          <MapPin size={28} color={primaryColor} fill={primaryColor} strokeWidth={1.5} />
        </View>
      )}
    </Pressable>
  );
}
