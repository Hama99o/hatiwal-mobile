/**
 * LanguageSwitcher unit tests
 *
 * The component renders one Pressable per SUPPORTED_LANGUAGES entry (en/ps/fa).
 * The active language gets colors.primary background + primaryForeground bold text.
 * Pressing a language button calls setLanguage from @/i18n with the correct code.
 *
 * react-i18next is re-mocked here (overriding the global setup.ts mock) using a
 * module-level `activeLang` variable so tests can control which language is active
 * without needing jest.fn().mockReturnValue().
 *
 * useColors is mocked globally in src/__tests__/setup.ts.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mutable state for active language ────────────────────────────────────────
// jest.mock factories are hoisted — the variable must live outside the factory
// but be readable inside it via closure.  We use a plain object so mutation
// works across beforeEach calls.

const langState = { current: "en" };

// ── Mock react-i18next (overrides global setup.ts mock for this file) ─────────
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: langState.current, changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

// ── Mock @/i18n ──────────────────────────────────────────────────────────────
const mockSetLanguage = jest.fn();

jest.mock("@/i18n", () => ({
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English" },
    { code: "ps", label: "پښتو" },
    { code: "fa", label: "دری" },
  ],
  setLanguage: (...args: unknown[]) => mockSetLanguage(...args),
}));

// Import after mocks are set up
import LanguageSwitcher from "../LanguageSwitcher";

beforeEach(() => {
  mockSetLanguage.mockClear();
  langState.current = "en";
});

// ── 1. All three language labels render ──────────────────────────────────────

describe("LanguageSwitcher — language labels", () => {
  it("renders the English label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("English")).toBeTruthy();
  });

  it("renders the Pashto label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("پښتو")).toBeTruthy();
  });

  it("renders the Dari label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("دری")).toBeTruthy();
  });

  it("renders all three labels in a single render", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.getByText("پښتو")).toBeTruthy();
    expect(screen.getByText("دری")).toBeTruthy();
  });
});

// ── 2. Pressing a button calls setLanguage with the correct LanguageCode ─────

describe("LanguageSwitcher — setLanguage callbacks", () => {
  it("calls setLanguage('en') when pressing the English button", () => {
    render(<LanguageSwitcher />);
    fireEvent.press(screen.getByText("English"));
    expect(mockSetLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetLanguage).toHaveBeenCalledWith("en");
  });

  it("calls setLanguage('ps') when pressing the Pashto button", () => {
    render(<LanguageSwitcher />);
    fireEvent.press(screen.getByText("پښتو"));
    expect(mockSetLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetLanguage).toHaveBeenCalledWith("ps");
  });

  it("calls setLanguage('fa') when pressing the Dari button", () => {
    render(<LanguageSwitcher />);
    fireEvent.press(screen.getByText("دری"));
    expect(mockSetLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetLanguage).toHaveBeenCalledWith("fa");
  });

  it("calls setLanguage exactly once per press", () => {
    render(<LanguageSwitcher />);
    fireEvent.press(screen.getByText("English"));
    fireEvent.press(screen.getByText("English"));
    expect(mockSetLanguage).toHaveBeenCalledTimes(2);
  });

  it("does not call setLanguage on render — only on press", () => {
    render(<LanguageSwitcher />);
    expect(mockSetLanguage).not.toHaveBeenCalled();
  });

  it("pressing different buttons each calls setLanguage with their own code", () => {
    render(<LanguageSwitcher />);
    fireEvent.press(screen.getByText("English"));
    fireEvent.press(screen.getByText("پښتو"));
    fireEvent.press(screen.getByText("دری"));
    expect(mockSetLanguage).toHaveBeenNthCalledWith(1, "en");
    expect(mockSetLanguage).toHaveBeenNthCalledWith(2, "ps");
    expect(mockSetLanguage).toHaveBeenNthCalledWith(3, "fa");
  });
});

// ── 3. Active language styling ───────────────────────────────────────────────
//
// The active Pressable gets:
//   backgroundColor: colors.primary    ("hsl(221,83%,53%)" in the test mock)
//   borderColor:     colors.primary
// The active Text gets:
//   fontWeight: "700"
//   color:      colors.primaryForeground  ("hsl(0,0%,100%)")
//
// We use UNSAFE_getAllByType to inspect the Text nodes and read their
// inline style props.

describe("LanguageSwitcher — active language uses active style", () => {
  it("renders the active (English) text with fontWeight 700 when lang=en", () => {
    langState.current = "en";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const englishText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "English"
    );
    expect(englishText).toBeTruthy();
    const style = englishText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    expect(styleObj.fontWeight).toBe("700");
  });

  it("renders the inactive (Pashto) text with fontWeight 400 when lang=en", () => {
    langState.current = "en";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const pashtoText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "پښتو"
    );
    expect(pashtoText).toBeTruthy();
    const style = pashtoText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    expect(styleObj.fontWeight).toBe("400");
  });

  it("renders the active (Pashto) text with fontWeight 700 when lang=ps", () => {
    langState.current = "ps";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const pashtoText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "پښتو"
    );
    expect(pashtoText).toBeTruthy();
    const style = pashtoText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    expect(styleObj.fontWeight).toBe("700");
  });

  it("renders the inactive (English) text with fontWeight 400 when lang=ps", () => {
    langState.current = "ps";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const englishText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "English"
    );
    expect(englishText).toBeTruthy();
    const style = englishText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    expect(styleObj.fontWeight).toBe("400");
  });

  it("renders the active (Dari) text with fontWeight 700 when lang=fa", () => {
    langState.current = "fa";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const dariText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "دری"
    );
    expect(dariText).toBeTruthy();
    const style = dariText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    expect(styleObj.fontWeight).toBe("700");
  });

  it("renders active text color as primaryForeground when lang=en", () => {
    langState.current = "en";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const englishText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "English"
    );
    expect(englishText).toBeTruthy();
    const style = englishText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    // primaryForeground from useColors mock = "hsl(0,0%,100%)"
    expect(styleObj.color).toBe("hsl(0,0%,100%)");
  });

  it("renders inactive text color as foreground when lang=en (Pashto is inactive)", () => {
    langState.current = "en";
    const { UNSAFE_getAllByType } = render(<LanguageSwitcher />);
    const { Text: RNText } = require("react-native");
    const textNodes = UNSAFE_getAllByType(RNText);

    const pashtoText = textNodes.find(
      (node: { props: { children: unknown } }) => node.props.children === "پښتو"
    );
    expect(pashtoText).toBeTruthy();
    const style = pashtoText.props.style;
    const styleObj = Array.isArray(style)
      ? Object.assign({}, ...(style as object[]).flat())
      : style;
    // foreground from useColors mock = "hsl(222,47%,11%)"
    expect(styleObj.color).toBe("hsl(222,47%,11%)");
  });
});

// ── 4. Smoke tests ────────────────────────────────────────────────────────────

describe("LanguageSwitcher — smoke tests", () => {
  it("renders without throwing when lang=en", () => {
    langState.current = "en";
    expect(() => render(<LanguageSwitcher />)).not.toThrow();
  });

  it("renders without throwing when lang=ps", () => {
    langState.current = "ps";
    expect(() => render(<LanguageSwitcher />)).not.toThrow();
  });

  it("renders without throwing when lang=fa", () => {
    langState.current = "fa";
    expect(() => render(<LanguageSwitcher />)).not.toThrow();
  });
});
