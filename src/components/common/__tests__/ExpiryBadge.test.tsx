/**
 * ExpiryBadge unit tests
 *
 * Covers all 9 pure day-bucketing branches of ExpiryBadge.tsx plus:
 *  - backgroundColor assertions to distinguish warning-vs-muted pills
 *    (fixes false-coverage: both branches emitted the same translation key)
 *  - day-count interpolation assertion (count arg passed to t())
 *
 * All hooks are mocked globally in src/__tests__/setup.ts:
 *   useTranslation  → t(key) returns the key  (overridden below with jest.fn)
 *   useColors       → fixed light-mode token map
 *   useLocalization → formatNumber(n) returns String(n), isRtl = false
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";

// ── Override react-i18next with a jest.fn() t so we can assert call args ──────
// This file-level jest.mock overrides the global setup.ts mock only in this
// file. The mockT function still returns the key (locale-independent) but
// records every call so tests can verify the { count } interpolation arg.
const mockT = jest.fn((key: string) => key);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => mockT(key, opts),
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

import { ExpiryBadge } from "../ExpiryBadge";

// ── Colors from the global useColors mock (src/__tests__/setup.ts) ────────────
// These must stay in sync with the mock values in setup.ts.
const WARNING_ALPHA = "rgba(180,83,9,0.10)";
const MUTED = "hsl(210,40%,96%)";
const DESTRUCTIVE_ALPHA = "rgba(220,38,38,0.08)";

// ── Fix wall-clock so day math is deterministic ───────────────────────────────
// "now" = 2025-01-10T00:00:00.000Z
const NOW = new Date("2025-01-10T00:00:00.000Z").getTime();

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  mockT.mockClear();
});

// Helper: build an ISO string that is `days` calendar days after NOW.
function daysFromNow(days: number): string {
  return new Date(NOW + days * 86_400_000).toISOString();
}

// Helper: read the backgroundColor from the pill View.
//
// The pill wrapper is a <View accessibilityRole="text" style={{ backgroundColor, ... }}>.
// RNTL's getByRole("text") resolves to the inner <Text> node (the label), NOT the
// outer View. We use UNSAFE_getAllByType(View) to find the View with
// accessibilityRole="text" and read its inline backgroundColor.
function getPillBackgroundColor(): string {
  // renderResult is provided by individual tests via closure — each test
  // must call this helper inside its own render scope.
  // We query all Views in the currently rendered tree.
  const views = screen.UNSAFE_getAllByType(View);
  const pillView = views.find(
    (v) => v.props.accessibilityRole === "text"
  );
  if (!pillView) {
    throw new Error(
      "No View with accessibilityRole='text' found — is the pill rendered?"
    );
  }
  const style = pillView.props.style as
    | Record<string, unknown>
    | Array<Record<string, unknown>>;
  const styleObj: Record<string, unknown> = Array.isArray(style)
    ? Object.assign({}, ...(style as object[]).flat())
    : style;
  return styleObj.backgroundColor as string;
}

// ─── Branch 1: non-active statuses render nothing ────────────────────────────

describe("ExpiryBadge — non-active statuses", () => {
  const nonActiveStatuses = ["draft", "reserved", "sold"] as const;

  it.each(nonActiveStatuses)(
    "renders nothing for status=%s",
    (status) => {
      const { toJSON } = render(
        <ExpiryBadge status={status} expiresAt={daysFromNow(5)} />
      );
      expect(toJSON()).toBeNull();
    }
  );
});

// ─── Branch 2: expired=true → destructive pill ───────────────────────────────

describe("ExpiryBadge — expired flag", () => {
  it("renders the destructive expiredBadge pill when expired=true (no expiresAt)", () => {
    render(<ExpiryBadge status="active" expired={true} />);
    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(DESTRUCTIVE_ALPHA);
  });

  it("renders the destructive expiredBadge pill when expired=true even with a future expiresAt", () => {
    render(
      <ExpiryBadge status="active" expired={true} expiresAt={daysFromNow(10)} />
    );
    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(DESTRUCTIVE_ALPHA);
  });
});

// ─── Branch 3: no expiresAt and not expired → renders nothing ────────────────

describe("ExpiryBadge — missing expiresAt", () => {
  it("renders nothing when expiresAt is undefined and expired is falsy", () => {
    const { toJSON } = render(<ExpiryBadge status="active" />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when expiresAt is null and expired is falsy", () => {
    const { toJSON } = render(<ExpiryBadge status="active" expiresAt={null} />);
    expect(toJSON()).toBeNull();
  });
});

// ─── Branch 4: expiresAt in the past (days <= 0) → destructive pill ──────────

describe("ExpiryBadge — expiresAt in the past", () => {
  it("renders expiredBadge with destructive background when expiresAt is exactly now (0 days remaining)", () => {
    render(<ExpiryBadge status="active" expiresAt={new Date(NOW).toISOString()} />);
    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(DESTRUCTIVE_ALPHA);
  });

  it("renders expiredBadge with destructive background when expiresAt is 1 day in the past", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(-1)} />);
    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(DESTRUCTIVE_ALPHA);
  });

  it("renders expiredBadge with destructive background when expiresAt is 10 days in the past", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(-10)} />);
    expect(screen.getByText("listing.expiredBadge")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(DESTRUCTIVE_ALPHA);
  });
});

// ─── Branch 5: exactly 1 day remaining → warning expiresTomorrow pill ─────────

describe("ExpiryBadge — 1 day remaining", () => {
  it("renders expiresTomorrow with warning background when exactly 0.5 days remain (ceil → 1)", () => {
    // 0.5 day = 12 h ahead; Math.ceil(0.5) = 1 → expiresTomorrow branch
    const halfDay = new Date(NOW + 0.5 * 86_400_000).toISOString();
    render(<ExpiryBadge status="active" expiresAt={halfDay} />);
    expect(screen.getByText("listing.expiresTomorrow")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(WARNING_ALPHA);
  });

  it("renders expiresTomorrow with warning background when expiresAt is exactly 1 day ahead", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(1)} />);
    expect(screen.getByText("listing.expiresTomorrow")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(WARNING_ALPHA);
  });
});

// ─── Branch 6: 2-3 days remaining (within default expiringSoonDays=3) → WARNING pill ───
//
// Fix: the previous test only asserted on the translation key, which is the same
// as the muted branch. We now also assert backgroundColor = WARNING_ALPHA to prove
// the warning branch fired, not the muted branch.

describe("ExpiryBadge — expiring soon (within default 3-day window)", () => {
  it("renders warning expiresInDays pill (warningAlpha bg) when 2 days remain", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(2)} />);
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    // Warning branch uses warningAlpha — NOT muted
    expect(getPillBackgroundColor()).toBe(WARNING_ALPHA);
  });

  it("renders warning expiresInDays pill (warningAlpha bg) when exactly expiringSoonDays (3) days remain", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(3)} />);
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(WARNING_ALPHA);
  });

  it("passes the correct day count to t() for the 2-day warning case", () => {
    // formatNumber(2) = "2" per useLocalization mock
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(2)} />);
    // Verify t was called with the interpolation object { count: "2" }
    expect(mockT).toHaveBeenCalledWith("listing.expiresInDays", { count: "2" });
  });

  it("passes the correct day count to t() for the 3-day warning case", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(3)} />);
    expect(mockT).toHaveBeenCalledWith("listing.expiresInDays", { count: "3" });
  });
});

// ─── Branch 7: days beyond expiringSoonDays → MUTED pill ─────────────────────
//
// Fix: previously indistinguishable from branch 6 because both emitted
// "listing.expiresInDays". Now we assert backgroundColor = MUTED.

describe("ExpiryBadge — beyond expiringSoonDays window (muted pill)", () => {
  it("renders muted expiresInDays pill (muted bg) when 4 days remain (default threshold=3)", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(4)} />);
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    // Muted branch uses muted — NOT warningAlpha
    expect(getPillBackgroundColor()).toBe(MUTED);
    // Must NOT be the warning color
    expect(getPillBackgroundColor()).not.toBe(WARNING_ALPHA);
  });

  it("renders muted expiresInDays pill (muted bg) when 30 days remain", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(30)} />);
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(MUTED);
  });

  it("passes the correct day count to t() for the 4-day muted case", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(4)} />);
    expect(mockT).toHaveBeenCalledWith("listing.expiresInDays", { count: "4" });
  });

  it("passes the correct day count to t() for the 30-day muted case", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(30)} />);
    expect(mockT).toHaveBeenCalledWith("listing.expiresInDays", { count: "30" });
  });
});

// ─── Branch 8: custom expiringSoonDays shifts the warning threshold ───────────

describe("ExpiryBadge — custom expiringSoonDays threshold", () => {
  it("renders warning pill (warningAlpha bg) at 7 days when expiringSoonDays=7", () => {
    render(
      <ExpiryBadge
        status="active"
        expiresAt={daysFromNow(7)}
        expiringSoonDays={7}
      />
    );
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(WARNING_ALPHA);
  });

  it("renders muted pill (muted bg) at 8 days when expiringSoonDays=7", () => {
    render(
      <ExpiryBadge
        status="active"
        expiresAt={daysFromNow(8)}
        expiringSoonDays={7}
      />
    );
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(MUTED);
  });

  it("passes count='7' to t() for the 7-day warning (expiringSoonDays=7) case", () => {
    render(
      <ExpiryBadge
        status="active"
        expiresAt={daysFromNow(7)}
        expiringSoonDays={7}
      />
    );
    expect(mockT).toHaveBeenCalledWith("listing.expiresInDays", { count: "7" });
  });

  it("renders muted (not warning) pill at 2 days when expiringSoonDays=1 (2 > threshold)", () => {
    // expiringSoonDays=1: only days===1 would enter the soon-warning bucket,
    // but days===1 is caught earlier by expiresTomorrow. So days=2 falls to muted.
    render(
      <ExpiryBadge
        status="active"
        expiresAt={daysFromNow(2)}
        expiringSoonDays={1}
      />
    );
    expect(screen.getByText("listing.expiresInDays")).toBeTruthy();
    expect(getPillBackgroundColor()).toBe(MUTED);
    expect(getPillBackgroundColor()).not.toBe(WARNING_ALPHA);
  });
});

// ─── Branch 9: unparseable expiresAt (NaN) → renders nothing ─────────────────

describe("ExpiryBadge — unparseable expiresAt", () => {
  it("renders nothing when expiresAt is not a valid date string", () => {
    const { toJSON } = render(
      <ExpiryBadge status="active" expiresAt="not-a-date" />
    );
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when expiresAt is an empty string", () => {
    const { toJSON } = render(
      <ExpiryBadge status="active" expiresAt="" />
    );
    expect(toJSON()).toBeNull();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe("ExpiryBadge — accessibility", () => {
  it("has accessibilityRole text on the pill View when rendered", () => {
    render(<ExpiryBadge status="active" expiresAt={daysFromNow(5)} />);
    // The pill View has accessibilityRole="text" — verify via UNSAFE_getAllByType
    const views = screen.UNSAFE_getAllByType(View);
    const pillView = views.find((v) => v.props.accessibilityRole === "text");
    expect(pillView).toBeTruthy();
  });
});
