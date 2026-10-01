import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

jest.mock("lucide-react-native", () => ({ ChevronRight: "ChevronRight", BadgeCheck: "BadgeCheck" }));
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

import { SupportEntryRow } from "../SupportEntryRow";

afterEach(() => mockUseLocalization.mockReturnValue({ isRtl: false }));

describe("SupportEntryRow", () => {
  it("reads as Support, with its purpose — not as an empty conversation", () => {
    render(<SupportEntryRow onPress={jest.fn()} />);
    expect(screen.getByText("chat.support.name")).toBeTruthy();
    expect(screen.getByText("chat.support.entrySubtitle")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<SupportEntryRow onPress={onPress} />);
    fireEvent.press(screen.getByTestId("support-entry-row"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows progress and ignores taps while opening", () => {
    const onPress = jest.fn();
    render(<SupportEntryRow onPress={onPress} isOpening />);
    fireEvent.press(screen.getByTestId("support-entry-row"));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId("support-entry-row").props.accessibilityState).toMatchObject({ busy: true });
  });

  it("lays out right-to-left in RTL locales", () => {
    mockUseLocalization.mockReturnValue({ isRtl: true });
    render(<SupportEntryRow onPress={jest.fn()} />);
    const style = [screen.getByTestId("support-entry-row").props.style].flat(3);
    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ flexDirection: "row-reverse" })]));
  });
});
