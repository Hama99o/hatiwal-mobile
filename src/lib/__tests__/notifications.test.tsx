/**
 * Tests for useNotificationObserver — verifies that tapping a message push
 * (cold-start or while running) routes to the right conversation, and that
 * non-message / malformed payloads are ignored.
 *
 * expo-notifications is mocked globally in src/__tests__/setup.ts; here we
 * override the two functions the observer reads, and mock expo-router's
 * useRouter to capture navigation.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useNotificationObserver } from "../notifications";

function Harness() {
  useNotificationObserver();
  return null;
}

const getLastResponse = Notifications.getLastNotificationResponseAsync as jest.Mock;
const addResponseListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;

function responseWith(data: unknown) {
  return { notification: { request: { content: { data } } } };
}

beforeEach(() => {
  mockPush.mockClear();
  getLastResponse.mockReset().mockResolvedValue(null);
  addResponseListener.mockReset().mockReturnValue({ remove: jest.fn() });
});

describe("useNotificationObserver", () => {
  it("routes to the conversation when the app is cold-started from a message notification", async () => {
    getLastResponse.mockResolvedValue(responseWith({ type: "message", conversationId: 42 }));

    render(<Harness />);
    // Allow the awaited getLastNotificationResponseAsync promise to resolve.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/42");
  });

  it("routes to the conversation when a notification is tapped while running", async () => {
    let captured: ((r: unknown) => void) | undefined;
    addResponseListener.mockImplementation((cb: (r: unknown) => void) => {
      captured = cb;
      return { remove: jest.fn() };
    });

    render(<Harness />);
    await Promise.resolve();

    captured?.(responseWith({ type: "message", conversationId: 7 }));
    expect(mockPush).toHaveBeenCalledWith("/(main)/conversation/7");
  });

  it("ignores non-message notifications", async () => {
    getLastResponse.mockResolvedValue(responseWith({ type: "promo" }));
    render(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores a message notification missing a conversationId", async () => {
    getLastResponse.mockResolvedValue(responseWith({ type: "message" }));
    render(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", async () => {
    const remove = jest.fn();
    addResponseListener.mockReturnValue({ remove });
    const { unmount } = render(<Harness />);
    await Promise.resolve();
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
