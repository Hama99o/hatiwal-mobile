import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AwayBanner } from "../AwayBanner";

// Hooks (useTranslation → t returns key, useColors, useLocalization) are mocked
// globally in src/__tests__/setup.ts.
describe("AwayBanner", () => {
  it("renders nothing when awayUntil is null", () => {
    render(<AwayBanner awayUntil={null} />);
    // The banner should not render any text
    expect(screen.queryByText("seller.awayBanner")).toBeNull();
  });

  it("renders nothing when awayUntil is undefined", () => {
    render(<AwayBanner awayUntil={undefined} />);
    expect(screen.queryByText("seller.awayBanner")).toBeNull();
  });

  it("renders nothing when awayUntil is a past date", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    render(<AwayBanner awayUntil={pastDate} />);
    expect(screen.queryByText("seller.awayBanner")).toBeNull();
  });

  it("renders the banner when awayUntil is a future date", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(); // 48 hours from now
    render(<AwayBanner awayUntil={futureDate} />);
    // The t() mock returns the key, so we check for "seller.awayBanner"
    expect(screen.getByText("seller.awayBanner")).toBeTruthy();
  });

  it("renders nothing when awayUntil is an invalid date string", () => {
    render(<AwayBanner awayUntil="not-a-date" />);
    expect(screen.queryByText("seller.awayBanner")).toBeNull();
  });
});
