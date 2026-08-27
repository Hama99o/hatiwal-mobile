/**
 * QuantityStepper unit tests (SF-M6).
 *
 * Covers: the +/- clamp at min/max, the tap-to-edit swap (commit on blur/
 * submit, clamped, non-digit stripped, empty reverts instead of forcing
 * `min`), the `disabled` prop, RTL row mirroring, and accessibility wiring.
 *
 * `useColors`/`react-i18next` come from the global mocks in
 * src/__tests__/setup.ts (t(key) => key). `useLocalization` is re-mocked here
 * as a jest.fn() so individual tests can flip `isRtl` — mirrors
 * ExpiryBadge.test.tsx's own local override of a globally-mocked hook.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockUseLocalization = jest.fn(() => ({
  formatNumber: (n: number) => String(n),
  isRtl: false,
}));

jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => mockUseLocalization(),
}));

jest.mock("lucide-react-native", () => ({
  Minus: "Minus",
  Plus: "Plus",
}));

import { QuantityStepper } from "../QuantityStepper";

beforeEach(() => {
  mockUseLocalization.mockReturnValue({
    formatNumber: (n: number) => String(n),
    isRtl: false,
  });
});

// ─── Rendering the current value ──────────────────────────────────────────

describe("QuantityStepper — rendering", () => {
  it("renders the current value formatted via useLocalization().formatNumber", () => {
    render(<QuantityStepper value={3} onChange={jest.fn()} max={10} testID="qty" />);
    expect(screen.getByTestId("qty-value")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders identically (same testIDs/structure) at value=1 regardless of min/max/size", () => {
    const { rerender } = render(
      <QuantityStepper value={1} onChange={jest.fn()} max={1} testID="qty" />
    );
    expect(screen.getByTestId("qty-decrement")).toBeTruthy();
    expect(screen.getByTestId("qty-value")).toBeTruthy();
    expect(screen.getByTestId("qty-increment")).toBeTruthy();

    rerender(<QuantityStepper value={1} onChange={jest.fn()} max={99} size="sm" testID="qty" />);
    expect(screen.getByTestId("qty-decrement")).toBeTruthy();
    expect(screen.getByTestId("qty-value")).toBeTruthy();
    expect(screen.getByTestId("qty-increment")).toBeTruthy();
  });
});

// ─── +/- taps ──────────────────────────────────────────────────────────────

describe("QuantityStepper — increment / decrement", () => {
  it("calls onChange with value+1 when + is pressed", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={10} testID="qty" />);
    fireEvent.press(screen.getByTestId("qty-increment"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("calls onChange with value-1 when - is pressed", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={10} testID="qty" />);
    fireEvent.press(screen.getByTestId("qty-decrement"));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("clamps at min (default 1) — decrement is disabled and never calls onChange", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={1} onChange={onChange} max={10} testID="qty" />);
    const decrementBtn = screen.getByTestId("qty-decrement");
    expect(decrementBtn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(decrementBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps at a custom min", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={2} onChange={onChange} min={2} max={10} testID="qty" />);
    fireEvent.press(screen.getByTestId("qty-decrement"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps at max (available stock) — increment is disabled and never calls onChange", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={5} onChange={onChange} max={5} testID="qty" />);
    const incrementBtn = screen.getByTestId("qty-increment");
    expect(incrementBtn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(incrementBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("never calls onChange with a value outside [min, max] across a full sweep", () => {
    const values: number[] = [];
    const onChange = jest.fn((v: number) => values.push(v));
    const { rerender } = render(
      <QuantityStepper value={1} onChange={onChange} max={3} testID="qty" />
    );
    for (let v = 1; v < 3; v++) {
      fireEvent.press(screen.getByTestId("qty-increment"));
      rerender(<QuantityStepper value={v + 1} onChange={onChange} max={3} testID="qty" />);
    }
    // One more tap past max must not fire.
    fireEvent.press(screen.getByTestId("qty-increment"));
    expect(values.every((v) => v >= 1 && v <= 3)).toBe(true);
    expect(values).toEqual([2, 3]);
  });
});

// ─── disabled prop ───────────────────────────────────────────────────────────

describe("QuantityStepper — disabled", () => {
  it("disables both +/- buttons and the tap-to-edit value when disabled=true", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={10} disabled testID="qty" />);

    expect(screen.getByTestId("qty-decrement").props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId("qty-increment").props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByTestId("qty-decrement"));
    fireEvent.press(screen.getByTestId("qty-increment"));
    fireEvent.press(screen.getByTestId("qty-value"));
    expect(onChange).not.toHaveBeenCalled();
    // Tapping the value while disabled must not swap to the editable input.
    expect(screen.queryByTestId("qty-input")).toBeNull();
  });
});

// ─── Tap-to-edit ──────────────────────────────────────────────────────────────

describe("QuantityStepper — tap-to-edit", () => {
  it("swaps the value for a numeric input on tap, and commits the typed value on submit", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={20} testID="qty" />);

    fireEvent.press(screen.getByTestId("qty-value"));
    const input = screen.getByTestId("qty-input");
    expect(input.props.keyboardType).toBe("numeric");
    expect(input.props.selectTextOnFocus).toBe(true);

    fireEvent.changeText(input, "12");
    fireEvent(input, "submitEditing");

    expect(onChange).toHaveBeenCalledWith(12);
    // Back to the plain tap-to-edit value display, not the input.
    expect(screen.queryByTestId("qty-input")).toBeNull();
  });

  it("commits on blur too (not just submitEditing)", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={20} testID="qty" />);

    fireEvent.press(screen.getByTestId("qty-value"));
    fireEvent.changeText(screen.getByTestId("qty-input"), "7");
    fireEvent(screen.getByTestId("qty-input"), "blur");

    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("clamps a typed value above max down to max", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={15} testID="qty" />);

    fireEvent.press(screen.getByTestId("qty-value"));
    fireEvent.changeText(screen.getByTestId("qty-input"), "153");
    fireEvent(screen.getByTestId("qty-input"), "submitEditing");

    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("clamps a typed value below min up to min", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} min={1} max={15} testID="qty" />);

    fireEvent.press(screen.getByTestId("qty-value"));
    fireEvent.changeText(screen.getByTestId("qty-input"), "0");
    fireEvent(screen.getByTestId("qty-input"), "submitEditing");

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("strips non-digit characters as they're typed", () => {
    render(<QuantityStepper value={3} onChange={jest.fn()} max={15} testID="qty" />);
    fireEvent.press(screen.getByTestId("qty-value"));
    const input = screen.getByTestId("qty-input");
    fireEvent.changeText(input, "1a2b");
    expect(input.props.value).toBe("12");
  });

  it("leaves the value unchanged (never forces min) when the field is committed empty", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={4} onChange={onChange} max={15} testID="qty" />);

    fireEvent.press(screen.getByTestId("qty-value"));
    fireEvent.changeText(screen.getByTestId("qty-input"), "");
    fireEvent(screen.getByTestId("qty-input"), "submitEditing");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("does not call onChange when the committed value equals the current value", () => {
    const onChange = jest.fn();
    render(<QuantityStepper value={5} onChange={onChange} max={15} testID="qty" />);
    fireEvent.press(screen.getByTestId("qty-value"));
    fireEvent.changeText(screen.getByTestId("qty-input"), "5");
    fireEvent(screen.getByTestId("qty-input"), "submitEditing");
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── RTL ──────────────────────────────────────────────────────────────────────

describe("QuantityStepper — RTL", () => {
  it("mirrors the row to row-reverse when isRtl is true (meaning, not just visual order, is preserved: - stays decrement, + stays increment)", () => {
    mockUseLocalization.mockReturnValue({ formatNumber: (n: number) => String(n), isRtl: true });
    const onChange = jest.fn();
    render(<QuantityStepper value={3} onChange={onChange} max={10} testID="qty" />);

    const row = screen.getByTestId("qty");
    const flat = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style)
      : row.props.style;
    expect(flat.flexDirection).toBe("row-reverse");

    // "-" still decrements and "+" still increments regardless of visual side.
    fireEvent.press(screen.getByTestId("qty-decrement"));
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.press(screen.getByTestId("qty-increment"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("uses row (not row-reverse) when isRtl is false", () => {
    render(<QuantityStepper value={3} onChange={jest.fn()} max={10} testID="qty" />);
    const row = screen.getByTestId("qty");
    const flat = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style)
      : row.props.style;
    expect(flat.flexDirection).toBe("row");
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("QuantityStepper — accessibility", () => {
  it("labels the +/- buttons via common.decreaseQuantity / common.increaseQuantity", () => {
    render(<QuantityStepper value={3} onChange={jest.fn()} max={10} testID="qty" />);
    expect(screen.getByTestId("qty-decrement").props.accessibilityLabel).toBe(
      "common.decreaseQuantity"
    );
    expect(screen.getByTestId("qty-increment").props.accessibilityLabel).toBe(
      "common.increaseQuantity"
    );
  });

  it("defaults the value control's accessibility label to common.quantity, overridable by the caller", () => {
    const { rerender } = render(
      <QuantityStepper value={3} onChange={jest.fn()} max={10} testID="qty" />
    );
    expect(screen.getByTestId("qty-value").props.accessibilityLabel).toBe("common.quantity");

    rerender(
      <QuantityStepper
        value={3}
        onChange={jest.fn()}
        max={10}
        testID="qty"
        accessibilityLabel="listing.detail.quantityAskingLabel"
      />
    );
    expect(screen.getByTestId("qty-value").props.accessibilityLabel).toBe(
      "listing.detail.quantityAskingLabel"
    );
  });

  it("exposes the current value/min/max via accessibilityValue", () => {
    render(<QuantityStepper value={3} onChange={jest.fn()} min={1} max={10} testID="qty" />);
    expect(screen.getByTestId("qty-value").props.accessibilityValue).toEqual({
      now: 3,
      min: 1,
      max: 10,
    });
  });
});
