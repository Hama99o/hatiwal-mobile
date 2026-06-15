/**
 * ReportSheet unit tests.
 *
 * Tests rendering, reason selection, and form validation.
 * The API integration is covered in src/api/__tests__/reports.test.ts
 * (all 6 reasons, snake_case serialization, 422 self-report / duplicate).
 *
 * End-to-end submit flows are covered in maestro/report/*.yaml.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lucide icons — mock to strings to avoid react-native-css-interop chain
jest.mock("lucide-react-native", () => ({
  X: "X",
  Flag: "Flag",
}));

// Suppress sonner-native so toast calls don't throw in the test environment
jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Import AFTER mocks
import { ReportSheet } from "../ReportSheet";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSheet(props: Partial<React.ComponentProps<typeof ReportSheet>> = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onClose = jest.fn();
  const defaults = {
    visible: true,
    onClose,
    reportableType: "Listing" as const,
    reportableId: 10,
  };
  const merged = { ...defaults, ...props, onClose: props.onClose ?? onClose };
  render(
    <QueryClientProvider client={qc}>
      <ReportSheet {...merged} />
    </QueryClientProvider>
  );
  return { onClose: merged.onClose };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ReportSheet — rendering", () => {
  it("renders title and subtitle when visible=true", () => {
    renderSheet({ visible: true });
    expect(screen.getByText("report.title")).toBeTruthy();
    expect(screen.getByText("report.subtitle")).toBeTruthy();
  });

  it("renders all 6 reason options", () => {
    renderSheet();
    [
      "report.reasons.spam",
      "report.reasons.inappropriate",
      "report.reasons.fraud",
      "report.reasons.wrong_category",
      "report.reasons.prohibited_item",
      "report.reasons.other",
    ].forEach((key) => {
      expect(screen.getByText(key)).toBeTruthy();
    });
  });

  it("renders the reason label", () => {
    renderSheet();
    expect(screen.getByText("report.reasonLabel")).toBeTruthy();
  });

  it("renders the optional note label and textarea", () => {
    renderSheet();
    expect(screen.getByText("report.noteLabel")).toBeTruthy();
    expect(screen.getByPlaceholderText("report.notePlaceholder")).toBeTruthy();
  });

  it("renders submit and cancel buttons", () => {
    renderSheet();
    expect(screen.getByText("report.submit")).toBeTruthy();
    expect(screen.getByText("common.cancel")).toBeTruthy();
  });
});

describe("ReportSheet — reason selection", () => {
  it("allows selecting a reason — no error shown after selection", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.reasons.fraud"));
    // After selection the reasonRequired error must NOT be present
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });

  it("can switch between reasons", () => {
    renderSheet();
    // Select spam first
    fireEvent.press(screen.getByText("report.reasons.spam"));
    // Then switch to inappropriate — should not error
    fireEvent.press(screen.getByText("report.reasons.inappropriate"));
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });
});

describe("ReportSheet — validation", () => {
  it("shows reasonRequired error when submit pressed with no reason", () => {
    renderSheet();
    fireEvent.press(screen.getByText("report.submit"));
    expect(screen.getByText("report.reasonRequired")).toBeTruthy();
  });

  it("clears reasonRequired error after a reason is selected", () => {
    renderSheet();
    // Trigger error
    fireEvent.press(screen.getByText("report.submit"));
    expect(screen.getByText("report.reasonRequired")).toBeTruthy();
    // Select a reason
    fireEvent.press(screen.getByText("report.reasons.other"));
    // Error should be gone
    expect(screen.queryByText("report.reasonRequired")).toBeNull();
  });
});

describe("ReportSheet — note textarea", () => {
  it("accepts text input in the note field", () => {
    renderSheet();
    const noteInput = screen.getByPlaceholderText("report.notePlaceholder");
    fireEvent.changeText(noteInput, "This is my description");
    expect(noteInput.props.value).toBe("This is my description");
  });
});

describe("ReportSheet — close", () => {
  it("calls onClose when Cancel button is pressed", () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByText("common.cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ReportSheet — reportableType", () => {
  it("renders for Listing type", () => {
    renderSheet({ reportableType: "Listing", reportableId: 42 });
    expect(screen.getByText("report.title")).toBeTruthy();
  });

  it("renders identically for User type", () => {
    renderSheet({ reportableType: "User", reportableId: 7 });
    expect(screen.getByText("report.title")).toBeTruthy();
    expect(screen.getAllByText("report.reasons.spam").length).toBeGreaterThan(0);
  });
});
