import React from "react";
import { render } from "@testing-library/react-native";
import * as SystemUI from "expo-system-ui";
import { useThemeStore } from "@/stores/theme.store";
import { ThemedSystemBars } from "../ThemedSystemBars";

// setup.ts mocks useColors with fixed LIGHT tokens; this test is about the theme.
jest.unmock("@/hooks/useColors");
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => "light", // the phone is in LIGHT mode in every case below
}));

const DARK_BG = "hsl(222, 84%, 5%)";
const LIGHT_BG = "hsl(0, 0%, 98%)";

describe("ThemedSystemBars", () => {
  beforeEach(() => (SystemUI.setBackgroundColorAsync as jest.Mock).mockClear());

  it("app in Dark on a light phone paints the native root dark (status + nav bar strips)", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemedSystemBars />);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(DARK_BG);
  });

  it("follows the theme when it changes", () => {
    useThemeStore.setState({ theme: "dark" });
    const { rerender } = render(<ThemedSystemBars />);
    useThemeStore.setState({ theme: "light" });
    rerender(<ThemedSystemBars />);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(LIGHT_BG);
  });

  it("System follows the phone", () => {
    useThemeStore.setState({ theme: "system" });
    render(<ThemedSystemBars />);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith(LIGHT_BG);
  });

  it("a rejected native call is swallowed", async () => {
    (SystemUI.setBackgroundColorAsync as jest.Mock).mockReturnValueOnce(Promise.reject(new Error("no module")));
    useThemeStore.setState({ theme: "dark" });
    expect(() => render(<ThemedSystemBars />)).not.toThrow();
    await Promise.resolve();
  });
});
