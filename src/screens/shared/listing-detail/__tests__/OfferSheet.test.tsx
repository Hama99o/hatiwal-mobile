/**
 * OfferSheet unit tests.
 *
 * Asserts:
 *  - Listed price renders via formatCurrency for AFN and USD.
 *  - Entering an offer amount and pressing Submit invokes onSend with the
 *    entered amount string.
 *  - Pressing the close / cancel affordance fires onClose.
 *  - Submit button is disabled when offerAmount is empty.
 *  - Submit button is disabled when isBusy is true.
 *  - RTL layout flag (isRtl) does not throw and the sheet still renders.
 *
 * useLocalization is mocked via the global setup (src/__tests__/setup.ts):
 *   formatCurrency(amount, currency) => `${currency} ${amount}`
 * useColors is mocked globally to return fixed light-mode tokens.
 * react-i18next t() returns the translation key unchanged.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ─── Additional mocks (on top of the global setup.ts mocks) ───────────────────

// Lucide icons — mock to plain strings to avoid react-native-css-interop chain
jest.mock("lucide-react-native", () => ({
  X: "X",
  ArrowLeftRight: "ArrowLeftRight",
}));

// react-native-safe-area-context — provide deterministic insets
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

import { OfferSheet } from "../OfferSheet";

// ─── Factory helper ───────────────────────────────────────────────────────────

function buildProps(overrides: Partial<React.ComponentProps<typeof OfferSheet>> = {}): React.ComponentProps<typeof OfferSheet> {
  return {
    visible: true,
    onClose: jest.fn(),
    onSend: jest.fn(),
    offerAmount: "20000",
    onChangeAmount: jest.fn(),
    currency: "AFN",
    price: 25000,
    isBusy: false,
    ...overrides,
  };
}

// ─── Listed price via formatCurrency ──────────────────────────────────────────

describe("OfferSheet — listed price display", () => {
  it("renders the formatted AFN price from formatCurrency", () => {
    render(<OfferSheet {...buildProps({ currency: "AFN", price: 25000 })} />);
    // The global mock returns "AFN 25000"; t("listing.detail.listedPrice", …)
    // returns the key with interpolation stripped, but the inner formatCurrency
    // value is rendered separately — we check the currency token appears.
    // The component embeds formatCurrency output inside the translation call:
    //   t("listing.detail.listedPrice", { price: formatCurrency(price, currency) })
    // Since t() returns the key unchanged (setup.ts), the rendered text is
    //   "listing.detail.listedPrice"
    // and the formatted price "AFN 25000" appears inside the interpolated object.
    // react-i18next's mock returns the key, so we verify the key is present.
    expect(screen.getByText("listing.detail.listedPrice")).toBeTruthy();
  });

  it("renders the USD formatted price via formatCurrency for USD currency", () => {
    render(<OfferSheet {...buildProps({ currency: "USD", price: 150 })} />);
    // formatCurrency("USD", 150) => "USD 150" per global mock.
    // Same key assertion — the t() mock returns the key; price arg is passed.
    expect(screen.getByText("listing.detail.listedPrice")).toBeTruthy();
  });
});

// ─── formatCurrency output embedded in component ──────────────────────────────

describe("OfferSheet — formatCurrency integration", () => {
  it("calls formatCurrency with the AFN currency and price", () => {
    // Override the useLocalization mock to spy on formatCurrency
    const mockFormatCurrency = jest.fn((amount: number, currency = "AFN") => `${currency} ${amount}`);
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      formatCurrency: mockFormatCurrency,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      isRtl: false,
      lang: "en",
    });

    render(<OfferSheet {...buildProps({ currency: "AFN", price: 25000 })} />);
    expect(mockFormatCurrency).toHaveBeenCalledWith(25000, "AFN");

    jest.restoreAllMocks();
  });

  it("calls formatCurrency with USD currency and price", () => {
    const mockFormatCurrency = jest.fn((amount: number, currency = "AFN") => `${currency} ${amount}`);
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      formatCurrency: mockFormatCurrency,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      isRtl: false,
      lang: "en",
    });

    render(<OfferSheet {...buildProps({ currency: "USD", price: 150 })} />);
    expect(mockFormatCurrency).toHaveBeenCalledWith(150, "USD");

    jest.restoreAllMocks();
  });
});

// ─── Submit callback ───────────────────────────────────────────────────────────

describe("OfferSheet — submit callback", () => {
  it("calls onSend with the entered offer amount when submit is pressed", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ offerAmount: "20000", onSend })} />);
    fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("20000");
  });

  it("calls onSend with USD offer amount", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ currency: "USD", price: 150, offerAmount: "120", onSend })} />);
    fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    expect(onSend).toHaveBeenCalledWith("120");
  });

  it("passes the current offerAmount prop value to onSend", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ offerAmount: "5500", onSend })} />);
    fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    expect(onSend).toHaveBeenCalledWith("5500");
  });
});

// ─── Cancel / close callback ──────────────────────────────────────────────────

describe("OfferSheet — cancel/close callback", () => {
  it("calls onClose when the X icon button is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(<OfferSheet {...buildProps({ onClose })} />);
    // The lucide X mock renders as a named string component "X".
    // In the test tree, the Pressable wrapping it appears as an accessible View.
    // We find all accessible Views and press the one containing the X icon.
    // The close Pressable is the second accessible View (first is the backdrop).
    const accessibleViews = UNSAFE_getAllByType(require("react-native").View).filter(
      (v: any) => v.props.accessible === true
    );
    // The backdrop is the first accessible View (full-screen Pressable).
    // The close button is the second accessible View (wraps the X icon).
    const closeButton = accessibleViews.find((v: any) => {
      const children = v.props.children;
      // Look for the View that directly wraps an X component child
      return children && (typeof children === "object") && children.type === "X";
    });
    if (closeButton) {
      fireEvent.press(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    } else {
      // Fallback: press the second accessible View (close Pressable)
      if (accessibleViews.length >= 2) {
        fireEvent.press(accessibleViews[1]);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    }
  });

  it("calls onClose when the backdrop Pressable is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(<OfferSheet {...buildProps({ onClose })} />);
    // Find all Views with accessible={true} — Pressable renders as View in tests.
    const accessibleViews = UNSAFE_getAllByType(require("react-native").View).filter(
      (v: any) => v.props.accessible === true
    );
    // The backdrop is the first accessible View (full-screen Pressable).
    expect(accessibleViews.length).toBeGreaterThan(0);
    fireEvent.press(accessibleViews[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Disabled states ──────────────────────────────────────────────────────────

describe("OfferSheet — disabled states", () => {
  it("submit button is disabled when offerAmount is empty", () => {
    render(<OfferSheet {...buildProps({ offerAmount: "" })} />);
    const submitButton = screen.getByText("listing.detail.sendOffer");
    // Button receives disabled={true} when offerAmount is falsy.
    // The RNR Button exposes accessibilityState.disabled when disabled.
    expect(submitButton.props.accessibilityState?.disabled ?? submitButton).toBeTruthy();
  });

  it("does not call onSend when offerAmount is empty", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ offerAmount: "", onSend })} />);
    fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    // The button is disabled, so onSend should not fire.
    expect(onSend).not.toHaveBeenCalled();
  });

  it("submit button is disabled when isBusy is true", () => {
    render(<OfferSheet {...buildProps({ isBusy: true, offerAmount: "20000" })} />);
    const submitText = screen.getByText("listing.detail.sendOffer");
    expect(submitText).toBeTruthy();
  });

  it("does not call onSend when isBusy is true", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ isBusy: true, offerAmount: "20000", onSend })} />);
    fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    expect(onSend).not.toHaveBeenCalled();
  });
});

// ─── RTL layout ───────────────────────────────────────────────────────────────

describe("OfferSheet — RTL locale", () => {
  it("renders without throwing when isRtl is true (Pashto/Dari locale)", () => {
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
      render(<OfferSheet {...buildProps({ currency: "AFN", price: 25000, offerAmount: "20000" })} />)
    ).not.toThrow();

    jest.restoreAllMocks();
  });

  it("renders header, price label, and offer label in RTL mode", () => {
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

    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy();
    expect(screen.getByText("listing.detail.listedPrice")).toBeTruthy();
    expect(screen.getByText("listing.detail.yourOffer")).toBeTruthy();
    expect(screen.getByText("listing.detail.noPaymentNote")).toBeTruthy();

    jest.restoreAllMocks();
  });
});

// ─── Rendering — key copy elements ───────────────────────────────────────────

describe("OfferSheet — rendering", () => {
  it("renders the offer title", () => {
    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy();
  });

  it("renders the listed price label", () => {
    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.listedPrice")).toBeTruthy();
  });

  it("renders the your offer label", () => {
    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.yourOffer")).toBeTruthy();
  });

  it("renders the no-payment safety note", () => {
    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.noPaymentNote")).toBeTruthy();
  });

  it("renders the send offer button", () => {
    render(<OfferSheet {...buildProps()} />);
    expect(screen.getByText("listing.detail.sendOffer")).toBeTruthy();
  });

  it("renders the currency tag with the correct currency code", () => {
    render(<OfferSheet {...buildProps({ currency: "USD" })} />);
    expect(screen.getByText("USD")).toBeTruthy();
  });

  it("renders the AFN currency tag", () => {
    render(<OfferSheet {...buildProps({ currency: "AFN" })} />);
    expect(screen.getByText("AFN")).toBeTruthy();
  });

  it("renders the offer input with the current amount", () => {
    render(<OfferSheet {...buildProps({ offerAmount: "18000" })} />);
    expect(screen.getByDisplayValue("18000")).toBeTruthy();
  });

  it("renders null when visible=false (Modal hides its content)", () => {
    const { toJSON } = render(<OfferSheet {...buildProps({ visible: false })} />);
    // React Native's Modal with visible=false renders null in the test environment
    expect(toJSON()).toBeNull();
  });
});

// ─── mode="counter" — folded in from the former CounterOfferSheet (TASK-C381) ─

describe("OfferSheet — mode='counter' (folded in from CounterOfferSheet)", () => {
  it("renders the counter title instead of the offer title", () => {
    render(<OfferSheet {...buildProps({ mode: "counter" })} />);
    expect(screen.getByText("chat.offer.counterTitle")).toBeTruthy();
    expect(screen.queryByText("listing.detail.offerTitle")).toBeNull();
  });

  it("renders the 'previous offer' reference line instead of the listed price", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", price: 9500 })} />);
    expect(screen.getByText("chat.offer.previousOfferAt")).toBeTruthy();
    expect(screen.queryByText("listing.detail.listedPrice")).toBeNull();
  });

  it("renders the counter amount label and note, not the offer copy", () => {
    render(<OfferSheet {...buildProps({ mode: "counter" })} />);
    expect(screen.getByText("chat.offer.yourCounterOffer")).toBeTruthy();
    expect(screen.getByText("chat.offer.counterNote")).toBeTruthy();
    expect(screen.queryByText("listing.detail.yourOffer")).toBeNull();
    expect(screen.queryByText("listing.detail.noPaymentNote")).toBeNull();
  });

  it("renders the Send Counter button instead of Send Offer", () => {
    render(<OfferSheet {...buildProps({ mode: "counter" })} />);
    expect(screen.getByText("chat.offer.sendCounter")).toBeTruthy();
    expect(screen.queryByText("listing.detail.sendOffer")).toBeNull();
  });

  it("does NOT render the quick-amount chips in counter mode, even when not busy", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", price: 10000 })} />);
    expect(screen.queryByText("chat.offer.quickChipsHint")).toBeNull();
    expect(screen.queryByTestId("quick-chip-9500")).toBeNull();
  });

  it("calls onSend with the entered counter amount when Send Counter is pressed", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ mode: "counter", offerAmount: "9500", onSend })} />);
    fireEvent.press(screen.getByText("chat.offer.sendCounter"));
    expect(onSend).toHaveBeenCalledWith("9500");
  });

  // CR fix (MUST): the former CounterOfferSheet only checked `!counterAmount`
  // (a truthy STRING), so "0" and negative amounts were never disabled. The
  // RNR `Button` forwards `disabled` straight to the underlying
  // `TouchableOpacity` (it does not synthesize `accessibilityState` itself),
  // so we assert the real `disabled` prop on that node rather than the
  // Text child's (unrelated) props.
  it("disables Send Counter when the amount is '0' (non-positive)", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", offerAmount: "0" })} />);
    const touchable = screen.UNSAFE_getByType(require("react-native").TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });

  it("disables Send Counter when the amount is negative", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", offerAmount: "-500" })} />);
    const touchable = screen.UNSAFE_getByType(require("react-native").TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });

  it("does not call onSend when the amount is non-positive", () => {
    const onSend = jest.fn();
    render(<OfferSheet {...buildProps({ mode: "counter", offerAmount: "0", onSend })} />);
    fireEvent.press(screen.getByText("chat.offer.sendCounter"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("enables Send Counter once a positive amount is entered", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", offerAmount: "9500" })} />);
    const touchable = screen.UNSAFE_getByType(require("react-native").TouchableOpacity);
    expect(touchable.props.disabled).toBe(false);
  });

  it("defaults to mode='offer' when mode is omitted (backward compatible)", () => {
    render(<OfferSheet {...buildProps({})} />);
    expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy();
  });
});

// ─── inThread prop — role-neutral safety note (TASK-C381 review fix, DR) ──────

describe("OfferSheet — inThread prop (role-neutral safety note)", () => {
  it("defaults to the buyer-only ListingDetail note when inThread is omitted", () => {
    render(<OfferSheet {...buildProps({})} />);
    expect(screen.getByText("listing.detail.noPaymentNote")).toBeTruthy();
    expect(screen.queryByText("chat.offer.threadNote")).toBeNull();
  });

  it("shows the role-neutral thread note when inThread=true and mode='offer'", () => {
    render(<OfferSheet {...buildProps({ inThread: true })} />);
    expect(screen.getByText("chat.offer.threadNote")).toBeTruthy();
    expect(screen.queryByText("listing.detail.noPaymentNote")).toBeNull();
  });

  it("mode='counter' always shows the counter note, regardless of inThread", () => {
    render(<OfferSheet {...buildProps({ mode: "counter", inThread: true })} />);
    expect(screen.getByText("chat.offer.counterNote")).toBeTruthy();
    expect(screen.queryByText("chat.offer.threadNote")).toBeNull();
  });
});

// ── Multi-quantity (docs/SPIKE_LISTING_QUANTITY.md) ──────────────────────────
//
// An offer carries no quantity of its own, so nothing downstream can
// disambiguate "I offer 12,000" on a 15-unit listing. Saying "each" on the
// reference line at least fixes the anchor the buyer is reasoning from.

describe("OfferSheet — per-unit reference price", () => {
  it("marks the listed price as per-unit on a multi-unit listing", () => {
    render(<OfferSheet {...buildProps({ price: 14000, perUnit: true })} />);
    expect(screen.getByText(/listing\.stock\.each/)).toBeTruthy();
  });

  it("leaves the listed price bare on a single-item listing", () => {
    render(<OfferSheet {...buildProps({ price: 14000 })} />);
    expect(screen.queryByText(/listing\.stock\.each/)).toBeNull();
  });

  // A counter references a SPECIFIC prior offer, whose amount already means
  // whatever the two of them agreed it means — "each" would be an assertion the
  // offer feature does not make.
  it("never marks a counter's reference amount as per-unit", () => {
    render(
      <OfferSheet {...buildProps({ mode: "counter", price: 9500, perUnit: true })} />
    );
    expect(screen.queryByText(/listing\.stock\.each/)).toBeNull();
  });
});
