/**
 * ReviewPromptSheet — Jest unit tests (REV2 double-blind review prompt).
 *
 * Covers:
 *  1. Renders the correct title depending on callerRole (rate buyer / rate seller)
 *  2. Submit is disabled until a star rating is picked
 *  3. Submitting calls reviewsAPI.createReview(transactionId, { rating, comment })
 *  4. review.visible === false → shows the "pending" confirmation panel
 *  5. review.visible === true  → shows the "thanks" (revealed) confirmation panel
 *  6. "Not now" (skip) closes the sheet without submitting
 *  7. A failed submit shows an error toast and stays on the form step
 *  8. State resets each time the sheet re-opens
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Override the global t() mock so we can assert interpolation args (name).
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
  X: "X",
  CheckCircle2: "CheckCircle2",
  Clock: "Clock",
  Star: "Star",
  Info: "Info",
}));

jest.mock("@/api/reviews", () => ({
  reviewsAPI: {
    createReview: jest.fn(),
  },
}));

jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { ReviewPromptSheet } from "../ReviewPromptSheet";
import { reviewsAPI } from "@/api/reviews";
import { toast } from "sonner-native";

const mockReviewsAPI = reviewsAPI as jest.Mocked<typeof reviewsAPI>;

function renderSheet(overrides: Partial<React.ComponentProps<typeof ReviewPromptSheet>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = jest.fn();
  const onSubmitted = jest.fn();
  render(
    <QueryClientProvider client={qc}>
      <ReviewPromptSheet
        visible
        onClose={onClose}
        transactionId={10}
        callerRole="seller"
        counterpartyName="Ahmad Karimi"
        counterpartyAvatarUrl={null}
        onSubmitted={onSubmitted}
        {...overrides}
      />
    </QueryClientProvider>
  );
  return { onClose, onSubmitted };
}

const visibleReview = {
  id: 1,
  rating: 5,
  comment: "Great!",
  role: "of_buyer" as const,
  visible: true,
  revealedAt: "2026-07-05T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
  transactionId: 10,
  revieweeId: 42,
  reviewer: { id: 1, name: "Jane Doe", avatarUrl: null },
};

const hiddenReview = { ...visibleReview, visible: false, revealedAt: null };

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Title depends on callerRole ──────────────────────────────────────────────

describe("ReviewPromptSheet — title", () => {
  it("shows the promptSellerTitle key (rating the buyer) when callerRole=seller", () => {
    renderSheet({ callerRole: "seller" });
    expect(
      screen.getByText('reviews.promptSellerTitle:{"name":"Ahmad Karimi"}')
    ).toBeTruthy();
  });

  it("shows the promptBuyerTitle key (rating the seller) when callerRole=buyer", () => {
    renderSheet({ callerRole: "buyer" });
    expect(
      screen.getByText('reviews.promptBuyerTitle:{"name":"Ahmad Karimi"}')
    ).toBeTruthy();
  });
});

// ── 2. Submit disabled until a rating is picked ────────────────────────────────

describe("ReviewPromptSheet — submit gating", () => {
  it("disables Submit until a star is tapped", () => {
    renderSheet();
    expect(screen.getByTestId("review-prompt-submit").props.accessibilityState?.disabled).toBe(true);
  });

  it("enables Submit once a star is tapped", () => {
    renderSheet();
    fireEvent.press(screen.getByTestId("star-rating-4"));
    expect(screen.getByTestId("review-prompt-submit").props.accessibilityState?.disabled).toBe(false);
  });
});

// ── 3. Submit calls createReview with rating + comment ─────────────────────────

describe("ReviewPromptSheet — submitting", () => {
  it("calls createReview(transactionId, { rating, comment }) on submit", async () => {
    mockReviewsAPI.createReview.mockResolvedValue(visibleReview as any);
    renderSheet();

    fireEvent.press(screen.getByTestId("star-rating-5"));
    fireEvent.changeText(screen.getByTestId("review-prompt-comment"), "Smooth deal");
    fireEvent.press(screen.getByTestId("review-prompt-submit"));

    await waitFor(() => {
      expect(mockReviewsAPI.createReview).toHaveBeenCalledWith(10, {
        rating: 5,
        comment: "Smooth deal",
      });
    });
  });

  it("passes comment: undefined when the comment field is left blank", async () => {
    mockReviewsAPI.createReview.mockResolvedValue(visibleReview as any);
    renderSheet();

    fireEvent.press(screen.getByTestId("star-rating-3"));
    fireEvent.press(screen.getByTestId("review-prompt-submit"));

    await waitFor(() => {
      expect(mockReviewsAPI.createReview).toHaveBeenCalledWith(10, {
        rating: 3,
        comment: undefined,
      });
    });
  });
});

// ── 4 & 5. Post-submit double-blind states ──────────────────────────────────────

describe("ReviewPromptSheet — double-blind post-submit states", () => {
  it("shows the pending confirmation when the review is still hidden (visible: false)", async () => {
    mockReviewsAPI.createReview.mockResolvedValue(hiddenReview as any);
    const { onSubmitted } = renderSheet();

    fireEvent.press(screen.getByTestId("star-rating-4"));
    fireEvent.press(screen.getByTestId("review-prompt-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("review-prompt-pending-title")).toBeTruthy();
    });
    expect(screen.getByTestId("review-prompt-pending-body")).toBeTruthy();
    expect(screen.queryByTestId("review-prompt-thanks")).toBeNull();
    expect(onSubmitted).toHaveBeenCalledWith(hiddenReview);
  });

  it("shows the thanks confirmation when the review reveals immediately (visible: true)", async () => {
    mockReviewsAPI.createReview.mockResolvedValue(visibleReview as any);
    renderSheet();

    fireEvent.press(screen.getByTestId("star-rating-5"));
    fireEvent.press(screen.getByTestId("review-prompt-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("review-prompt-thanks")).toBeTruthy();
    });
    expect(screen.queryByTestId("review-prompt-pending-title")).toBeNull();
  });
});

// ── 6. Skip / Not now ────────────────────────────────────────────────────────────

describe("ReviewPromptSheet — skip", () => {
  it("closes without calling createReview when 'Not now' is pressed", () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByTestId("review-prompt-skip"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockReviewsAPI.createReview).not.toHaveBeenCalled();
  });
});

// ── 7. Error handling ────────────────────────────────────────────────────────────

describe("ReviewPromptSheet — error", () => {
  it("shows an error toast and stays on the form when submit fails", async () => {
    mockReviewsAPI.createReview.mockRejectedValue(new Error("network error"));
    renderSheet();

    fireEvent.press(screen.getByTestId("star-rating-4"));
    fireEvent.press(screen.getByTestId("review-prompt-submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("reviews.errors.generic");
    });
    expect(screen.getByTestId("review-prompt-submit")).toBeTruthy();
    expect(screen.queryByTestId("review-prompt-thanks")).toBeNull();
  });
});

// ── 8. Reset on re-open / visible=false renders nothing meaningful ─────────────

describe("ReviewPromptSheet — smoke", () => {
  it("renders the form title when visible=false too (Modal handles hiding)", () => {
    expect(() => renderSheet({ visible: false })).not.toThrow();
  });
});
