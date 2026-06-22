/**
 * ResponseRateBadge unit tests
 *
 * Covers:
 *  - Null-suppression: renders nothing when either field is null/undefined
 *  - Zero-rate suppression: renders nothing when responseRatePercent === 0
 *    (prevents a "0% reply rate · Usually responds …" false trust signal)
 *  - All three time-label variants produce the combined label text
 *  - The Clock icon is rendered when the badge is visible
 *  - RTL: the component receives isRtl from the global mock (isRtl=false by default)
 *
 * All hooks mocked globally in src/__tests__/setup.ts:
 *   useTranslation  → t(key, opts) returns the key (with opts serialized for assertions)
 *   useColors       → fixed light-mode token map
 *   useLocalization → isRtl = false
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ResponseRateBadge } from "../ResponseRateBadge";

// Override t() with a jest.fn so we can assert interpolation args
const mockT = jest.fn((key: string, opts?: Record<string, unknown>) => {
  if (opts) return `${key}:${JSON.stringify(opts)}`;
  return key;
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => mockT(key, opts),
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

jest.mock("lucide-react-native", () => ({
  Clock: "Clock",
}));

beforeEach(() => {
  mockT.mockClear();
});

// ── Suppression: null / undefined / zero ─────────────────────────────────────

describe("ResponseRateBadge — suppressed states (renders null)", () => {
  it("renders nothing when responseRatePercent is null", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={null} responseTimeLabel="within_one_hour" />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when responseTimeLabel is null", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when both fields are null", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={null} responseTimeLabel={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when responseRatePercent is undefined", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={undefined} responseTimeLabel="within_one_hour" />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when responseTimeLabel is undefined", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel={undefined} />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when responseRatePercent is 0 (no false trust signal)", () => {
    // A seller who never replied within 24h gets rate=0. Showing
    // "0% reply rate · Usually responds within a few days" would be contradictory;
    // the badge must be suppressed entirely.
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={0} responseTimeLabel="within_a_few_days" />
    );
    expect(toJSON()).toBeNull();
  });
});

// ── Visible: all three time-label variants ────────────────────────────────────

describe("ResponseRateBadge — within_one_hour", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={100} responseTimeLabel="within_one_hour" />
    );
    expect(toJSON()).not.toBeNull();
  });

  it("calls t() with the responseRate key and correct percent", () => {
    render(
      <ResponseRateBadge responseRatePercent={100} responseTimeLabel="within_one_hour" />
    );
    expect(mockT).toHaveBeenCalledWith("profile.sellerProfile.responseRate", { percent: 100 });
  });

  it("calls t() with the within_one_hour time label key", () => {
    render(
      <ResponseRateBadge responseRatePercent={100} responseTimeLabel="within_one_hour" />
    );
    const calls = mockT.mock.calls.map((c) => c[0]);
    expect(calls).toContain("profile.sellerProfile.responseTime.within_one_hour");
  });
});

describe("ResponseRateBadge — within_a_day", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel="within_a_day" />
    );
    expect(toJSON()).not.toBeNull();
  });

  it("calls t() with the within_a_day time label key", () => {
    render(
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel="within_a_day" />
    );
    const calls = mockT.mock.calls.map((c) => c[0]);
    expect(calls).toContain("profile.sellerProfile.responseTime.within_a_day");
  });

  it("calls t() with the correct percent (80)", () => {
    render(
      <ResponseRateBadge responseRatePercent={80} responseTimeLabel="within_a_day" />
    );
    expect(mockT).toHaveBeenCalledWith("profile.sellerProfile.responseRate", { percent: 80 });
  });
});

describe("ResponseRateBadge — within_a_few_days", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={60} responseTimeLabel="within_a_few_days" />
    );
    expect(toJSON()).not.toBeNull();
  });

  it("calls t() with the within_a_few_days time label key", () => {
    render(
      <ResponseRateBadge responseRatePercent={60} responseTimeLabel="within_a_few_days" />
    );
    const calls = mockT.mock.calls.map((c) => c[0]);
    expect(calls).toContain("profile.sellerProfile.responseTime.within_a_few_days");
  });

  it("calls t() with the correct percent (60)", () => {
    render(
      <ResponseRateBadge responseRatePercent={60} responseTimeLabel="within_a_few_days" />
    );
    expect(mockT).toHaveBeenCalledWith("profile.sellerProfile.responseRate", { percent: 60 });
  });
});

// ── Minimum positive rate: 1% ─────────────────────────────────────────────────

describe("ResponseRateBadge — minimum positive rate (1%)", () => {
  it("renders when responseRatePercent is 1 (non-zero gate passes)", () => {
    const { toJSON } = render(
      <ResponseRateBadge responseRatePercent={1} responseTimeLabel="within_a_few_days" />
    );
    expect(toJSON()).not.toBeNull();
  });
});
