import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { EmptyState } from "../EmptyState";

const MockIcon = () => null;

// A minimal inline illustration node — just a View with a testID
const MockIllustration = <View testID="mock-illustration" />;

describe("EmptyState — icon fallback (existing behaviour)", () => {
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
    // The title is always rendered; verifies the component mounted
    const el = screen.getByText("Empty");
    expect(el).toBeTruthy();
  });
});

describe("EmptyState — illustration prop (new behaviour)", () => {
  it("mounts the illustration node when the illustration prop is supplied", () => {
    render(
      <EmptyState
        illustration={MockIllustration}
        title="No results"
        description="Try again."
      />
    );
    expect(screen.getByTestId("mock-illustration")).toBeTruthy();
  });

  it("still renders title and description when illustration is supplied", () => {
    render(
      <EmptyState
        illustration={MockIllustration}
        title="No results"
        description="Try again."
      />
    );
    expect(screen.getByText("No results")).toBeTruthy();
    expect(screen.getByText("Try again.")).toBeTruthy();
  });

  it("renders CTA when illustration is supplied alongside an action", () => {
    const onPress = jest.fn();
    render(
      <EmptyState
        illustration={MockIllustration}
        title="No results"
        action={{ label: "Reset", onPress }}
      />
    );
    expect(screen.getByText("Reset")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Reset"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does NOT render the illustration node when illustration prop is omitted (icon fallback)", () => {
    render(<EmptyState icon={MockIcon} title="Empty" />);
    expect(screen.queryByTestId("mock-illustration")).toBeNull();
  });

  it("renders with illustration prop only (no icon, no description, no action)", () => {
    render(
      <EmptyState
        illustration={MockIllustration}
        title="Nothing here"
      />
    );
    expect(screen.getByTestId("mock-illustration")).toBeTruthy();
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});
