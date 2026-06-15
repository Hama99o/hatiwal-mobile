/**
 * Manual Jest mock for MapCanvas.
 *
 * MapCanvas is a platform-split module (MapCanvas.native.tsx / MapCanvas.web.tsx)
 * that renders native OSM tiles (via expo-image) or a Leaflet CDN map, neither of
 * which can run in the Jest/Node environment.
 *
 * This stub renders a plain View with testID="map-canvas-stub" so component tests
 * that include ListingMapSection can assert the map area is present without
 * triggering any native tile or browser DOM code.
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
