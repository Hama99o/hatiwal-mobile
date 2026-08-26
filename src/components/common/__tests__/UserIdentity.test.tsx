import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { UserIdentity } from "../UserIdentity";

// Mock lucide-react-native (BadgeCheck used inside VerifiedBadge)
jest.mock("lucide-react-native", () => ({
  BadgeCheck: () => null,
}));

// expo-image is already mocked in setup.ts

describe("UserIdentity", () => {
  it("renders user name", () => {
    render(<UserIdentity name="Ahmad Karimi" />);
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(<UserIdentity name="Ahmad Karimi" subtitle="Kabul" />);
    expect(screen.getByText("Kabul")).toBeTruthy();
  });

  it("does not render subtitle when omitted", () => {
    render(<UserIdentity name="Ahmad Karimi" />);
    expect(screen.queryByText("Kabul")).toBeNull();
  });

  it("renders first letter as avatar initial when no avatarUrl", () => {
    render(<UserIdentity name="Omar Noori" />);
    expect(screen.getByText("O")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<UserIdentity name="Ahmad Karimi" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is not pressable when onPress is not provided", () => {
    render(<UserIdentity name="Ahmad Karimi" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not render name when showName is false", () => {
    render(<UserIdentity name="Ahmad Karimi" showName={false} />);
    expect(screen.queryByText("Ahmad Karimi")).toBeNull();
  });

  it("renders without crashing in stacked layout", () => {
    expect(() =>
      render(<UserIdentity name="Ahmad Karimi" layout="stacked" />)
    ).not.toThrow();
  });

  it("renders without crashing when verified", () => {
    expect(() =>
      render(<UserIdentity name="Ahmad Karimi" verified />)
    ).not.toThrow();
  });

  it("renders without crashing with a custom size", () => {
    expect(() =>
      render(<UserIdentity name="Ahmad Karimi" size={64} />)
    ).not.toThrow();
  });

  it("puts nameTestID on the name node itself, carrying the name as its text", () => {
    // The E2E identity guards pair id + text on ONE node to prove which account is
    // signed in. `testID` lands on a wrapper the name is not a descendant of, so
    // that pairing only works via nameTestID. A guard that cannot pair them matches
    // the other party's name anywhere on the screen and skips a needed sign-out.
    render(<UserIdentity name="Omar Noori" nameTestID="profile-display-name" />);
    expect(screen.getByTestId("profile-display-name")).toBeTruthy();
    expect(screen.getByTestId("profile-display-name").props.children).toBe("Omar Noori");
  });

  it("does not render avatar initial when showAvatar is false", () => {
    // With showAvatar=false, UserAvatar is not mounted so the initial letter should not appear
    render(<UserIdentity name="Omar Noori" showAvatar={false} />);
    expect(screen.queryByText("O")).toBeNull();
    // But the name should still be present
    expect(screen.getByText("Omar Noori")).toBeTruthy();
  });
});
