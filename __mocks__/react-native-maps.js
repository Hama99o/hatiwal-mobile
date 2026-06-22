/**
 * Jest manual mock for `react-native-maps`.
 *
 * The real package ships native/Flow source that the jest (Node) environment
 * can't parse, and it has no business running in unit tests. Jest auto-applies
 * manual mocks for node_modules, so every test that renders a map (directly, or
 * transitively via MapCanvas / ListingMapSection / LocationRangePicker) gets
 * these lightweight stand-ins instead of the native module.
 *
 * Plain CommonJS so NativeWind's Babel transform doesn't inject CSS-interop
 * helpers into a jest.mock factory scope.
 */

const React = require("react");

function makeStub(displayName) {
  function Stub(props) {
    return React.createElement(displayName, props, props && props.children);
  }
  Stub.displayName = displayName;
  return Stub;
}

const MapView = makeStub("MapView");

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker: makeStub("Marker"),
  Circle: makeStub("Circle"),
  Polygon: makeStub("Polygon"),
  Polyline: makeStub("Polyline"),
  Callout: makeStub("Callout"),
  Overlay: makeStub("Overlay"),
  PROVIDER_DEFAULT: "default",
  PROVIDER_GOOGLE: "google",
};
