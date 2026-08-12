/**
 * SearchBar unit tests
 *
 * Covers: rendering placeholder, onChangeText firing on every keystroke
 * (SearchBar is fully controlled — no built-in debounce), the clear (X)
 * button's appear/disappear + behavior, external value sync, and RTL/smoke
 * rendering.
 *
 * react-i18next, useColors and useLocalization are mocked globally in
 * src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SearchBar } from "../SearchBar";

// Partial mock: keep the REAL `AnimatedPressable` (so the existing
// entering/exiting/padding assertions below still exercise the real
// component), but let individual tests control `useReduceMotion`'s return
// value to prove the clear button's fade is gated on it (review fix).
jest.mock("@/lib/animation", () => {
  const actual = jest.requireActual("@/lib/animation");
  return { ...actual, useReduceMotion: jest.fn(() => false) };
});

describe("SearchBar — rendering", () => {
  it("renders the placeholder text", () => {
    render(<SearchBar value="" onChangeText={jest.fn()} placeholder="Search conversations..." />);
    expect(screen.getByPlaceholderText("Search conversations...")).toBeTruthy();
  });

  it("renders the current value", () => {
    render(<SearchBar value="iphone" onChangeText={jest.fn()} placeholder="Search..." />);
    expect(screen.getByDisplayValue("iphone")).toBeTruthy();
  });

  it("does not render a clear button when value is empty", () => {
    render(<SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." clearTestID="clear-btn" />);
    expect(screen.queryByTestId("clear-btn")).toBeNull();
  });

  it("renders a clear button when value is non-empty", () => {
    render(<SearchBar value="a" onChangeText={jest.fn()} placeholder="Search..." clearTestID="clear-btn" />);
    expect(screen.getByTestId("clear-btn")).toBeTruthy();
  });
});

describe("SearchBar — fully controlled (no built-in debounce)", () => {
  it("calls onChangeText on every keystroke", () => {
    const onChangeText = jest.fn();
    render(<SearchBar value="" onChangeText={onChangeText} placeholder="Search..." />);
    fireEvent.changeText(screen.getByPlaceholderText("Search..."), "iph");
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith("iph");
  });

  it("calls onChangeText once per keystroke with no delay/debounce", () => {
    const onChangeText = jest.fn();
    render(<SearchBar value="" onChangeText={onChangeText} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.changeText(input, "a");
    fireEvent.changeText(input, "ab");
    expect(onChangeText).toHaveBeenCalledTimes(2);
    expect(onChangeText).toHaveBeenNthCalledWith(1, "a");
    expect(onChangeText).toHaveBeenNthCalledWith(2, "ab");
  });

  it("always displays exactly the controlled `value` (no local echo divergence)", () => {
    const { rerender } = render(
      <SearchBar value="a" onChangeText={jest.fn()} placeholder="Search..." />
    );
    expect(screen.getByDisplayValue("a")).toBeTruthy();
    rerender(<SearchBar value="ab" onChangeText={jest.fn()} placeholder="Search..." />);
    expect(screen.getByDisplayValue("ab")).toBeTruthy();
  });
});

describe("SearchBar — clear button", () => {
  it("calls onChangeText('') when the clear button is pressed", () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar
        value="iphone"
        onChangeText={onChangeText}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    fireEvent.press(screen.getByTestId("clear-btn"));
    expect(onChangeText).toHaveBeenCalledWith("");
  });

  it("calls the optional onClear callback when cleared", () => {
    const onClear = jest.fn();
    render(
      <SearchBar
        value="iphone"
        onChangeText={jest.fn()}
        placeholder="Search..."
        onClear={onClear}
        clearTestID="clear-btn"
      />
    );
    fireEvent.press(screen.getByTestId("clear-btn"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("calls onChangeText('') immediately when pressed — no debounce/delay of any kind", () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar
        value="abc"
        onChangeText={onChangeText}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    fireEvent.press(screen.getByTestId("clear-btn"));
    // No fake timers / advanceTimersByTime needed — clearing is synchronous.
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith("");
  });
});

describe("SearchBar — external value sync", () => {
  it("updates the displayed text when the value prop changes externally", () => {
    const { rerender } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." />
    );
    rerender(<SearchBar value="preset" onChangeText={jest.fn()} placeholder="Search..." />);
    expect(screen.getByDisplayValue("preset")).toBeTruthy();
  });
});

describe("SearchBar — smoke tests", () => {
  it("renders without throwing with a value", () => {
    expect(() =>
      render(<SearchBar value="term" onChangeText={jest.fn()} placeholder="Search..." />)
    ).not.toThrow();
  });

  it("renders without throwing when empty", () => {
    expect(() =>
      render(<SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." />)
    ).not.toThrow();
  });
});

// DR fix (cycle-3): a search box should never fight the user with
// auto-capitalize/auto-correct/spell-check while they type a listing title,
// a partial name, or slang.
describe("SearchBar — input text behavior (DR fix)", () => {
  it("disables autoCapitalize, autoCorrect, and spellCheck on the input", () => {
    render(<SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input.props.autoCapitalize).toBe("none");
    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.spellCheck).toBe(false);
  });
});

// DR fix (cycle-3): the clear button's touch target must be a REAL,
// measurable layout box (padding), not an invisible `hitSlop` extension that
// some hit-testing/measurement tooling ignores.
describe("SearchBar — clear button touch target (DR fix)", () => {
  it("sizes the clear button via real padding, not hitSlop", () => {
    render(
      <SearchBar
        value="iphone"
        onChangeText={jest.fn()}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    const clearButton = screen.getByTestId("clear-btn");
    expect(clearButton.props.hitSlop).toBeUndefined();
    const style = Array.isArray(clearButton.props.style)
      ? Object.assign({}, ...clearButton.props.style.filter(Boolean))
      : clearButton.props.style;
    expect(style.padding).toBe(14);
  });

  // DR fix (cycle-4): the 44pt padded clear button used to be wrapped in a
  // SEPARATE `Animated.View` (added only to get FadeIn/FadeOut), and that
  // wrapper sizes itself to the NET visual footprint of its child — padding
  // 14 cancelled by margin -14 collapses it back down to the 16px icon. On
  // Android that made the real 44pt target sit inside a 16x16 ancestor box
  // and NOT hit-testable. The fix puts `entering`/`exiting` directly on the
  // SAME padded Pressable rather than on a separate wrapping View — proven
  // here by asserting the one node returned by `clearTestID` carries BOTH
  // the entering/exiting animation AND the 44pt padding style (RN's
  // `Pressable` forwards unrecognized props — including `entering`/
  // `exiting` — straight onto its underlying host View, so if these were
  // ever split back across two nested views, this node would lose one half).
  it("carries the enter/exit animation on the SAME node as the 44pt padding — no separate wrapping View (Android hit-test DR fix)", () => {
    render(
      <SearchBar
        value="iphone"
        onChangeText={jest.fn()}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    const clearButton = screen.getByTestId("clear-btn");
    expect(clearButton.props.entering).toBeDefined();
    expect(clearButton.props.exiting).toBeDefined();
    const style = Array.isArray(clearButton.props.style)
      ? Object.assign({}, ...clearButton.props.style.filter(Boolean))
      : clearButton.props.style;
    expect(style.padding).toBe(14);
  });

  // Review fix: every other entering/exiting animation in the codebase
  // (ListingDetail, PublishSuccessSheet, MessageBubble, EmptyState) gates on
  // the OS "Reduce Motion" setting — the clear button's fade did not.
  it("suppresses the clear button's entering/exiting animation when Reduce Motion is on", () => {
    const { useReduceMotion } = require("@/lib/animation");
    (useReduceMotion as jest.Mock).mockReturnValueOnce(true);

    render(
      <SearchBar
        value="iphone"
        onChangeText={jest.fn()}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    const clearButton = screen.getByTestId("clear-btn");
    expect(clearButton.props.entering).toBeUndefined();
    expect(clearButton.props.exiting).toBeUndefined();
  });

  it("plays the entering/exiting animation when Reduce Motion is off", () => {
    const { useReduceMotion } = require("@/lib/animation");
    (useReduceMotion as jest.Mock).mockReturnValueOnce(false);

    render(
      <SearchBar
        value="iphone"
        onChangeText={jest.fn()}
        placeholder="Search..."
        clearTestID="clear-btn"
      />
    );
    const clearButton = screen.getByTestId("clear-btn");
    expect(clearButton.props.entering).toBeDefined();
    expect(clearButton.props.exiting).toBeDefined();
  });
});
