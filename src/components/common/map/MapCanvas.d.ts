import type { MapCanvasProps } from "./MapCanvas.types";

// Resolved by Metro to MapCanvas.web.tsx (browser) or MapCanvas.native.tsx (device).
declare const MapCanvas: (props: MapCanvasProps) => JSX.Element;
export default MapCanvas;
