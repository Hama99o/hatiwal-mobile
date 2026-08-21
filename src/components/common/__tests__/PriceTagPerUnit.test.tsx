/**
 * PriceTag `perUnit` — the guard on the most dangerous ambiguity in the
 * multi-quantity feature.
 *
 * A bare "AFN 14,000" on a 15-unit listing lets a buyer asking for 3 and a
 * seller quoting a figure mean different totals, and they only find out at the
 * meetup — no payment system to arbitrate, no delivery to reverse. See
 * docs/SPIKE_LISTING_QUANTITY.md §0c.
 */
import { render, screen } from "@testing-library/react-native";
import { PriceTag } from "../PriceTag";

jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => ({
    formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
    isRtl: false,
  }),
}));

// The shared <Text> reads i18n.language to pick a font (src/lib/fonts.ts), so the
// mock has to supply it, not just t().
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

describe("PriceTag perUnit", () => {
  it("renders a bare price by default — the single-unit case is untouched", () => {
    render(<PriceTag price={14000} currency="AFN" />);
    expect(screen.getByText("AFN 14000")).toBeTruthy();
    expect(screen.queryByText("listing.stock.each")).toBeNull();
  });

  it("appends 'each' when the listing has more than one unit", () => {
    render(<PriceTag price={14000} currency="AFN" perUnit />);
    expect(screen.getByText("AFN 14000")).toBeTruthy();
    expect(screen.getByText("listing.stock.each")).toBeTruthy();
  });

  it("leaves the price figure itself unchanged, so the hierarchy is not disturbed", () => {
    const { rerender } = render(<PriceTag price={14000} currency="AFN" size="lg" />);
    const bare = screen.getByText("AFN 14000").props.style;
    rerender(<PriceTag price={14000} currency="AFN" size="lg" perUnit />);
    const withUnit = screen.getByText("AFN 14000").props.style;
    expect(withUnit.fontSize).toBe(bare.fontSize);
    expect(withUnit.fontWeight).toBe(bare.fontWeight);
  });

  it("still renders nothing for a null price", () => {
    render(<PriceTag price={null} perUnit />);
    expect(screen.queryByText("listing.stock.each")).toBeNull();
  });
});
