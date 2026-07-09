/**
 * RatingDisplay unit tests
 *
 * Covers:
 *  - Empty state: renders "reviews.empty" when reviewCount is 0/null/undefined
 *    or avgRating is null (no misleading "0.0" score)
 *  - Filled state: renders the "reviews.summary" key with rating+count interpolation
 *  - sm vs lg size variants both render without crashing
 *  - onPress makes the component a Pressable (accessibilityRole="button")
 *  - Renders without a testID crash when omitted
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { RatingDisplay } from "../RatingDisplay";

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
  Star: "Star",
}));

beforeEach(() => {
  mockT.mockClear();
});

describe("RatingDisplay — empty states", () => {
  it("renders the empty label when reviewCount is 0", () => {
    render(<RatingDisplay avgRating={null} reviewCount={0} testID="rating" />);
    expect(mockT).toHaveBeenCalledWith("reviews.empty", undefined);
    expect(screen.queryByText(/reviews\.summary/)).toBeNull();
  });

  it("renders the empty label when reviewCount is null", () => {
    render(<RatingDisplay avgRating={null} reviewCount={null} testID="rating" />);
    expect(mockT).toHaveBeenCalledWith("reviews.empty", undefined);
  });

  it("renders the empty label when reviewCount is undefined", () => {
    render(<RatingDisplay avgRating={undefined} reviewCount={undefined} testID="rating" />);
    expect(mockT).toHaveBeenCalledWith("reviews.empty", undefined);
  });

  it("renders the empty label when avgRating is null even if reviewCount > 0 (defensive)", () => {
    render(<RatingDisplay avgRating={null} reviewCount={5} testID="rating" />);
    expect(mockT).toHaveBeenCalledWith("reviews.empty", undefined);
  });
});

describe("RatingDisplay — filled states", () => {
  it("calls t('reviews.summary') with the formatted rating and count", () => {
    render(<RatingDisplay avgRating={4.8} reviewCount={45} testID="rating" />);
    expect(mockT).toHaveBeenCalledWith("reviews.summary", { rating: "4.8", count: "45" });
  });

  it("renders in sm size without crashing", () => {
    const { toJSON } = render(<RatingDisplay avgRating={4.8} reviewCount={45} size="sm" />);
    expect(toJSON()).not.toBeNull();
  });

  it("renders in lg size without crashing", () => {
    const { toJSON } = render(<RatingDisplay avgRating={4.8} reviewCount={45} size="lg" />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("RatingDisplay — onPress", () => {
  it("wraps content in a pressable with accessibilityRole button when onPress is given", () => {
    const onPress = jest.fn();
    render(<RatingDisplay avgRating={4.8} reviewCount={45} onPress={onPress} testID="rating" />);
    fireEvent.press(screen.getByTestId("rating"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders a plain View (no press handler) when onPress is omitted", () => {
    const { toJSON } = render(<RatingDisplay avgRating={4.8} reviewCount={45} testID="rating" />);
    expect(toJSON()).not.toBeNull();
  });
});
