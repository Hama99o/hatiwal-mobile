/**
 * BackButton unit tests
 *
 * Covers (TASK-TX02 review fix, LOW — "shared-component + RTL consistency"):
 *  - Default LTR renders ChevronLeft; RTL renders ChevronRight (the leading
 *    edge under ps/fa is the right side, so the back affordance must mirror)
 *  - accessibilityLabel + testID are always present (a11y — screen readers
 *    must announce a real name, not just "button")
 *  - onPress is invoked on tap; falls back to router.back() when omitted
 *
 * useLocalization is mocked globally (isRtl: false) in
 * src/__tests__/setup.ts; this file overrides it locally for the RTL case.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { BackButton } from "../BackButton";

const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, canGoBack: mockCanGoBack }),
}));

jest.mock("lucide-react-native", () => ({
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
}));

const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => mockUseLocalization(),
}));

beforeEach(() => {
  mockBack.mockClear();
  mockCanGoBack.mockClear();
  mockUseLocalization.mockClear();
  mockUseLocalization.mockImplementation(() => ({ isRtl: false }));
});

describe("BackButton — RTL chevron flip", () => {
  it("renders ChevronLeft in LTR", () => {
    const { UNSAFE_getByType } = render(<BackButton />);
    expect(() => UNSAFE_getByType("ChevronLeft" as never)).not.toThrow();
  });

  it("renders ChevronRight in RTL", () => {
    mockUseLocalization.mockImplementation(() => ({ isRtl: true }));
    const { UNSAFE_getByType } = render(<BackButton />);
    expect(() => UNSAFE_getByType("ChevronRight" as never)).not.toThrow();
  });
});

describe("BackButton — accessibility + testID", () => {
  it("exposes a stable testID and a real accessibilityLabel (never just 'button')", () => {
    const { getByTestId } = render(<BackButton />);
    const node = getByTestId("back_button");
    expect(node.props.accessibilityRole).toBe("button");
    expect(node.props.accessibilityLabel).toBeTruthy();
  });
});

describe("BackButton — press behavior", () => {
  it("calls the custom onPress when provided", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<BackButton onPress={onPress} />);
    fireEvent.press(getByTestId("back_button"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("falls back to router.back() when onPress is omitted", () => {
    const { getByTestId } = render(<BackButton />);
    fireEvent.press(getByTestId("back_button"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
