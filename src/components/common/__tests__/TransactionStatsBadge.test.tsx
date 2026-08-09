/**
 * TransactionStatsBadge unit tests
 *
 * Covers:
 *  - Null-suppression: renders nothing when both soldCount and boughtCount
 *    are 0/null/undefined
 *  - Partial display: shows only the non-zero half (no dangling "0 sold"/
 *    "0 bought")
 *  - Combined display: "N sold · N bought" when both are non-zero
 *  - Numbers are passed through useLocalization().formatNumber
 *  - The Handshake icon is rendered when the badge is visible
 *  - TASK-TX02 review fix (MED): `count` stays the raw NUMBER (i18next's
 *    reserved plural-selection key — passing a formatted string breaks
 *    pluralization the moment a translator adds _one/_other variants); the
 *    locale-formatted string for display goes through the separate `value`
 *    key instead.
 *  - RTL: row direction flips via useLocalization().isRtl
 *
 * All hooks mocked globally in src/__tests__/setup.ts:
 *   useTranslation  → t(key, opts) returns the key (with opts serialized for assertions)
 *   useColors       → fixed light-mode token map
 *   useLocalization → isRtl = false (overridable per-test via mockUseLocalization)
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { TransactionStatsBadge } from "../TransactionStatsBadge";

const mockT = jest.fn((key: string, opts?: Record<string, unknown>) => {
  if (opts) return `${key}:${JSON.stringify(opts)}`;
  return key;
});

const mockFormatNumber = jest.fn((value: number) => String(value));

const mockUseLocalization = jest.fn(() => ({
  isRtl: false,
  formatNumber: (value: number) => mockFormatNumber(value),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => mockT(key, opts),
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => mockUseLocalization(),
}));

jest.mock("lucide-react-native", () => ({
  Handshake: "Handshake",
}));

beforeEach(() => {
  mockT.mockClear();
  mockFormatNumber.mockClear();
  mockUseLocalization.mockClear();
  mockUseLocalization.mockImplementation(() => ({
    isRtl: false,
    formatNumber: (value: number) => mockFormatNumber(value),
  }));
});

// ── Suppression: both zero / null / undefined ────────────────────────────────

describe("TransactionStatsBadge — suppressed states (renders null)", () => {
  it("renders nothing when both counts are 0", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={0} boughtCount={0} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when both counts are null", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={null} boughtCount={null} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when both counts are undefined", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={undefined} boughtCount={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when soldCount is 0 and boughtCount is null", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={0} boughtCount={null} />);
    expect(toJSON()).toBeNull();
  });
});

// ── Partial display: only the non-zero half ───────────────────────────────────

describe("TransactionStatsBadge — partial display", () => {
  it("renders only the sold part when boughtCount is 0", () => {
    render(<TransactionStatsBadge soldCount={5} boughtCount={0} />);
    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.sold", { count: 5, value: "5" });
    expect(mockT).not.toHaveBeenCalledWith(
      "profile.transactionStats.bought",
      expect.anything()
    );
  });

  it("renders only the bought part when soldCount is 0", () => {
    render(<TransactionStatsBadge soldCount={0} boughtCount={3} />);
    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.bought", { count: 3, value: "3" });
    expect(mockT).not.toHaveBeenCalledWith("profile.transactionStats.sold", expect.anything());
  });

  it("renders without crashing when only soldCount is present", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={5} boughtCount={0} />);
    expect(toJSON()).not.toBeNull();
  });
});

// ── Combined display: both non-zero ───────────────────────────────────────────

describe("TransactionStatsBadge — combined display", () => {
  it("renders both parts when sold and bought are both non-zero", () => {
    render(<TransactionStatsBadge soldCount={5} boughtCount={2} />);
    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.sold", { count: 5, value: "5" });
    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.bought", { count: 2, value: "2" });
  });

  it("formats each count via useLocalization().formatNumber", () => {
    render(<TransactionStatsBadge soldCount={1000} boughtCount={2000} />);
    expect(mockFormatNumber).toHaveBeenCalledWith(1000);
    expect(mockFormatNumber).toHaveBeenCalledWith(2000);
  });

  it("renders without crashing", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={5} boughtCount={2} />);
    expect(toJSON()).not.toBeNull();
  });
});

// ── Minimum positive count: 1 ──────────────────────────────────────────────────

describe("TransactionStatsBadge — minimum positive count (1)", () => {
  it("renders when soldCount is 1 (non-zero gate passes)", () => {
    const { toJSON } = render(<TransactionStatsBadge soldCount={1} boughtCount={0} />);
    expect(toJSON()).not.toBeNull();
  });
});

// ── TASK-TX02 review fix (MED) — count stays numeric, value carries display ────

describe("TransactionStatsBadge — count/value split (i18next plural-key regression)", () => {
  it("passes the raw NUMBER (not the formatted string) as the reserved `count` key", () => {
    render(<TransactionStatsBadge soldCount={1234} boughtCount={0} />);

    const call = mockT.mock.calls.find(([key]) => key === "profile.transactionStats.sold");
    expect(call).toBeDefined();
    const opts = call?.[1] as { count: unknown; value: unknown };
    expect(opts.count).toBe(1234);
    expect(typeof opts.count).toBe("number");
  });

  it("passes the locale-formatted string separately as `value`", () => {
    mockFormatNumber.mockImplementation((value: number) => `formatted-${value}`);

    render(<TransactionStatsBadge soldCount={1234} boughtCount={7} />);

    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.sold", {
      count: 1234,
      value: "formatted-1234",
    });
    expect(mockT).toHaveBeenCalledWith("profile.transactionStats.bought", {
      count: 7,
      value: "formatted-7",
    });
  });
});

// ── RTL ────────────────────────────────────────────────────────────────────────

describe("TransactionStatsBadge — RTL", () => {
  it("flips row direction to row-reverse when isRtl is true", () => {
    mockUseLocalization.mockImplementation(() => ({
      isRtl: true,
      formatNumber: (value: number) => mockFormatNumber(value),
    }));

    const { UNSAFE_getByType } = render(
      <TransactionStatsBadge soldCount={5} boughtCount={0} />
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require("react-native");
    const wrapper = UNSAFE_getByType(View);
    expect(wrapper.props.style.flexDirection).toBe("row-reverse");
  });

  it("uses row (not row-reverse) when isRtl is false", () => {
    const { UNSAFE_getByType } = render(
      <TransactionStatsBadge soldCount={5} boughtCount={0} />
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View } = require("react-native");
    const wrapper = UNSAFE_getByType(View);
    expect(wrapper.props.style.flexDirection).toBe("row");
  });
});
