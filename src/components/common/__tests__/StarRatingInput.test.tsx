/**
 * StarRatingInput unit tests
 *
 * Covers:
 *  - Renders 5 star pressables always (radiogroup of 5 radios)
 *  - Tapping star N calls onChange(N)
 *  - accessibilityState.checked reflects which stars are <= value
 *  - disabled prop disables all 5 pressables (onChange never fires)
 *  - Custom size prop is accepted without crashing
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { StarRatingInput } from "../StarRatingInput";

jest.mock("lucide-react-native", () => ({
  Star: "Star",
}));

describe("StarRatingInput — structure", () => {
  it("renders exactly 5 star pressables", () => {
    render(<StarRatingInput value={0} onChange={jest.fn()} />);
    for (let n = 1; n <= 5; n++) {
      expect(screen.getByTestId(`star-rating-${n}`)).toBeTruthy();
    }
  });

  it("marks stars <= value as checked and stars > value as unchecked", () => {
    render(<StarRatingInput value={3} onChange={jest.fn()} />);
    expect(screen.getByTestId("star-rating-1").props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("star-rating-3").props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("star-rating-4").props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId("star-rating-5").props.accessibilityState.checked).toBe(false);
  });
});

describe("StarRatingInput — interaction", () => {
  it("calls onChange(n) when star n is tapped", () => {
    const onChange = jest.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    fireEvent.press(screen.getByTestId("star-rating-4"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("calling onChange with the same star already selected still fires", () => {
    const onChange = jest.fn();
    render(<StarRatingInput value={5} onChange={onChange} />);
    fireEvent.press(screen.getByTestId("star-rating-5"));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe("StarRatingInput — disabled", () => {
  it("marks all stars disabled and does not fire onChange", () => {
    const onChange = jest.fn();
    render(<StarRatingInput value={2} onChange={onChange} disabled testID="disabled-stars" />);
    const star = screen.getByTestId("star-rating-5");
    expect(star.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(star);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("StarRatingInput — size prop", () => {
  it("renders without crashing with a custom size", () => {
    const { toJSON } = render(<StarRatingInput value={0} onChange={jest.fn()} size={44} />);
    expect(toJSON()).not.toBeNull();
  });
});
