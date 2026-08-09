/**
 * SearchBar unit tests
 *
 * Covers: rendering placeholder, immediate (no debounceMs) onChangeText,
 * debounced onChangeText, the clear (X) button's appear/disappear + behavior,
 * external value sync, and RTL/smoke rendering.
 *
 * react-i18next, useColors and useLocalization are mocked globally in
 * src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { SearchBar } from "../SearchBar";

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

describe("SearchBar — immediate mode (no debounceMs)", () => {
  it("calls onChangeText on every keystroke", () => {
    const onChangeText = jest.fn();
    render(<SearchBar value="" onChangeText={onChangeText} placeholder="Search..." />);
    fireEvent.changeText(screen.getByPlaceholderText("Search..."), "iph");
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith("iph");
  });
});

describe("SearchBar — debounced mode", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("does not call onChangeText immediately when debounceMs is set", () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar value="" onChangeText={onChangeText} placeholder="Search..." debounceMs={250} />
    );
    fireEvent.changeText(screen.getByPlaceholderText("Search..."), "a");
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it("calls onChangeText after the debounce window elapses", () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar value="" onChangeText={onChangeText} placeholder="Search..." debounceMs={250} />
    );
    fireEvent.changeText(screen.getByPlaceholderText("Search..."), "a");
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(onChangeText).toHaveBeenCalledWith("a");
  });

  it("only calls onChangeText once for rapid keystrokes within the window", () => {
    const onChangeText = jest.fn();
    render(
      <SearchBar value="" onChangeText={onChangeText} placeholder="Search..." debounceMs={250} />
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.changeText(input, "a");
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.changeText(input, "ab");
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith("ab");
  });

  it("displays every keystroke instantly even while debounced", () => {
    render(<SearchBar value="" onChangeText={jest.fn()} placeholder="Search..." debounceMs={250} />);
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.changeText(input, "ab");
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

  it("clears the displayed text immediately, bypassing any pending debounce", () => {
    jest.useFakeTimers();
    const onChangeText = jest.fn();
    render(
      <SearchBar
        value=""
        onChangeText={onChangeText}
        placeholder="Search..."
        debounceMs={250}
        clearTestID="clear-btn"
      />
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.changeText(input, "abc");
    fireEvent.press(screen.getByTestId("clear-btn"));
    expect(onChangeText).toHaveBeenCalledWith("");
    act(() => {
      jest.advanceTimersByTime(250);
    });
    // The stale debounced "abc" call must never fire after clear.
    expect(onChangeText).not.toHaveBeenCalledWith("abc");
    jest.useRealTimers();
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
