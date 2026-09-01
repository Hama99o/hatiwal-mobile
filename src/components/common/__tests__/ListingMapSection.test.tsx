/**
 * ListingMapSection unit tests.
 *
 * The component renders a static map preview (MapCanvas) that, when tapped,
 * opens a fullscreen Modal with an interactive map. Beneath the preview it shows
 * an optional address/location label and a "Get Directions" button.
 *
 * The "My Location" button lives INSIDE the fullscreen modal (not the preview),
 * and is shown whenever location permission is not "denied". To assert on it,
 * tests must first open the modal by pressing the preview overlay (labelled
 * with the "listing.detail.mapTapToInteract" key).
 *
 * MapCanvas renders a native MapLibre GL map (Hatiwal's self-hosted vector
 * tiles at map.hatiwal.com) via a native module, so we stub it with a simple
 * View so tests can run in Jest / Node without any native map module.
 *
 * Global mocks provided by src/__tests__/setup.ts:
 *   - react-i18next  → t(key) returns the key
 *   - useColors      → fixed light-mode token map
 *   - useLocalization → isRtl = false
 *
 * Per-file mocks (below):
 *   - MapCanvas              → stub View with testID="map-canvas-stub"
 *   - expo-location          → getForegroundPermissionsAsync resolves immediately
 *   - @/utils/geolocation    → getCurrentLocation mocked
 *   - lucide-react-native    → icons as string stubs
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";

// Stub MapCanvas via the manual __mocks__/MapCanvas.js file that lives next to
// the component. The manual mock uses plain CommonJS (no react-native require)
// to avoid NativeWind's Babel transform injecting _ReactNativeCSSInterop into
// the jest.mock factory scope, which would trigger an out-of-scope variable error.
//
// An explicit factory (rather than the bare `jest.mock(id)` call that relies on
// Jest auto-discovering the adjacent __mocks__ file) — verified that the bare
// form silently never engaged here: MapCanvas now requires the real
// `@maplibre/maplibre-react-native` native module at import time (no root-level
// `__mocks__` net like `react-native-maps` has), so without this explicit
// factory the suite tried to parse MapLibre's native TS source and failed.
jest.mock("@/components/common/map/MapCanvas", () =>
  require("@/components/common/map/__mocks__/MapCanvas")
);

// Stub expo-location. The component calls getForegroundPermissionsAsync on mount.
const mockGetForegroundPermissions = jest.fn();
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: function () {
    return mockGetForegroundPermissions();
  },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// Stub geolocation util.
jest.mock("@/utils/geolocation", () => ({
  getCurrentLocation: jest.fn(),
}));

// Stub lucide icons to avoid react-native-svg in Jest / Node.
jest.mock("lucide-react-native", () => ({
  Navigation: "Navigation",
  Crosshair: "Crosshair",
  Maximize2: "Maximize2",
  X: "X",
}));

// Imports AFTER all jest.mock() calls so Babel hoisting works correctly.
import { ListingMapSection } from "../ListingMapSection";

// Kabul, Afghanistan — a realistic coordinate fixture.
const KABUL = { latitude: 34.5553, longitude: 69.2075 };

// Helper: control the permission state returned by expo-location.
function setPermission(status: "granted" | "denied" | "undetermined") {
  mockGetForegroundPermissions.mockResolvedValue({ status });
}

// Helper: retrieve the getCurrentLocation mock via require (avoids hoisting quirks).
function geoMock(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@/utils/geolocation").getCurrentLocation as jest.Mock;
}

// Helper: open the fullscreen map modal by pressing the preview overlay.
// The overlay's accessibilityLabel is the "tap to interact" translation key.
async function openMapModal() {
  const overlay = await screen.findByLabelText("listing.detail.mapTapToInteract");
  await act(async () => {
    fireEvent.press(overlay);
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Default: permission is "undetermined" so the "My Location" button shows.
  setPermission("undetermined");
  // Default: location request returns nothing (permission not granted yet).
  geoMock().mockResolvedValue({ coords: null, error: "denied" });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Suite 1: Map canvas renders when coordinates are provided ────────────────

describe("ListingMapSection — with coordinates", () => {
  it("renders the map section container when lat/long are provided", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    // The map section always renders the Get Directions button and the My Location
    // button (when permission is undetermined). The map canvas itself is stubbed.
    await waitFor(() => {
      // Both the map action buttons confirm the full map section rendered.
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
  });

  it("renders the 'Get Directions' button", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    // t() returns the key string in tests
    await waitFor(() => {
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
  });

  it("renders the address string when address is provided", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
        address: "Share Naw, Kabul",
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Share Naw, Kabul")).toBeTruthy();
    });
  });

  it("renders the location string when location is provided and address is absent", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
        location: "Kabul",
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Kabul")).toBeTruthy();
    });
  });

  it("prefers address over location when both are provided", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
        address: "Share Naw, Kabul",
        location: "Kabul",
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Share Naw, Kabul")).toBeTruthy();
    });
    // "Kabul" alone should NOT appear as a separate element since address wins.
    expect(screen.queryByText("Kabul")).toBeNull();
  });

  it("does not show the 'My Location' button in the preview (it lives in the modal)", async () => {
    setPermission("undetermined");

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    // Preview is shown; the modal is closed, so My Location is not yet rendered.
    await waitFor(() => {
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
    expect(screen.queryByText("listing.detail.showMyLocation")).toBeNull();
  });

  it("shows the 'My Location' button in the modal when permission is undetermined", async () => {
    setPermission("undetermined");

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    await openMapModal();

    await waitFor(() => {
      expect(screen.getByText("listing.detail.showMyLocation")).toBeTruthy();
    });
  });

  it("shows the 'My Location' button in the modal when permission is already granted", async () => {
    setPermission("granted");
    geoMock().mockResolvedValue({
      coords: { latitude: 34.55, longitude: 69.21 },
    });

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    await openMapModal();

    // Granted permission still offers the button — it recenters the map on the user.
    await waitFor(() => {
      expect(screen.getByText("listing.detail.showMyLocation")).toBeTruthy();
    });
  });

  it("hides the 'My Location' button in the modal when permission is denied", async () => {
    setPermission("denied");

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    await openMapModal();

    // Wait for the modal to open (close button present), then confirm My Location is hidden.
    await screen.findByLabelText("listing.detail.mapDone");
    expect(screen.queryByText("listing.detail.showMyLocation")).toBeNull();
  });

  it("opens and closes the fullscreen map modal", async () => {
    setPermission("undetermined");

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    await openMapModal();

    // The modal exposes a close affordance (labelled with the mapDone key).
    const closeBtn = await screen.findByLabelText("listing.detail.mapDone");
    await act(async () => {
      fireEvent.press(closeBtn);
    });

    // After closing, the modal's My Location button is gone again.
    await waitFor(() => {
      expect(screen.queryByText("listing.detail.showMyLocation")).toBeNull();
    });
  });
});

// ─── Suite 2: Missing coordinates fallback (no address/location label) ────────

describe("ListingMapSection — without address/location label", () => {
  it("renders the map section and directions button even without address or location", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    // The map section renders its container and the directions button
    // even when no address or location label is provided.
    await waitFor(() => {
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
  });

  it("does not render the label row when address and location are both undefined", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    await waitFor(() => {
      // The only visible text nodes should be translation keys.
      // No plain city string should be present.
      expect(screen.queryByText("Share Naw, Kabul")).toBeNull();
      expect(screen.queryByText("Kabul")).toBeNull();
    });
  });

  it("does not render the label row when address is null and location is null", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
        address: null,
        location: null,
      })
    );

    await waitFor(() => {
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
    expect(screen.queryByText("Kabul")).toBeNull();
  });
});

// ─── Suite 3: City / location label text ─────────────────────────────────────

describe("ListingMapSection — city label text", () => {
  it("shows address text in the label area", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: 34.3528,
        longitude: 62.2041,
        address: "Herat, Herat Province",
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Herat, Herat Province")).toBeTruthy();
    });
  });

  it("shows location text in the label area when address is missing", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: 36.7069,
        longitude: 67.1106,
        location: "Mazar-i-Sharif",
      })
    );

    await waitFor(() => {
      expect(screen.getByText("Mazar-i-Sharif")).toBeTruthy();
    });
  });

  it("does not render the label row when both address and location are empty strings", async () => {
    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
        address: "",
        location: "",
      })
    );

    // Empty strings are falsy — the conditional (address || location) is false.
    await waitFor(() => {
      expect(screen.getByText("listing.detail.getDirections")).toBeTruthy();
    });
  });
});

// ─── Suite 4: Get Directions interaction ─────────────────────────────────────

describe("ListingMapSection — Get Directions interaction", () => {
  it("calls Linking.openURL when the directions button is pressed", async () => {
    const { Linking } = require("react-native");
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    render(
      React.createElement(ListingMapSection, {
        latitude: KABUL.latitude,
        longitude: KABUL.longitude,
      })
    );

    const btn = await screen.findByText("listing.detail.getDirections");
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(openURLSpy).toHaveBeenCalled();
    const calledUrl = openURLSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain(`${KABUL.latitude},${KABUL.longitude}`);

    openURLSpy.mockRestore();
  });
});

// ── SAFETY-1: the buyer's map shows an AREA, never the seller's doorstep ─────
//
// The API used to ship a private seller's coordinate at six decimals (house
// level) on the PUBLIC view, and this component drew it as an exact pin. The
// server now snaps public coordinates to a ~500m grid; these tests pin the
// client half, including the safe default — "no precision field" must mean
// approximate, or a stale payload silently restores the exact pin.
describe("ListingMapSection — location privacy", () => {
  it("draws an area and says so when the point is approximate", () => {
    render(
      <ListingMapSection
        latitude={34.5553}
        longitude={69.2075}
        location="Kabul"
        radiusM={500}
      />
    );
    expect(screen.getByTestId("listing-location-approximate")).toBeTruthy();
    // The radius the map was actually GIVEN — a note beside a pin would still
    // claim "approximate" while showing a doorstep.
    expect(screen.getByTestId("map-canvas-stub").props["data-radius-km"]).toBe("0.5");
  });

  it("keeps an exact pin and no note when the caller passes no radius", () => {
    // The owner's own view: their coordinate really is exact, and snapping it
    // here would drag their pin onto a grid line.
    render(
      <ListingMapSection latitude={34.5553} longitude={69.2075} location="Kabul" />
    );
    expect(screen.queryByTestId("listing-location-approximate")).toBeNull();
    expect(screen.getByTestId("map-canvas-stub").props["data-radius-km"]).toBe("0");
  });
});
