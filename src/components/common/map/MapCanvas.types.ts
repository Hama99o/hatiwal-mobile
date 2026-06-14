export interface MapCanvasCoords {
  latitude: number;
  longitude: number;
}

export interface MapCanvasProps {
  /** Center of the map / the selected point. */
  center: MapCanvasCoords;
  /** Search radius in kilometers — drawn as a shaded circle. */
  radiusKm: number;
  /** Called when the user moves the pin (drag or tap on the map). */
  onCenterChange: (coords: MapCanvasCoords) => void;
  /** Pixel height of the map area. */
  height: number;
  /** Theme primary color (hsl/rgb string) used for the radius circle + pin. */
  primaryColor: string;
  /** Whether the app is in dark mode (used to pick map tiles / styling). */
  dark: boolean;
}

/** Kabul, Afghanistan — sensible default center for a local marketplace. */
export const DEFAULT_CENTER: MapCanvasCoords = {
  latitude: 34.5553,
  longitude: 69.2075,
};
