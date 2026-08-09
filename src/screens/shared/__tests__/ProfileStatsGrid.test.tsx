/**
 * ProfileStatsGrid unit tests (TASK-TX02 review fix)
 *
 * Regression covered: the own-profile stats row conditionally omits its
 * Sold/Bought cell when the count is 0 (Profile.tsx#ProfileContent). Before
 * this fix, `flex: 1` re-distributed the remaining stat(s) across the WHOLE
 * row whenever an item was omitted from the `stats` array, so a single
 * remaining stat stretched to fill a row meant to show a balanced 2-up
 * grid. Passing a fixed `columns` count now reserves an invisible filler
 * slot instead, so the grid never collapses to one oversized cell.
 *
 * All hooks (useColors, useLocalization) are mocked globally in
 * src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ProfileStatsGrid } from "../Profile";

describe("ProfileStatsGrid — columns prop (grid-collapse fix)", () => {
  it("renders no filler slots when stats already fill every column", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "Sold", value: "3" },
          { label: "Active", value: "5" },
        ]}
        columns={2}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
    expect(screen.getByText("Sold")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("reserves an invisible filler slot when a conditional stat is hidden (count 0)", () => {
    // Mirrors ProfileContent: the "Sold" cell is omitted entirely (not
    // rendered as "0"), leaving only "Active" — columns=2 must still
    // reserve 2 total slots so "Active" does not stretch full-width.
    render(
      <ProfileStatsGrid
        stats={[ { label: "Active", value: "5" } ]}
        columns={2}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(1);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByText("Sold")).toBeNull();
  });

  it("defaults columns to stats.length (no filler) when columns is omitted", () => {
    render(<ProfileStatsGrid stats={[ { label: "Active", value: "5" } ]} />);

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
  });

  it("reserves 2 filler slots for an empty stats array with columns=2", () => {
    render(<ProfileStatsGrid stats={[]} columns={2} />);

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(2);
  });
});
