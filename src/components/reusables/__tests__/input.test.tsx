/**
 * Unit tests for the RNR Input wrapper (TASK-P401 — micro-interactions).
 *
 * The focus-driven border/label color transition runs through
 * `react-native-reanimated`, which the global Jest mock
 * (`react-native-reanimated/mock`, wired in src/__tests__/setup.ts) reduces
 * to synchronous, no-op values — `interpolateColor` resolves to `undefined`
 * under test and `createAnimatedComponent` is the identity function. These
 * tests verify the parts that ARE observable under that mock: focus/blur
 * handlers fire (and still call a caller-supplied onFocus/onBlur), the
 * `error` prop always renders a solid destructive border (a static value,
 * not an interpolated one), the optional `label` renders only when
 * supplied, and the component still forwards a ref to the native field.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Input } from "../input";

describe("Input", () => {
  it("renders a text field with the given placeholder", () => {
    const { getByPlaceholderText } = render(<Input placeholder="Email" />);
    expect(getByPlaceholderText("Email")).toBeTruthy();
  });

  it("calls the caller's onFocus/onBlur alongside the internal focus animation", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Email" onFocus={onFocus} onBlur={onBlur} />
    );
    const field = getByPlaceholderText("Email");

    fireEvent(field, "focus");
    expect(onFocus).toHaveBeenCalledTimes(1);

    fireEvent(field, "blur");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("works with no onFocus/onBlur supplied at all", () => {
    const { getByPlaceholderText } = render(<Input placeholder="Email" />);
    const field = getByPlaceholderText("Email");
    expect(() => {
      fireEvent(field, "focus");
      fireEvent(field, "blur");
    }).not.toThrow();
  });

  it("renders a solid destructive border when `error` is true", () => {
    const { getByPlaceholderText } = render(<Input placeholder="Title" error />);
    expect(getByPlaceholderText("Title")).toHaveStyle({ borderColor: "hsl(0,84%,60%)" });
  });

  it("does not render a label when the `label` prop is omitted", () => {
    const { queryByText } = render(<Input placeholder="Title" />);
    expect(queryByText("Email address")).toBeNull();
  });

  it("renders the label above the field when `label` is supplied", () => {
    const { getByText, getByPlaceholderText } = render(
      <Input placeholder="Title" label="Email address" />
    );
    expect(getByText("Email address")).toBeTruthy();
    expect(getByPlaceholderText("Title")).toBeTruthy();
  });

  it("forwards a ref to the underlying native TextInput", () => {
    const ref = React.createRef<React.ElementRef<typeof Input>>();
    render(<Input placeholder="Title" ref={ref} />);
    expect(ref.current).not.toBeNull();
  });
});
