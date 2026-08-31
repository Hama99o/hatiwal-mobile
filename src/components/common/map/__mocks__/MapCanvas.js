/**
 * Manual Jest mock for MapCanvas.
 *
 * MapCanvas (a single MapCanvas.tsx, shared by Android and iOS) renders a
 * native MapLibre GL map against Hatiwal's self-hosted vector tiles at
 * map.hatiwal.com, via the `@maplibre/maplibre-react-native` native module —
 * which cannot run in the Jest/Node environment.
 *
 * This stub renders a plain View with testID="map-canvas-stub" so component tests
 * that include ListingMapSection can assert the map area is present without
 * triggering any native map module.
 *
 * It is a plain CommonJS file so NativeWind's Babel transform does NOT inject
 * _ReactNativeCSSInterop into its output — avoiding the jest.mock() factory
 * hoisting check that forbids out-of-scope variable references.
 */

const React = require("react");

function MapCanvas(props) {
  // Return a detached React element that the test renderer can traverse.
  // We avoid require("react-native") here so that NativeWind's CSS interop
  // transform is never triggered inside a jest.mock factory context.
  return React.createElement("View", {
    testID: "map-canvas-stub",
    style: { height: props.height || 210 },
  });
}

MapCanvas.displayName = "MapCanvas";

module.exports = {
  __esModule: true,
  default: MapCanvas,
};
