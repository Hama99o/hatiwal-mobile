/**
 * OfferSheetChips.test.tsx — TASK-G083
 *
 * Unit tests for the quick-amount suggestion chip behaviour added to OfferSheet.
 *
 * Verifies:
 *  - computeChipAmount returns the expected rounded amounts for known prices.
 *  - Three chips are rendered when the sheet is visible.
 *  - Tapping a chip calls onChangeAmount with the computed amount string.
 *  - Tapping different chips each produces the correct amount.
 *  - Chips are NOT rendered while isBusy is true (offer in flight).
 *  - RTL layout: chips still render without throwing when isRtl = true.
 *  - Zero/negative price edge case: clamps to 1.
 *  - Chip for the 90% amount sets the input to the expected value (acceptance criterion).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// Additional mocks on top of global setup.ts mocks
jest.mock("lucide-react-native", () => ({
  X: "X",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Import component and pure helper AFTER mocks
import { OfferSheet, computeChipAmount } from "../OfferSheet";

// ─── computeChipAmount — pure unit tests ──────────────────────────────────────

describe("computeChipAmount", () => {
  it("returns 95% of a round price", () => {
    expect(computeChipAmount(10000, 0.95)).toBe(9500);
  });

  it("returns 90% of a round price", () => {
    expect(computeChipAmount(10000, 0.9)).toBe(9000);
  });

  it("returns 85% of a round price", () => {
    expect(computeChipAmount(10000, 0.85)).toBe(8500);
  });

  it("rounds fractional results to the nearest whole number", () => {
    // 25000 * 0.95 = 23750 — exact
    expect(computeChipAmount(25000, 0.95)).toBe(23750);
    // 25000 * 0.85 = 21250 — exact
    expect(computeChipAmount(25000, 0.85)).toBe(21250);
  });

  it("rounds 33333 * 0.9 = 29999.7 → 30000", () => {
    expect(computeChipAmount(33333, 0.9)).toBe(30000);
  });

  it("clamps zero price to 1", () => {
    expect(computeChipAmount(0, 0.9)).toBe(1);
  });

  it("clamps negative price to 1", () => {
    expect(computeChipAmount(-100, 0.9)).toBe(1);
  });

  it("handles USD price of 150 correctly at 90%", () => {
    expect(computeChipAmount(150, 0.9)).toBe(135);
  });
});

// ─── Factory helper ───────────────────────────────────────────────────────────

function buildProps(
  overrides: Partial<React.ComponentProps<typeof OfferSheet>> = {}
): React.ComponentProps<typeof OfferSheet> {
  return {
    visible: true,
    onClose: jest.fn(),
    onSend: jest.fn(),
    offerAmount: "",
    onChangeAmount: jest.fn(),
    currency: "AFN",
    price: 25000,
    isBusy: false,
    ...overrides,
  };
}

// ─── Chip rendering ───────────────────────────────────────────────────────────

describe("OfferSheet — quick-amount chips rendering", () => {
  it("renders three chips when visible=true and isBusy=false", () => {
    render(<OfferSheet {...buildProps({ price: 10000 })} />);
    // The global mock formatCurrency returns "AFN <amount>"
    // Chip amounts for 10000: 95%=9500, 90%=9000, 85%=8500
    expect(screen.getByText("AFN 9500")).toBeTruthy();
    expect(screen.getByText("AFN 9000")).toBeTruthy();
    expect(screen.getByText("AFN 8500")).toBeTruthy();
  });

  it("renders chips with correct amounts for a 25000 AFN listing", () => {
    render(<OfferSheet {...buildProps({ price: 25000, currency: "AFN" })} />);
    // 25000 * 0.95 = 23750, 0.90 = 22500, 0.85 = 21250
    expect(screen.getByText("AFN 23750")).toBeTruthy();
    expect(screen.getByText("AFN 22500")).toBeTruthy();
    expect(screen.getByText("AFN 21250")).toBeTruthy();
  });

  it("renders chips for USD currency with USD prefix", () => {
    render(<OfferSheet {...buildProps({ price: 150, currency: "USD" })} />);
    // 150 * 0.95 = 142.5 → 143 (rounded), 0.90 = 135, 0.85 = 127.5 → 128
    expect(screen.getByText("USD 143")).toBeTruthy();
    expect(screen.getByText("USD 135")).toBeTruthy();
    expect(screen.getByText("USD 128")).toBeTruthy();
  });

  it("does NOT render chips while isBusy is true (offer in flight)", () => {
    render(<OfferSheet {...buildProps({ price: 10000, isBusy: true })} />);
    expect(screen.queryByText("AFN 9500")).toBeNull();
    expect(screen.queryByText("AFN 9000")).toBeNull();
    expect(screen.queryByText("AFN 8500")).toBeNull();
  });

  it("renders the quickChipsHint label when chips are shown", () => {
    render(<OfferSheet {...buildProps({ price: 10000 })} />);
    expect(screen.getByText("chat.offer.quickChipsHint")).toBeTruthy();
  });

  it("does not render the quickChipsHint label when isBusy", () => {
    render(<OfferSheet {...buildProps({ price: 10000, isBusy: true })} />);
    expect(screen.queryByText("chat.offer.quickChipsHint")).toBeNull();
  });
});

// ─── Chip tap → fills the offer amount input (acceptance criterion) ───────────

describe("OfferSheet — tapping a chip fills the offer amount", () => {
  it("tapping the 90% chip calls onChangeAmount with the 90% amount string", () => {
    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 10000, onChangeAmount })} />);
    // 90% of 10000 = 9000
    fireEvent.press(screen.getByText("AFN 9000"));
    expect(onChangeAmount).toHaveBeenCalledTimes(1);
    expect(onChangeAmount).toHaveBeenCalledWith("9000");
  });

  it("tapping the 95% chip calls onChangeAmount with the 95% amount string", () => {
    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 10000, onChangeAmount })} />);
    fireEvent.press(screen.getByText("AFN 9500"));
    expect(onChangeAmount).toHaveBeenCalledWith("9500");
  });

  it("tapping the 85% chip calls onChangeAmount with the 85% amount string", () => {
    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 10000, onChangeAmount })} />);
    fireEvent.press(screen.getByText("AFN 8500"));
    expect(onChangeAmount).toHaveBeenCalledWith("8500");
  });

  it("does NOT auto-send when a chip is tapped (onSend is not called)", () => {
    const onSend = jest.fn();
    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 10000, onSend, onChangeAmount })} />);
    fireEvent.press(screen.getByText("AFN 9000"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("tapping 90% chip of 25000 AFN listing sets amount to '22500'", () => {
    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 25000, currency: "AFN", onChangeAmount })} />);
    fireEvent.press(screen.getByText("AFN 22500"));
    expect(onChangeAmount).toHaveBeenCalledWith("22500");
  });
});

// ─── RTL layout ───────────────────────────────────────────────────────────────

describe("OfferSheet — chips RTL locale", () => {
  it("renders chips without throwing when isRtl = true (Pashto locale)", () => {
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      formatCurrency: (amount: number, currency = "AFN") => `${currency} ${amount}`,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      isRtl: true,
      lang: "ps",
    });

    expect(() =>
      render(<OfferSheet {...buildProps({ price: 10000, currency: "AFN" })} />)
    ).not.toThrow();

    // Chips should still be present
    expect(screen.getByText("AFN 9500")).toBeTruthy();
    expect(screen.getByText("AFN 9000")).toBeTruthy();
    expect(screen.getByText("AFN 8500")).toBeTruthy();

    jest.restoreAllMocks();
  });

  it("chip tap still calls onChangeAmount correctly in RTL mode", () => {
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      formatCurrency: (amount: number, currency = "AFN") => `${currency} ${amount}`,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      isRtl: true,
      lang: "fa",
    });

    const onChangeAmount = jest.fn();
    render(<OfferSheet {...buildProps({ price: 10000, onChangeAmount })} />);
    fireEvent.press(screen.getByText("AFN 9000"));
    expect(onChangeAmount).toHaveBeenCalledWith("9000");

    jest.restoreAllMocks();
  });
});

// ─── Selected chip state ──────────────────────────────────────────────────────

describe("OfferSheet — selected chip visual state", () => {
  it("marks the chip matching the current offerAmount as selected", () => {
    // When offerAmount already equals the chip value (e.g. user tapped it),
    // the chip renders with selected accessibilityState.
    render(
      <OfferSheet
        {...buildProps({ price: 10000, offerAmount: "9000" })}
      />
    );
    const chip = screen.getByTestId("quick-chip-9000");
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });

  it("does not mark chips as selected when offerAmount does not match any chip", () => {
    render(<OfferSheet {...buildProps({ price: 10000, offerAmount: "7777" })} />);
    const chip95 = screen.getByTestId("quick-chip-9500");
    const chip90 = screen.getByTestId("quick-chip-9000");
    const chip85 = screen.getByTestId("quick-chip-8500");
    expect(chip95.props.accessibilityState?.selected).toBe(false);
    expect(chip90.props.accessibilityState?.selected).toBe(false);
    expect(chip85.props.accessibilityState?.selected).toBe(false);
  });
});
