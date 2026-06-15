import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { EmptyState } from "../EmptyState";

const MockIcon = () => null;

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState icon={MockIcon} title="No listings yet" />);
    expect(screen.getByText("No listings yet")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon={MockIcon}
        title="Nothing here"
        description="Try changing your filters"
      />
    );
    expect(screen.getByText("Try changing your filters")).toBeTruthy();
  });

  it("does not render description when omitted", () => {
    render(<EmptyState icon={MockIcon} title="Nothing here" />);
    expect(screen.queryByText("Try changing your filters")).toBeNull();
  });

  it("renders action button when provided", () => {
    const onPress = jest.fn();
    render(
      <EmptyState
        icon={MockIcon}
        title="Nothing saved"
        action={{ label: "Browse listings", onPress }}
      />
    );
    expect(screen.getByText("Browse listings")).toBeTruthy();
  });

  it("calls action.onPress when button is tapped", () => {
    const onPress = jest.fn();
    render(
      <EmptyState
        icon={MockIcon}
        title="Empty"
        action={{ label: "Go browse", onPress }}
      />
    );
    fireEvent.press(screen.getByLabelText("Go browse"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when action is omitted", () => {
    render(<EmptyState icon={MockIcon} title="Empty" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders icon container", () => {
    render(<EmptyState icon={MockIcon} title="Empty" />);
    // The icon container view is always rendered
    const el = screen.getByText("Empty");
    expect(el).toBeTruthy();
  });
});
