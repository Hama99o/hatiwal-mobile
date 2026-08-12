/**
 * ListingFormSkeleton unit tests — TASK-P736 (review fix, CR round 3,
 * extended round 5).
 *
 * Pure presentational loading state. Covers:
 *  1. It renders (has its `testID` root) without crashing.
 *  2. It mirrors every section of the real form, including Condition and
 *     Address — the two rows a previous review round found missing (the
 *     skeleton was ~2 rows shorter than the form it stands in for, so
 *     content visibly grew when data landed).
 *  3. The Title section additionally has a character-counter placeholder
 *     row, and the Price section a negotiable-toggle placeholder row —
 *     round 5's fix for the same "content visibly grows when data lands"
 *     defect on the two rows the real form renders that Condition/Address
 *     didn't cover.
 *
 * useColors/useLocalization are mocked globally in src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ListingFormSkeleton } from "../ListingFormSkeleton";

describe("ListingFormSkeleton", () => {
  it("renders its root testID", () => {
    render(<ListingFormSkeleton />);
    expect(screen.getByTestId("listing-form-skeleton")).toBeTruthy();
  });

  it("mirrors every section of the real form — 8 skeleton groups (photos, title, price, category, condition, description, location, address)", () => {
    render(<ListingFormSkeleton />);
    const root = screen.getByTestId("listing-form-skeleton");
    // Each section is its own direct child <View style={{ gap: ... }}>.
    expect(root.children.length).toBe(8);
  });

  it("gives the Title section a character-counter placeholder row", () => {
    render(<ListingFormSkeleton />);
    expect(screen.getByTestId("listing-form-skeleton-title-counter")).toBeTruthy();
  });

  it("gives the Price section a negotiable-toggle placeholder row", () => {
    render(<ListingFormSkeleton />);
    expect(screen.getByTestId("listing-form-skeleton-negotiable")).toBeTruthy();
  });
});
