import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";

describe("ScrollToTopButton", () => {
  it("renders nothing while hidden, so it cannot eat taps on the last row", () => {
    render(<ScrollToTopButton visible={false} onPress={jest.fn()} />);
    expect(screen.queryByTestId("scroll-to-top-button")).toBeNull();
  });

  it("renders once visible and reports the press", () => {
    const onPress = jest.fn();
    render(<ScrollToTopButton visible onPress={onPress} />);
    fireEvent.press(screen.getByTestId("scroll-to-top-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is a labelled button for screen readers", () => {
    render(<ScrollToTopButton visible onPress={jest.fn()} />);
    const btn = screen.getByTestId("scroll-to-top-button");
    expect(btn.props.accessibilityRole).toBe("button");
    // Label comes from t("common.scrollToTop") — never a hardcoded string.
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });

  it("meets the 44px minimum touch target", () => {
    render(<ScrollToTopButton visible onPress={jest.fn()} />);
    const style = screen.getByTestId("scroll-to-top-button").props.style;
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });

  it("accepts a custom bottom offset for routes without a tab bar", () => {
    expect(() =>
      render(<ScrollToTopButton visible onPress={jest.fn()} bottomOffset={16} />)
    ).not.toThrow();
  });
});
