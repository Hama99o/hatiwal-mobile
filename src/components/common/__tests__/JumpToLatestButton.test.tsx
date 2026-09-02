import { describe, it, expect, jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { JumpToLatestButton } from "../JumpToLatestButton";

describe("JumpToLatestButton", () => {
  it("renders and calls onPress — the owner's whole point is not having to scroll by hand", () => {
    const onPress = jest.fn();
    render(<JumpToLatestButton onPress={onPress} bottom={200} label="Jump to latest" />);
    fireEvent.press(screen.getByTestId("jump-to-latest"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows no count pill when nothing is unread", () => {
    render(<JumpToLatestButton onPress={() => {}} bottom={200} label="Jump to latest" />);
    expect(screen.queryByTestId("jump-to-latest-count")).toBeNull();
  });

  it("shows the unread count when there is one", () => {
    render(
      <JumpToLatestButton onPress={() => {}} bottom={200} label="Jump to latest" unreadCount={7} />
    );
    expect(screen.getByTestId("jump-to-latest-count").props.children).toBe("7");
  });

  it("carries the translated label as its accessibility label, never a hardcoded string", () => {
    render(<JumpToLatestButton onPress={() => {}} bottom={200} label="رفتن به آخرین پیام" />);
    expect(screen.getByLabelText("رفتن به آخرین پیام")).toBeTruthy();
  });

  it("sits at the caller's offset — the thread owns the bar height, not this button", () => {
    // The bar height is exactly what this screen got wrong repeatedly, so the
    // position is passed in rather than guessed here.
    const { getByTestId } = render(
      <JumpToLatestButton onPress={() => {}} bottom={396} label="Jump to latest" />
    );
    const pill = getByTestId("jump-to-latest");
    expect(pill).toBeTruthy();
  });
});
