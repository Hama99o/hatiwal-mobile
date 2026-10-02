/**
 * Where the location picker opens (owner's rule, 2026-10-02):
 * saved pin → GPS (only if already permitted) → profile address → Kabul.
 */
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { DEFAULT_CENTER } from "@/components/common/map/MapCanvas.types";
import { getProvinceByValue } from "@/data/afghan_provinces";

const mockCenters: Array<{ latitude: number; longitude: number }> = [];
jest.mock("@/components/common/map/MapCanvas", () => {
  const MapCanvasMock = (props: { center: { latitude: number; longitude: number } }) => {
    mockCenters.push(props.center);
    return null;
  };
  return { __esModule: true, default: MapCanvasMock };
});

let mockUser: Record<string, unknown> | null = null;
jest.mock("@/stores/auth.store", () => ({
  useAuthStore: (sel: (s: { user: unknown }) => unknown) => sel({ user: mockUser }),
}));

const mockGps = jest.fn();
jest.mock("@/utils/geolocation", () => ({
  getCurrentLocation: jest.fn(),
  getCurrentLocationIfPermitted: () => mockGps(),
}));

jest.mock("@/utils/geocoding", () => ({
  searchPlaces: jest.fn(async () => []),
  reverseGeocode: jest.fn(async () => null),
}));

import { LocationRangePicker } from "../LocationRangePicker";

const herat = getProvinceByValue("Herat")!;
const last = () => mockCenters[mockCenters.length - 1];

function open(initialCoords: { latitude: number; longitude: number } | null = null) {
  const r = render(
    <LocationRangePicker visible onClose={jest.fn()} onConfirm={jest.fn()} initialCoords={initialCoords} initialRadius={5} />
  );
  // The map renders only once its container has a measured height.
  const box = r.UNSAFE_root.findAll((n) => typeof n.props?.onLayout === "function").pop()!;
  act(() => {
    fireEvent(box, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 500 } } });
  });
  return r;
}

beforeEach(() => {
  mockCenters.length = 0;
  mockUser = null;
  mockGps.mockReset();
});

it("opens on GPS when location is already permitted", async () => {
  mockUser = { province: "Herat" };
  mockGps.mockResolvedValue({ latitude: 31.6, longitude: 65.7 });
  open();
  await waitFor(() => expect(last()).toEqual({ latitude: 31.6, longitude: 65.7 }));
});

it("opens on the profile address when there is no GPS", async () => {
  mockUser = { province: "Herat" };
  mockGps.mockResolvedValue(null);
  open();
  await waitFor(() => expect(mockGps).toHaveBeenCalled());
  expect(last()).toEqual({ latitude: herat.lat, longitude: herat.lng });
});

it("prefers the profile's own map point over its province", async () => {
  mockUser = { latitude: "34.400000", longitude: "62.100000", province: "Kabul" };
  mockGps.mockResolvedValue(null);
  open();
  await waitFor(() => expect(mockGps).toHaveBeenCalled());
  expect(last()).toEqual({ latitude: 34.4, longitude: 62.1 });
});

it("opens on Kabul when there is neither GPS nor a profile address", async () => {
  mockGps.mockResolvedValue(null);
  open();
  await waitFor(() => expect(mockGps).toHaveBeenCalled());
  expect(last()).toEqual(DEFAULT_CENTER);
});

it("keeps a saved pin over GPS and the profile (editing a listing)", async () => {
  mockUser = { province: "Herat" };
  mockGps.mockResolvedValue({ latitude: 31.6, longitude: 65.7 });
  open({ latitude: 36.7, longitude: 67.1 });
  await new Promise((r) => setTimeout(r, 20));
  expect(last()).toEqual({ latitude: 36.7, longitude: 67.1 });
  expect(mockGps).not.toHaveBeenCalled();
});
