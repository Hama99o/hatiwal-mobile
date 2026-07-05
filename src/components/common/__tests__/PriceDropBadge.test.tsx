import React from "react";
import { render, screen } from "@testing-library/react-native";
import { PriceDropBadge } from "../PriceDropBadge";

// i18next mock returns the key with interpolated values, e.g.:
//   t("listing.priceDrop.badge", { percent: 15 }) → "listing.priceDrop.badge"
// We assert on the key string since the mock is a simple pass-through.

describe("PriceDropBadge — detail variant", () => {
  it("renders the badge text in detail mode", () => {
    render(<PriceDropBadge percent={15} variant="detail" />);
    expect(screen.getByText(/listing\.priceDrop\.badge/)).toBeTruthy();
  });

  it("returns null when percent is 0", () => {
    const { toJSON } = render(<PriceDropBadge percent={0} variant="detail" />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when percent is negative", () => {
    const { toJSON } = render(<PriceDropBadge percent={-5} variant="detail" />);
    expect(toJSON()).toBeNull();
  });

  it("renders with a positive percent value", () => {
    const { toJSON } = render(<PriceDropBadge percent={20} variant="detail" />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("PriceDropBadge — card variant", () => {
  it("renders the short badge text in card mode", () => {
    render(<PriceDropBadge percent={10} variant="card" />);
    expect(screen.getByText(/listing\.priceDrop\.badgeCardShort/)).toBeTruthy();
  });

  it("returns null when percent is 0 in card mode", () => {
    const { toJSON } = render(<PriceDropBadge percent={0} variant="card" />);
    expect(toJSON()).toBeNull();
  });

  it("renders with a positive percent in card mode", () => {
    const { toJSON } = render(<PriceDropBadge percent={5} variant="card" />);
    expect(toJSON()).not.toBeNull();
  });
});

describe("PriceDropBadge — default variant", () => {
  it("defaults to detail variant when no variant prop is given", () => {
    render(<PriceDropBadge percent={25} />);
    expect(screen.getByText(/listing\.priceDrop\.badge/)).toBeTruthy();
  });
});

// ── 'saved' variant — per-buyer price-at-save vs. current-price (TASK-Y316) ──
describe("PriceDropBadge — saved variant", () => {
  it("renders the strikethrough old price and the emphasized new price when the price dropped", () => {
    render(<PriceDropBadge variant="saved" oldPrice={5000} newPrice={4000} currency="AFN" />);
    expect(screen.getByText(/listing\.priceDrop\.savedBadge/)).toBeTruthy();
    expect(screen.getByTestId("price-drop-badge-saved")).toBeTruthy();
  });

  it("returns null when the price is unchanged", () => {
    const { toJSON } = render(
      <PriceDropBadge variant="saved" oldPrice={5000} newPrice={5000} currency="AFN" />
    );
    expect(toJSON()).toBeNull();
  });

  it("returns null when the price increased", () => {
    const { toJSON } = render(
      <PriceDropBadge variant="saved" oldPrice={5000} newPrice={6000} currency="AFN" />
    );
    expect(toJSON()).toBeNull();
  });

  it("returns null when oldPrice is missing", () => {
    const { toJSON } = render(<PriceDropBadge variant="saved" newPrice={4000} currency="AFN" />);
    expect(toJSON()).toBeNull();
  });

  it("returns null when newPrice is missing", () => {
    const { toJSON } = render(<PriceDropBadge variant="saved" oldPrice={5000} currency="AFN" />);
    expect(toJSON()).toBeNull();
  });

  // Accessibility (TASK-Y316 review fix): the pill collapses to a single a11y
  // node via accessibilityRole="text", so the label itself must carry the old
  // and new price — otherwise a screen-reader user only hears "Price dropped"
  // and never learns the actual values.
  it("builds the accessibilityLabel from the interpolated i18n key with both prices (non-compact)", () => {
    render(<PriceDropBadge variant="saved" oldPrice={5000} newPrice={4000} currency="AFN" />);
    const badge = screen.getByTestId("price-drop-badge-saved");
    // t() mock returns the raw key (no interpolation), so we assert the a11y-specific
    // key was used — proving the label is NOT the generic "savedBadge" key alone.
    expect(badge.props.accessibilityLabel).toBe("listing.priceDrop.savedBadgeA11y");
  });

  it("builds the accessibilityLabel from the compact-specific i18n key when compact=true", () => {
    render(
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={4000} currency="AFN" />
    );
    const badge = screen.getByTestId("price-drop-badge-saved");
    expect(badge.props.accessibilityLabel).toBe("listing.priceDrop.savedBadgeCompactA11y");
  });
});

// ── 'saved' variant, compact form — used on the narrow Saved grid card ───────
describe("PriceDropBadge — saved variant, compact form", () => {
  it("renders the struck-through old price and the drop amount, without the label text", () => {
    render(
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={4000} currency="AFN" />
    );
    expect(screen.getByTestId("price-drop-badge-saved")).toBeTruthy();
    expect(screen.getByText("AFN 5000")).toBeTruthy();
    expect(screen.getByText("-AFN 1000")).toBeTruthy();
    // Compact form must NOT repeat the "Price dropped" label or the raw new price —
    // the card's PriceTag hero already shows the current price.
    expect(screen.queryByText("listing.priceDrop.savedBadge")).toBeNull();
    expect(screen.queryByText("AFN 4000")).toBeNull();
  });

  it("returns null when compact and price is unchanged", () => {
    const { toJSON } = render(
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={5000} currency="AFN" />
    );
    expect(toJSON()).toBeNull();
  });

  it("returns null when compact and price increased", () => {
    const { toJSON } = render(
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={6000} currency="AFN" />
    );
    expect(toJSON()).toBeNull();
  });
});

// ── RTL layout — mirrored pill + strikethrough/arrow order (TASK-Y316) ───────
// Same technique as ViewsSparkline.test.tsx: jest.doMock @/hooks/useLocalization
// with isRtl=true for this describe block only.
describe("PriceDropBadge — saved variant, RTL layout", () => {
  beforeAll(() => {
    jest.doMock("@/hooks/useLocalization", () => ({
      useLocalization: () => ({
        formatCurrency: (amount: number, currency = "AFN") => `${currency} ${amount}`,
        formatDate: (d: string) => d,
        formatDateShort: (d: string) => d,
        formatTime: (d: string) => d,
        formatDateTime: (d: string) => d,
        formatNumber: (n: number) => String(n),
        isRtl: true,
        lang: "ps",
      }),
    }));
  });

  afterAll(() => {
    jest.resetModules();
  });

  it("still renders the badge (with mirrored layout) in RTL mode without crashing", () => {
    render(<PriceDropBadge variant="saved" oldPrice={5000} newPrice={4000} currency="AFN" />);
    expect(screen.getByTestId("price-drop-badge-saved")).toBeTruthy();
    expect(screen.getByText(/listing\.priceDrop\.savedBadge/)).toBeTruthy();
  });

  it("still returns null in RTL mode when the price did not drop", () => {
    const { toJSON } = render(
      <PriceDropBadge variant="saved" oldPrice={5000} newPrice={5000} currency="AFN" />
    );
    expect(toJSON()).toBeNull();
  });

  it("still renders the compact form (with mirrored layout) in RTL mode without crashing", () => {
    render(
      <PriceDropBadge variant="saved" compact oldPrice={5000} newPrice={4000} currency="AFN" />
    );
    expect(screen.getByTestId("price-drop-badge-saved")).toBeTruthy();
    expect(screen.getByText("AFN 5000")).toBeTruthy();
    expect(screen.getByText("-AFN 1000")).toBeTruthy();
  });
});
