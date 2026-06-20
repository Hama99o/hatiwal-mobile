/**
 * GuestGuard unit tests.
 *
 * Guests must be redirected to login (not shown the private screen); signed-in
 * users see the wrapped content. We stub expo-router's Redirect to a marker so
 * we can assert it was rendered with the right target, and toggle the auth store
 * via the useRequireAuth mock.
 */

import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

// Capture the Redirect target. Jest only allows the mock factory to reference
// out-of-scope variables whose names are prefixed with "mock".
const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({
  Redirect: (props: { href: unknown }) => {
    mockRedirect(props.href);
    return null;
  },
}));

// Toggle auth per test.
let mockIsAuthenticated = false;
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({ isAuthenticated: mockIsAuthenticated, requireAuth: jest.fn() }),
}));

import { GuestGuard } from "../GuestGuard";

beforeEach(() => {
  mockRedirect.mockClear();
  mockIsAuthenticated = false;
});

describe("GuestGuard", () => {
  it("redirects a guest to login with the returnTo target and does NOT render children", () => {
    mockIsAuthenticated = false;
    render(
      <GuestGuard returnTo="/(main)/(tabs)/saved">
        <Text>Private Saved Content</Text>
      </GuestGuard>
    );

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: "/(auth)/login",
      params: { returnTo: "/(main)/(tabs)/saved" },
    });
    expect(screen.queryByText("Private Saved Content")).toBeNull();
  });

  it("renders children for an authenticated user and does NOT redirect", () => {
    mockIsAuthenticated = true;
    render(
      <GuestGuard returnTo="/(main)/(tabs)/saved">
        <Text>Private Saved Content</Text>
      </GuestGuard>
    );

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText("Private Saved Content")).toBeTruthy();
  });
});
