import React from "react";
import { render, screen } from "@testing-library/react-native";
import { VerifiedBadge } from "../VerifiedBadge";

jest.mock("lucide-react-native", () => ({
  BadgeCheck: "BadgeCheck",
}));

describe("VerifiedBadge — icon-only (default)", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(<VerifiedBadge />);
    expect(toJSON()).toBeTruthy();
  });

  it("does NOT render the verified text label", () => {
    render(<VerifiedBadge />);
    expect(screen.queryByText("common.verified")).toBeNull();
  });
});

describe("VerifiedBadge — with label", () => {
  it("renders the text label when withLabel is true", () => {
    render(<VerifiedBadge withLabel />);
    expect(screen.getByText("common.verified")).toBeTruthy();
  });

  it("renders without crashing with withLabel", () => {
    const { toJSON } = render(<VerifiedBadge withLabel />);
    expect(toJSON()).toBeTruthy();
  });
});

describe("VerifiedBadge — custom size", () => {
  it("renders at size 24 without error", () => {
    const { toJSON } = render(<VerifiedBadge size={24} />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders at size 12 without error", () => {
    const { toJSON } = render(<VerifiedBadge size={12} />);
    expect(toJSON()).toBeTruthy();
  });
});
