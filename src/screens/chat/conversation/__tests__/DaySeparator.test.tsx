/**
 * DaySeparator — Jest unit tests (TASK-D428).
 *
 * Covers:
 *  - variant="day": renders "Today" / "Yesterday" for the two most recent
 *    days and delegates to useLocalization().formatDate for anything older
 *  - variant="unread": renders the unread-divider label
 *  - CR LOW regression guard: the "Today" label updates on its own once a
 *    real midnight rolls over while the row stays mounted, instead of going
 *    stale until something unrelated forces a re-render.
 */
import React from "react";
import { act, render, screen } from "@testing-library/react-native";

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    primary: "#3b82f6",
    muted: "#f3f4f6",
    mutedForeground: "#6b7280",
  }),
}));

const mockFormatDate = jest.fn(() => "Jun 1, 2026");
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => ({
    formatDate: mockFormatDate,
  }),
}));

import { DaySeparator } from "../DaySeparator";

describe("DaySeparator — variant=day", () => {
  it("renders 'Today' for a same-calendar-day timestamp", () => {
    render(<DaySeparator variant="day" iso={new Date().toISOString()} />);
    expect(screen.getByText("chat.day.today")).toBeTruthy();
  });

  it("renders 'Yesterday' for a timestamp exactly one calendar day back", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    render(<DaySeparator variant="day" iso={yesterday} />);
    expect(screen.getByText("chat.day.yesterday")).toBeTruthy();
  });

  it("delegates to useLocalization().formatDate for older dates", () => {
    const older = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    render(<DaySeparator variant="day" iso={older} />);
    expect(mockFormatDate).toHaveBeenCalledWith(older);
    expect(screen.getByText("Jun 1, 2026")).toBeTruthy();
  });

  it("relabels 'Today' as 'Yesterday' on its own once real midnight passes, without a remount (CR LOW)", () => {
    jest.useFakeTimers();
    try {
      const now = new Date("2026-06-15T23:00:00.000");
      jest.setSystemTime(now);
      render(<DaySeparator variant="day" iso={now.toISOString()} />);
      expect(screen.getByText("chat.day.today")).toBeTruthy();

      // Advance well past local midnight — the component's own timer must
      // fire and force the label to re-evaluate, with no prop change and no
      // remount.
      act(() => {
        jest.setSystemTime(new Date("2026-06-16T00:00:02.000"));
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });

      expect(screen.getByText("chat.day.yesterday")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("DaySeparator — variant=unread", () => {
  it("renders the unread-divider label", () => {
    render(<DaySeparator variant="unread" />);
    expect(screen.getByText("chat.unreadDivider")).toBeTruthy();
  });

  it("has an accessible label matching the visible text", () => {
    render(<DaySeparator variant="unread" />);
    expect(screen.getByLabelText("chat.unreadDivider")).toBeTruthy();
  });
});
