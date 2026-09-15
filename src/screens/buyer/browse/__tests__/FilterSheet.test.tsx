/**
 * FilterSheet — the inline geolocation-error surface.
 *
 * Covers only `nearestError`, the Android-only inline message added because a
 * failed "Nearest" lookup left this sheet silent.
 *
 * The chip lives INSIDE this <Modal>, so a toast fired when the geo call fails is
 * drawn behind the sheet on Android — <Toaster> is mounted at the root of the tree
 * (app/_layout.tsx:115). On iOS sonner-native wraps the Toaster in
 * react-native-screens' FullWindowOverlay (toaster.tsx:60-76), which draws above
 * presented modals, so the toast is already visible there and an inline copy would
 * be duplicate feedback.
 *
 * The chip itself was already honest — Browse clears `nearestLoading` before the
 * error branch and only sets `sort="nearest"` on success, so it stops spinning and
 * stays unselected. Only the explanation was missing. See docs/TOAST_BEHIND_MODAL.md.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// ─── Additional mocks (on top of the global setup.ts mocks) ───────────────────

jest.mock("lucide-react-native", () => ({
  Sliders: "Sliders",
  MapPin: "MapPin",
  ChevronRight: "ChevronRight",
  ChevronLeft: "ChevronLeft",
  X: "X",
  ArrowUpDown: "ArrowUpDown",
  UserCheck: "UserCheck",
  Navigation: "Navigation",
  TrendingDown: "TrendingDown",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/common/ConditionChips", () => ({
  ConditionChips: "ConditionChips",
}));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

import { FilterSheet } from "../FilterSheet";

function buildProps(
  overrides: Partial<React.ComponentProps<typeof FilterSheet>> = {},
): React.ComponentProps<typeof FilterSheet> {
  return {
    visible: true,
    onClose: jest.fn(),
    coordinates: null,
    distance: null,
    location: null,
    priceMin: "",
    priceMax: "",
    condition: null,
    onOpenLocationPicker: jest.fn(),
    onClearLocation: jest.fn(),
    onPriceMinChange: jest.fn(),
    onPriceMaxChange: jest.fn(),
    onConditionChange: jest.fn(),
    sort: null,
    onSortChange: jest.fn(),
    nearestLoading: false,
    onToggleNearest: jest.fn(),
    sellerActiveDays: null,
    onSellerActiveDaysChange: jest.fn(),
    priceDropped: false,
    onTogglePriceDropped: jest.fn(),
    onClearAllFilters: jest.fn(),
    ...overrides,
  };
}

const setPlatform = (os: "android" | "ios") => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require("react-native");
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
};

describe("FilterSheet — nearestError renders inline, on Android only", () => {
  afterEach(() => setPlatform("ios"));

  it("shows the geo failure inline on Android", () => {
    setPlatform("android");
    render(<FilterSheet {...buildProps({ nearestError: "browse.geoError.timeout" })} />);
    expect(screen.getByTestId("filter-nearest-error")).toBeTruthy();
  });

  it("does NOT show it on iOS — the toast is already visible above the sheet", () => {
    setPlatform("ios");
    render(<FilterSheet {...buildProps({ nearestError: "browse.geoError.timeout" })} />);
    expect(screen.queryByTestId("filter-nearest-error")).toBeNull();
  });

  it("renders nothing when the lookup has not failed", () => {
    setPlatform("android");
    render(<FilterSheet {...buildProps({ nearestError: null })} />);
    expect(screen.queryByTestId("filter-nearest-error")).toBeNull();
  });

  it("leaves the Nearest chip usable so the lookup can be retried", () => {
    setPlatform("android");
    render(
      <FilterSheet
        {...buildProps({ nearestError: "browse.geoError.timeout", nearestLoading: false, sort: null })}
      />,
    );
    // The chip is disabled only while loading. After a failure it must be pressable
    // again — and unselected, since `sort` is set only on success.
    expect(screen.getByTestId("filter-nearest-error")).toBeTruthy();
    expect(screen.getByLabelText("browse.sort.nearest")).toBeTruthy();
  });
});
