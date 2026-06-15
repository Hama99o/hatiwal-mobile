import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PriceTag } from "../PriceTag";

// formatCurrency mock (from setup.ts) returns "AFN 25000"

describe("PriceTag", () => {
  it("renders formatted price with default currency", () => {
    render(<PriceTag price={25000} />);
    expect(screen.getByText("AFN 25000")).toBeTruthy();
  });

  it("renders with explicit USD currency", () => {
    render(<PriceTag price={100} currency="USD" />);
    expect(screen.getByText("USD 100")).toBeTruthy();
  });

  it("returns null when price is null", () => {
    const { toJSON } = render(<PriceTag price={null} />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when price is undefined", () => {
    const { toJSON } = render(<PriceTag price={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it("renders zero price (free item)", () => {
    render(<PriceTag price={0} />);
    expect(screen.getByText("AFN 0")).toBeTruthy();
  });

  it("has accessibilityRole text", () => {
    render(<PriceTag price={5000} />);
    expect(screen.getByRole("text")).toBeTruthy();
  });

  describe("size variants", () => {
    it("renders size lg without throwing", () => {
      expect(() => render(<PriceTag price={5000} size="lg" />)).not.toThrow();
    });

    it("renders size md (default) without throwing", () => {
      expect(() => render(<PriceTag price={5000} size="md" />)).not.toThrow();
    });

    it("renders size sm without throwing", () => {
      expect(() => render(<PriceTag price={5000} size="sm" />)).not.toThrow();
    });
  });
});
