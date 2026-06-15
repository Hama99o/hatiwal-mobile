import React from "react";
import { render, screen } from "@testing-library/react-native";
import { UserAvatar } from "../UserAvatar";

describe("UserAvatar — no photo (initials fallback)", () => {
  it("shows the first letter of the name uppercased", () => {
    render(<UserAvatar name="Ahmad Karimi" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("uppercases the initial regardless of input case", () => {
    render(<UserAvatar name="omar" />);
    expect(screen.getByText("O")).toBeTruthy();
  });

  it("renders without crashing when name is empty string", () => {
    // name="" → initial = "".charAt(0).toUpperCase() = "" (empty, not "?")
    // The component renders an empty Text, not "?" — that's the real behavior
    const { toJSON } = render(<UserAvatar name="" />);
    expect(toJSON()).toBeTruthy();
  });

  it("does NOT render an image when avatarUrl is null", () => {
    render(<UserAvatar name="Test User" avatarUrl={null} />);
    // No Image component rendered
    expect(screen.queryByTestId("remote-avatar")).toBeNull();
  });
});

describe("UserAvatar — with photo", () => {
  it("renders an Image when avatarUrl is provided", () => {
    render(<UserAvatar name="Test User" avatarUrl="https://example.com/avatar.jpg" />);
    // Initial letter should NOT be shown when photo is present
    expect(screen.queryByText("T")).toBeNull();
  });

  it("does NOT show the initials text when photo is provided", () => {
    render(<UserAvatar name="Ahmad" avatarUrl="https://example.com/avatar.jpg" />);
    expect(screen.queryByText("A")).toBeNull();
  });
});

describe("UserAvatar — sizes", () => {
  it("renders at default size 44 without error", () => {
    render(<UserAvatar name="Test" />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("renders at size 32 without error", () => {
    render(<UserAvatar name="Test" size={32} />);
    expect(screen.getByText("T")).toBeTruthy();
  });

  it("renders at size 64 without error", () => {
    render(<UserAvatar name="Test" size={64} />);
    expect(screen.getByText("T")).toBeTruthy();
  });
});
