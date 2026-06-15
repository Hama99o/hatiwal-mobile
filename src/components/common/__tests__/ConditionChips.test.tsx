import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ConditionChips } from "../ConditionChips";
import { LISTING_CONDITIONS } from "@/api/listings";

jest.mock("lucide-react-native", () => ({
  BadgeCheck: "BadgeCheck",
}));

describe("ConditionChips — renders all conditions", () => {
  it("renders all 4 condition chips", () => {
    render(<ConditionChips value={null} onChange={jest.fn()} />);
    for (const c of LISTING_CONDITIONS) {
      expect(screen.getByText(`listing.condition.${c}`)).toBeTruthy();
    }
  });

  it("marks the selected chip with accessibilityState selected=true", () => {
    render(<ConditionChips value="like_new" onChange={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "listing.condition.like_new" });
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });

  it("unselected chips have selected=false", () => {
    render(<ConditionChips value="good" onChange={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "listing.condition.brand_new" });
    expect(chip.props.accessibilityState?.selected).toBe(false);
  });

  it("calls onChange with the tapped condition", () => {
    const onChange = jest.fn();
    render(<ConditionChips value={null} onChange={onChange} />);
    fireEvent.press(screen.getByRole("button", { name: "listing.condition.good" }));
    expect(onChange).toHaveBeenCalledWith("good");
  });
});

describe("ConditionChips — allowClear behavior", () => {
  it("clears selection when tapping the selected chip with allowClear=true", () => {
    const onChange = jest.fn();
    render(<ConditionChips value="fair" onChange={onChange} allowClear />);
    fireEvent.press(screen.getByRole("button", { name: "listing.condition.fair" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does NOT clear when allowClear=false (default)", () => {
    const onChange = jest.fn();
    render(<ConditionChips value="fair" onChange={onChange} />);
    fireEvent.press(screen.getByRole("button", { name: "listing.condition.fair" }));
    // tapping selected without allowClear → same condition, not null
    expect(onChange).toHaveBeenCalledWith("fair");
  });

  it("switches selection when tapping a different chip", () => {
    const onChange = jest.fn();
    render(<ConditionChips value="fair" onChange={onChange} />);
    fireEvent.press(screen.getByRole("button", { name: "listing.condition.brand_new" }));
    expect(onChange).toHaveBeenCalledWith("brand_new");
  });
});
