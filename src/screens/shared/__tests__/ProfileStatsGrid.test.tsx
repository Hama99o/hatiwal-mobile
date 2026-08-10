/**
 * ProfileStatsGrid unit tests (TASK-TX02 review fix)
 *
 * Regression covered: the own-profile stats row conditionally omits its
 * Sold/Bought cell when the count is 0 (Profile.tsx#ProfileContent). An
 * earlier version always padded the row with an invisible filler `View` up
 * to `columns`, which is correct for a partially-filled MULTI-stat grid but
 * wrong for a single lone stat — the filler ate half the row, squeezing the
 * one real stat into the leading half instead of letting it centre across
 * the whole card (CR MED "render the 0 or centre a lone stat" / DR MAJOR
 * "only reserve fillers when stats.length>=2"). Fillers are now only
 * reserved once there are already 2+ real stats to pad; a lone stat's own
 * `flex: 1` cell spans (and centres within) the full row instead.
 *
 * Also covers the CR MED "borderRightWidth does not flip with row-reverse"
 * fix: dividers between cells are now dedicated 1px `View` siblings (reset by
 * flexDirection along with everything else) instead of a physical
 * `borderRightWidth`, which stayed on the visual right under RTL.
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

  it("renders a 1px divider between two real stats (not a filler)", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "Sold", value: "3" },
          { label: "Active", value: "5" },
        ]}
        columns={2}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(1);
    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
  });

  it("reserves NO filler slot when a conditional stat is hidden (count 0) — the lone stat centres instead", () => {
    // Mirrors ProfileContent: the "Sold" cell is omitted entirely (not
    // rendered as "0"), leaving only "Active". Fillers are only reserved
    // once 2+ real stats exist, so a lone stat's flex:1 cell spans (and
    // centres within) the full row instead of being squeezed into half of it.
    render(
      <ProfileStatsGrid
        stats={[ { label: "Active", value: "5" } ]}
        columns={2}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByText("Sold")).toBeNull();
  });

  it("defaults columns to stats.length (no filler) when columns is omitted", () => {
    render(<ProfileStatsGrid stats={[ { label: "Active", value: "5" } ]} />);

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
  });

  it("reserves no filler slots for an empty stats array even with columns=2 (fewer than 2 real stats)", () => {
    render(<ProfileStatsGrid stats={[]} columns={2} />);

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(0);
  });

  it("pads a partially-filled MULTI-stat grid (2+ real stats) up to columns", () => {
    render(
      <ProfileStatsGrid
        stats={[
          { label: "Sold", value: "3" },
          { label: "Active", value: "5" },
        ]}
        columns={4}
      />
    );

    expect(screen.queryAllByTestId("profile-stats-filler")).toHaveLength(2);
    expect(screen.queryAllByTestId("profile-stats-divider")).toHaveLength(1);
  });
});
