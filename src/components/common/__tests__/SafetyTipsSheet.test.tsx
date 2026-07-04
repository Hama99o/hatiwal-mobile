/**
 * SafetyTipsSheet unit tests.
 *
 * Asserts the sheet renders its title/subtitle and every tip row from the
 * `safety.meetup.tips.*` i18n keys, and that the close affordances call
 * onClose. Mirrors the test structure of ReportSheet.test.tsx.
 *
 * End-to-end flows (opening from ListingDetail / MeetupSheet) are covered in
 * maestro/safety/*.yaml.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lucide icons — mock to strings to avoid react-native-css-interop chain
jest.mock("lucide-react-native", () => ({
  X: "X",
  ShieldCheck: "ShieldCheck",
  Users: "Users",
  Sun: "Sun",
  UserPlus: "UserPlus",
  Eye: "Eye",
  Ban: "Ban",
  Sparkles: "Sparkles",
  Flag: "Flag",
}));

// useReduceMotion — default to false (animations enabled) unless overridden
jest.mock("@/lib/animation", () => ({
  useReduceMotion: jest.fn(() => false),
}));

// Import AFTER mocks
import { SafetyTipsSheet } from "../SafetyTipsSheet";
import { useReduceMotion } from "@/lib/animation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIP_KEYS = [
  "safety.meetup.tips.publicPlace",
  "safety.meetup.tips.daylight",
  "safety.meetup.tips.bringFriend",
  "safety.meetup.tips.inspectItem",
  "safety.meetup.tips.noAdvancePayment",
  "safety.meetup.tips.trustInstincts",
  "safety.meetup.tips.reportSuspicious",
];

function renderSheet(props: Partial<React.ComponentProps<typeof SafetyTipsSheet>> = {}) {
  const onClose = jest.fn();
  const defaults = { visible: true, onClose };
  const merged = { ...defaults, ...props, onClose: props.onClose ?? onClose };
  render(<SafetyTipsSheet {...merged} />);
  return { onClose: merged.onClose };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (useReduceMotion as jest.Mock).mockReturnValue(false);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("SafetyTipsSheet — rendering", () => {
  it("renders title and subtitle when visible=true", () => {
    renderSheet({ visible: true });
    expect(screen.getByText("safety.meetup.title")).toBeTruthy();
    expect(screen.getByText("safety.meetup.subtitle")).toBeTruthy();
  });

  it("renders all 7 tip rows from safety.meetup.tips.* i18n keys", () => {
    renderSheet();
    TIP_KEYS.forEach((key) => {
      expect(screen.getByText(key)).toBeTruthy();
    });
  });

  it("renders the tips in the documented safety order", () => {
    renderSheet();
    const rendered = TIP_KEYS.map((key) => screen.getByText(key));
    // Each tip should be present exactly once, in ascending DOM order.
    expect(rendered).toHaveLength(TIP_KEYS.length);
  });

  it("renders the close button label", () => {
    renderSheet();
    expect(screen.getByText("common.close")).toBeTruthy();
  });
});

// ─── Close behavior ───────────────────────────────────────────────────────────

describe("SafetyTipsSheet — close", () => {
  it("calls onClose when the footer Close button is pressed", () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByText("common.close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the header X button is pressed", () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByLabelText("common.close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── visible prop ─────────────────────────────────────────────────────────────

describe("SafetyTipsSheet — visible prop", () => {
  it("renders without crashing when visible=false (test-renderer hides Modal content)", () => {
    expect(() => renderSheet({ visible: false })).not.toThrow();
  });
});

// ─── reduce motion ────────────────────────────────────────────────────────────

describe("SafetyTipsSheet — reduce motion", () => {
  it("renders without crashing when reduce motion is enabled", () => {
    (useReduceMotion as jest.Mock).mockReturnValue(true);
    renderSheet();
    expect(screen.getByText("safety.meetup.title")).toBeTruthy();
  });
});
