/**
 * Unit tests for the RNR Textarea wrapper (TASK-P401 — micro-interactions).
 * See input.test.tsx for why the reanimated-driven parts aren't directly
 * assertable under the global mock; these cover the same observable surface.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Textarea } from "../textarea";

describe("Textarea", () => {
  it("renders a multiline text field with the given placeholder", () => {
    const { getByPlaceholderText } = render(<Textarea placeholder="Bio" />);
    const field = getByPlaceholderText("Bio");
    expect(field).toBeTruthy();
    expect(field.props.multiline).toBe(true);
  });

  it("calls the caller's onFocus/onBlur alongside the internal focus animation", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <Textarea placeholder="Bio" onFocus={onFocus} onBlur={onBlur} />
    );
    const field = getByPlaceholderText("Bio");

    fireEvent(field, "focus");
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent(field, "blur");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("renders a solid destructive border when `error` is true", () => {
    const { getByPlaceholderText } = render(<Textarea placeholder="Bio" error />);
    expect(getByPlaceholderText("Bio")).toHaveStyle({ borderColor: "hsl(0,84%,60%)" });
  });

  it("renders the label above the field when `label` is supplied", () => {
    const { getByText, getByPlaceholderText } = render(
      <Textarea placeholder="Bio" label="About you" />
    );
    expect(getByText("About you")).toBeTruthy();
    expect(getByPlaceholderText("Bio")).toBeTruthy();
  });

  it("does not render a label when the `label` prop is omitted", () => {
    const { queryByText } = render(<Textarea placeholder="Bio" />);
    expect(queryByText("About you")).toBeNull();
  });

  it("forwards a ref to the underlying native TextInput", () => {
    const ref = React.createRef<React.ElementRef<typeof Textarea>>();
    render(<Textarea placeholder="Bio" ref={ref} />);
    expect(ref.current).not.toBeNull();
  });
});
