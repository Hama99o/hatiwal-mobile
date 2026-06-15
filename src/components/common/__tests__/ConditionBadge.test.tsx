import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ConditionBadge } from "../ConditionBadge";
import type { ListingCondition } from "@/api/listings";

// t() returns the key, so we assert on "listing.condition.<key>"
describe("ConditionBadge", () => {
  const conditions: ListingCondition[] = ["brand_new", "like_new", "good", "fair"];

  it.each(conditions)("renders %s condition", (condition) => {
    render(<ConditionBadge condition={condition} />);
    expect(screen.getByText(`listing.condition.${condition}`)).toBeTruthy();
  });

  it("has accessibilityRole text", () => {
    render(<ConditionBadge condition="good" />);
    expect(screen.getByRole("text")).toBeTruthy();
  });

  it("renders only one text element", () => {
    render(<ConditionBadge condition="fair" />);
    // Only the condition text — no extra elements
    expect(screen.getAllByText("listing.condition.fair")).toHaveLength(1);
  });
});
