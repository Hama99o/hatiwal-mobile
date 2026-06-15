import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ModeSwitcherBanner } from "../ModeSwitcherBanner";

// Mock the mode store — start in buyer mode by default
const mockToggleMode = jest.fn();
let mockMode = "buyer";

jest.mock("@/stores/mode.store", () => ({
  useModeStore: () => ({
    mode: mockMode,
    toggleMode: mockToggleMode,
  }),
}));

jest.mock("lucide-react-native", () => ({
  Store: "Store",
  ShoppingBag: "ShoppingBag",
  ArrowRight: "ArrowRight",
  ArrowLeft: "ArrowLeft",
}));

beforeEach(() => {
  mockMode = "buyer";
  mockToggleMode.mockClear();
});

describe("ModeSwitcherBanner — buyer mode", () => {
  it("shows buyer mode label", () => {
    render(<ModeSwitcherBanner />);
    expect(screen.getByText("profile.buyerMode")).toBeTruthy();
  });

  it("shows switch to seller text", () => {
    render(<ModeSwitcherBanner />);
    expect(screen.getByText("profile.switchToSeller")).toBeTruthy();
  });

  it("calls toggleMode when pressed", () => {
    render(<ModeSwitcherBanner />);
    fireEvent.press(screen.getByText("profile.buyerMode"));
    expect(mockToggleMode).toHaveBeenCalledTimes(1);
  });
});

describe("ModeSwitcherBanner — seller mode", () => {
  beforeEach(() => {
    mockMode = "seller";
  });

  it("shows seller mode label", () => {
    render(<ModeSwitcherBanner />);
    expect(screen.getByText("profile.sellerMode")).toBeTruthy();
  });

  it("shows switch to buyer text", () => {
    render(<ModeSwitcherBanner />);
    expect(screen.getByText("profile.switchToBuyer")).toBeTruthy();
  });

  it("calls toggleMode when pressed in seller mode", () => {
    render(<ModeSwitcherBanner />);
    fireEvent.press(screen.getByText("profile.sellerMode"));
    expect(mockToggleMode).toHaveBeenCalledTimes(1);
  });
});
