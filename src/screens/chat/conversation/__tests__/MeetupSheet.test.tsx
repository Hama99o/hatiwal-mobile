/**
 * MeetupSheet — the inline send-error surface.
 *
 * Covers only `sendError`, the Android-only inline message added because a failed
 * proposal left this sheet silent. A proposal that fails to send keeps the sheet
 * OPEN (so the place and time already typed survive), and on Android that is
 * precisely when a toast cannot be seen: <Toaster> is mounted at the root of the
 * tree (app/_layout.tsx:115) and an Android <Modal> is its own native window over
 * it. On iOS sonner-native wraps the Toaster in react-native-screens'
 * FullWindowOverlay (toaster.tsx:60-76), which draws above presented modals — so
 * the toast is already visible there and an inline copy would be duplicate
 * feedback for one event.
 *
 * See docs/TOAST_BEHIND_MODAL.md.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// ─── Additional mocks (on top of the global setup.ts mocks) ───────────────────

jest.mock("lucide-react-native", () => ({
  ShieldCheck: "ShieldCheck",
  MapPin: "MapPin",
  X: "X",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// LocationRangePicker drags in MapLibre; this suite never opens the map.
jest.mock("@/components/common/LocationRangePicker", () => ({
  LocationRangePicker: "LocationRangePicker",
}));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

import { MeetupSheet } from "../MeetupSheet";

function buildProps(
  overrides: Partial<React.ComponentProps<typeof MeetupSheet>> = {},
): React.ComponentProps<typeof MeetupSheet> {
  return {
    visible: true,
    onClose: jest.fn(),
    onPropose: jest.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    ...overrides,
  };
}

const setPlatform = (os: "android" | "ios") => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require("react-native");
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
};

describe("MeetupSheet — sendError renders inline, on Android only", () => {
  afterEach(() => setPlatform("ios"));

  it("shows the failure inline on Android", () => {
    setPlatform("android");
    render(<MeetupSheet {...buildProps({ sendError: "chat.thread.meetupFailed" })} />);
    expect(screen.getByTestId("meetup-send-error")).toBeTruthy();
  });

  it("does NOT show it on iOS — the toast is already visible above the sheet", () => {
    setPlatform("ios");
    render(<MeetupSheet {...buildProps({ sendError: "chat.thread.meetupFailed" })} />);
    expect(screen.queryByTestId("meetup-send-error")).toBeNull();
  });

  it("renders nothing when there is no send error", () => {
    setPlatform("android");
    render(<MeetupSheet {...buildProps({ sendError: null })} />);
    expect(screen.queryByTestId("meetup-send-error")).toBeNull();
  });

  it("leaves Propose pressable so the user can retry without retyping", () => {
    setPlatform("android");
    render(<MeetupSheet {...buildProps({ sendError: "chat.thread.meetupFailed", isSubmitting: false })} />);
    // A send failure is not the user's mistake: this sheet gates Propose on
    // `isSubmitting` alone, so the button must stay enabled after one.
    expect(screen.getByTestId("meetup-send-error")).toBeTruthy();
    expect(screen.getByTestId("meetup-propose-submit")).toBeTruthy();
  });
});
