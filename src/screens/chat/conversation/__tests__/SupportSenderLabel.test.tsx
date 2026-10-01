import React from "react";
import { render, screen } from "@testing-library/react-native";
import type { Message } from "@/api/conversations";
import type { ThreadRow } from "../groupMessagesByDay";
import { SupportSenderLabel, startsIncomingRun } from "../SupportSenderLabel";

const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

const ME = 10;
const SUPPORT = 1;

function msg(id: number, senderId: number): ThreadRow {
  return {
    type: "message",
    message: { id, kind: "text", body: "hi", sender: { id: senderId, name: "x" }, createdAt: "2026-10-01T10:00:00Z" } as Message,
  };
}

describe("startsIncomingRun", () => {
  it("labels the first incoming message", () => {
    expect(startsIncomingRun([msg(1, SUPPORT)], 0, ME)).toBe(true);
  });

  it("does not label my own messages", () => {
    expect(startsIncomingRun([msg(1, ME)], 0, ME)).toBe(false);
  });

  it("labels once per run, not every bubble", () => {
    const rows = [msg(1, SUPPORT), msg(2, SUPPORT), msg(3, ME), msg(4, SUPPORT)];
    expect(rows.map((_, i) => startsIncomingRun(rows, i, ME))).toEqual([true, false, false, true]);
  });

  it("repeats after a day separator or unread divider", () => {
    const rows: ThreadRow[] = [msg(1, SUPPORT), { type: "day", iso: "2026-10-02T00:00:00Z" }, msg(2, SUPPORT), { type: "unread" }, msg(3, SUPPORT)];
    expect(startsIncomingRun(rows, 2, ME)).toBe(true);
    expect(startsIncomingRun(rows, 4, ME)).toBe(true);
  });

  it("is false for non-message rows and before the viewer is known", () => {
    expect(startsIncomingRun([{ type: "unread" }], 0, ME)).toBe(false);
    expect(startsIncomingRun([msg(1, SUPPORT)], 0, null)).toBe(false);
  });
});

describe("SupportSenderLabel", () => {
  afterEach(() => mockUseLocalization.mockReturnValue({ isRtl: false }));

  it("renders the localized Support name with the brand mark", () => {
    render(<SupportSenderLabel />);
    expect(screen.getByText("chat.support.name")).toBeTruthy();
    expect(screen.getByTestId("support-avatar")).toBeTruthy();
  });

  it("sits on the incoming side: start in LTR, end in RTL", () => {
    const { rerender } = render(<SupportSenderLabel />);
    expect(screen.getByTestId("support-sender-label").props.style).toMatchObject({ alignSelf: "flex-start", flexDirection: "row" });
    mockUseLocalization.mockReturnValue({ isRtl: true });
    rerender(<SupportSenderLabel />);
    expect(screen.getByTestId("support-sender-label").props.style).toMatchObject({ alignSelf: "flex-end", flexDirection: "row-reverse" });
  });
});
