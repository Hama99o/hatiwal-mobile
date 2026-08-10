/**
 * ProfileStatsGrid unit tests
 *
 * Review fix (TASK-TX02, LOW — "dead API surface"): the `columns` prop and
 * its filler-slot padding were removed — this component has exactly ONE
 * caller (Profile.tsx#ProfileContent), which always passes a 1- or 2-entry
 * `stats` array, so the filler branch was provably always a no-op in
 * production. Only the divider behavior (still real, still used) is covered
 * here now.
 *
 * Covers the CR MED "borderRightWidth does not flip with row-reverse" fix:
 * dividers between cells are dedicated 1px `View` siblings (reset by
 * flexDirection along with everything else) instead of a physical
 * `borderRightWidth`, which stayed on the visual right under RTL.
 *
 * All hooks (useColors, useLocalization) are mocked globally in
 * src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ProfileStatsGrid } from "../Profile";

describe("ProfileStatsGrid", () => {
  it("renders every stat's label and value", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "Sold", value: "3" },
          { label: "Active", value: "5" },
        ]}
      />
    );

    expect(screen.getByText("Sold")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("renders a 1px divider between two real stats", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "Sold", value: "3" },
          { label: "Active", value: "5" },
        ]}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(1);
  });

  it("renders no divider for a single stat — its own flex:1 cell centres across the row", () => {
    render(<ProfileStatsGrid stats={[ { label: "Active", value: "5" } ]} />);

    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(0);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByText("Sold")).toBeNull();
  });

  it("renders no dividers for an empty stats array", () => {
    render(<ProfileStatsGrid stats={[]} />);

    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(0);
  });

  it("renders N-1 dividers for 3+ stats", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "A", value: "1" },
          { label: "B", value: "2" },
          { label: "C", value: "3" },
        ]}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(2);
  });
});
