import React from "react";
import { render, screen } from "@testing-library/react-native";
import { WarningBanner } from "../WarningBanner";

// Hooks (useTranslation → t returns key, useColors, useLocalization) are mocked
// globally in src/__tests__/setup.ts.
describe("WarningBanner", () => {
  it("renders nothing when there are no active warnings", () => {
    render(<WarningBanner activeCount={0} threshold={3} />);
    expect(screen.queryByText("warning.title")).toBeNull();
  });

  it("shows the title and the warning reasons when there are active warnings", () => {
    render(
      <WarningBanner
        activeCount={2}
        threshold={3}
        warnings={[{ reason: "Posting spam listings", category: "spam", expiresAt: "2026-07-01T00:00:00Z" }]}
      />
    );

    expect(screen.getByText("warning.title")).toBeTruthy();
    expect(screen.getByText("warning.remaining")).toBeTruthy();
    expect(screen.getByText("Posting spam listings")).toBeTruthy();
  });

  it("shows the at-limit message when the threshold is reached", () => {
    render(<WarningBanner activeCount={3} threshold={3} />);
    expect(screen.getByText("warning.atLimit")).toBeTruthy();
  });
});
