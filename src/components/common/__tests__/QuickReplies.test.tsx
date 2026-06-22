/**
 * QuickReplies — Jest unit tests (TASK-Q374)
 *
 * Covers:
 *  1. Renders 5 buyer chips when role="buyer"
 *  2. Renders 5 seller chips when role="seller"
 *  3. Tapping a buyer chip fires onSelect with the localized text
 *  4. Tapping a seller chip fires onSelect with the localized text
 *  5. Renders without throwing when isRtl=true (via useLocalization mock)
 *  6. onSelect is called exactly once per tap
 *  7. Each buyer chip key resolves to its i18n translation key string
 *  8. Each seller chip key resolves to its i18n translation key string
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { QuickReplies } from "../QuickReplies";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background:          "#fff",
    foreground:          "#000",
    card:                "#fff",
    border:              "#e5e7eb",
    muted:               "#f3f4f6",
    mutedForeground:     "#6b7280",
    primary:             "#3b82f6",
    primaryForeground:   "#fff",
    destructive:         "#ef4444",
    destructiveForeground: "#fff",
    secondary:           "#f1f5f9",
    secondaryForeground: "#0f172a",
  }),
}));

// useLocalization is mocked as a jest.fn() so individual tests can override the
// return value (e.g. isRtl=true) via mockReturnValueOnce without needing
// jest.doMock (which cannot re-mock after the module is already imported).
const mockUseLocalization = jest.fn(() => ({
  isRtl: false,
  formatDate: (d: string) => d,
  formatCurrency: (n: number) => String(n),
}));

jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// i18n: t(key) returns the key itself so we can assert on key strings
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

// ── Expected keys ─────────────────────────────────────────────────────────────

const BUYER_KEYS = [
  "chat.quickReplies.buyer.stillAvailable",
  "chat.quickReplies.buyer.lowestPrice",
  "chat.quickReplies.buyer.whereMeet",
  "chat.quickReplies.buyer.morePhotos",
  "chat.quickReplies.buyer.negotiable",
];

const SELLER_KEYS = [
  "chat.quickReplies.seller.yesAvailable",
  "chat.quickReplies.seller.meetAtPlace",
  "chat.quickReplies.seller.priceFirm",
  "chat.quickReplies.seller.whenFree",
  "chat.quickReplies.seller.sendMorePhotos",
];

// ── 1. Buyer chip set ─────────────────────────────────────────────────────────

describe("QuickReplies — buyer role", () => {
  it("renders 5 buyer chips", () => {
    render(<QuickReplies role="buyer" onSelect={jest.fn()} />);
    for (const key of BUYER_KEYS) {
      expect(screen.getByText(key)).toBeTruthy();
    }
  });

  it("does not render seller chips when role='buyer'", () => {
    render(<QuickReplies role="buyer" onSelect={jest.fn()} />);
    for (const key of SELLER_KEYS) {
      expect(screen.queryByText(key)).toBeNull();
    }
  });
});

// ── 2. Seller chip set ────────────────────────────────────────────────────────

describe("QuickReplies — seller role", () => {
  it("renders 5 seller chips", () => {
    render(<QuickReplies role="seller" onSelect={jest.fn()} />);
    for (const key of SELLER_KEYS) {
      expect(screen.getByText(key)).toBeTruthy();
    }
  });

  it("does not render buyer chips when role='seller'", () => {
    render(<QuickReplies role="seller" onSelect={jest.fn()} />);
    for (const key of BUYER_KEYS) {
      expect(screen.queryByText(key)).toBeNull();
    }
  });
});

// ── 3. onSelect callback — buyer ──────────────────────────────────────────────

describe("QuickReplies — tapping a buyer chip", () => {
  it("calls onSelect with the localized text for stillAvailable", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.stillAvailable"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.buyer.stillAvailable");
  });

  it("calls onSelect with the localized text for lowestPrice", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.lowestPrice"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.buyer.lowestPrice");
  });

  it("calls onSelect with the localized text for whereMeet", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.whereMeet"));
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.buyer.whereMeet");
  });

  it("calls onSelect with the localized text for morePhotos", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.morePhotos"));
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.buyer.morePhotos");
  });

  it("calls onSelect with the localized text for negotiable", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.negotiable"));
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.buyer.negotiable");
  });
});

// ── 4. onSelect callback — seller ─────────────────────────────────────────────

describe("QuickReplies — tapping a seller chip", () => {
  it("calls onSelect with the localized text for yesAvailable", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="seller" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.seller.yesAvailable"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.seller.yesAvailable");
  });

  it("calls onSelect with the localized text for priceFirm", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="seller" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.seller.priceFirm"));
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.seller.priceFirm");
  });

  it("calls onSelect with the localized text for sendMorePhotos", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="seller" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.seller.sendMorePhotos"));
    expect(onSelect).toHaveBeenCalledWith("chat.quickReplies.seller.sendMorePhotos");
  });
});

// ── 5. RTL rendering ──────────────────────────────────────────────────────────

describe("QuickReplies — RTL", () => {
  afterEach(() => {
    // Reset to the default LTR return value after each test so other suites
    // are not affected by the RTL override.
    mockUseLocalization.mockReturnValue({
      isRtl: false,
      formatDate: (d: string) => d,
      formatCurrency: (n: number) => String(n),
    });
  });

  it("renders without throwing when isRtl=true", () => {
    // Override the mock to return RTL=true for this single render.
    mockUseLocalization.mockReturnValueOnce({
      isRtl: true,
      formatDate: (d: string) => d,
      formatCurrency: (n: number) => String(n),
    });
    expect(() =>
      render(<QuickReplies role="buyer" onSelect={jest.fn()} />)
    ).not.toThrow();
  });

  it("renders the same buyer chips in RTL mode", () => {
    mockUseLocalization.mockReturnValueOnce({
      isRtl: true,
      formatDate: (d: string) => d,
      formatCurrency: (n: number) => String(n),
    });
    render(<QuickReplies role="buyer" onSelect={jest.fn()} />);
    for (const key of BUYER_KEYS) {
      expect(screen.getByText(key)).toBeTruthy();
    }
  });
});

// ── 6. onSelect called exactly once per tap ────────────────────────────────────

describe("QuickReplies — single call per tap", () => {
  it("fires onSelect exactly once when a chip is tapped", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.stillAvailable"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("fires onSelect separately for each distinct chip tap", () => {
    const onSelect = jest.fn();
    render(<QuickReplies role="buyer" onSelect={onSelect} />);
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.stillAvailable"));
    fireEvent.press(screen.getByText("chat.quickReplies.buyer.lowestPrice"));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, "chat.quickReplies.buyer.stillAvailable");
    expect(onSelect).toHaveBeenNthCalledWith(2, "chat.quickReplies.buyer.lowestPrice");
  });
});

// ── 7 & 8. Smoke tests — renders without throwing ────────────────────────────

describe("QuickReplies — smoke tests", () => {
  it("renders buyer role without throwing", () => {
    expect(() =>
      render(<QuickReplies role="buyer" onSelect={jest.fn()} />)
    ).not.toThrow();
  });

  it("renders seller role without throwing", () => {
    expect(() =>
      render(<QuickReplies role="seller" onSelect={jest.fn()} />)
    ).not.toThrow();
  });
});
