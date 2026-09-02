import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import React from "react";
import { Linking } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SellerPhoneReveal } from "../SellerPhoneReveal";

// The reveal is auth-gated; in tests requireAuth runs its callback straight away.
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({ requireAuth: (fn: () => void) => fn() }),
}));

const props = {
  isOwnListing: false,
  isContactable: true,
  authReturnTo: "/listing/1",
};

function reveal() {
  fireEvent.press(screen.getByText("listing.detail.showPhone"));
}

describe("SellerPhoneReveal — WhatsApp (owner request 2026-09-02)", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  it("offers WhatsApp beside Call once the number is revealed", () => {
    render(<SellerPhoneReveal phone="+93 70 000 0001" {...props} />);
    reveal();
    expect(screen.getByTestId("seller-call-row")).toBeTruthy();
    expect(screen.getByTestId("seller-whatsapp-row")).toBeTruthy();
  });

  it("opens a wa.me link — no scheme, so it works on Android AND iOS", () => {
    render(<SellerPhoneReveal phone="+93 70 000 0001" {...props} />);
    reveal();
    fireEvent.press(screen.getByTestId("seller-whatsapp-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/93700000001");
  });

  it("still dials on the call row", () => {
    render(<SellerPhoneReveal phone="+93 70 000 0001" {...props} />);
    reveal();
    fireEvent.press(screen.getByTestId("seller-call-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+93 70 000 0001");
  });

  it("normalises a national number before building the link", () => {
    render(<SellerPhoneReveal phone="0700000001" {...props} />);
    reveal();
    fireEvent.press(screen.getByTestId("seller-whatsapp-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/93700000001");
  });

  it("hides WhatsApp when the number cannot be normalised — never a wrong chat", () => {
    render(<SellerPhoneReveal phone="12345" {...props} />);
    reveal();
    // Call still works (the dialer can cope with a partial number); WhatsApp
    // does not appear, because a wrong wa.me number opens a chat with a stranger.
    expect(screen.getByTestId("seller-call-row")).toBeTruthy();
    expect(screen.queryByTestId("seller-whatsapp-row")).toBeNull();
  });

  it("renders nothing at all for the listing's owner", () => {
    render(<SellerPhoneReveal phone="+93700000001" {...props} isOwnListing />);
    expect(screen.queryByText("listing.detail.showPhone")).toBeNull();
  });

  it("renders nothing when the listing is not contactable (sold/draft)", () => {
    render(<SellerPhoneReveal phone="+93700000001" {...props} isContactable={false} />);
    expect(screen.queryByText("listing.detail.showPhone")).toBeNull();
  });
});

// ── The dedicated WhatsApp number is actually USED ─────────────────────────
//
// This is the half that was missing. The field, its "same as my phone"
// shortcut and its visibility switch all shipped on 2026-09-02, and
// ListingSerializer's :detailed view has been sending `seller.whatsapp_number`
// (on the same switch as the phone) the whole time — but nothing read it, so
// every wa.me link was built from `phone`. A seller whose WhatsApp lives on a
// different number was sending buyers to the wrong one, which is the only
// reason the field is separate from `phone` at all.
describe("SellerPhoneReveal — the seller's separate WhatsApp number", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  it("PREFERS whatsappNumber over phone for the wa.me link", () => {
    render(
      <SellerPhoneReveal phone="+93 70 000 0001" whatsappNumber="+93 78 555 4444" {...props} />
    );
    reveal();
    fireEvent.press(screen.getByTestId("seller-whatsapp-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/93785554444");
  });

  it("still DIALS the phone, not the WhatsApp number", () => {
    render(
      <SellerPhoneReveal phone="+93 70 000 0001" whatsappNumber="+93 78 555 4444" {...props} />
    );
    reveal();
    fireEvent.press(screen.getByTestId("seller-call-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+93 70 000 0001");
  });

  it("falls back to the phone when no WhatsApp number was set", () => {
    render(<SellerPhoneReveal phone="+93 70 000 0001" whatsappNumber={null} {...props} />);
    reveal();
    fireEvent.press(screen.getByTestId("seller-whatsapp-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/93700000001");
  });

  it("treats a whitespace-only WhatsApp number as unset", () => {
    render(<SellerPhoneReveal phone="+93 70 000 0001" whatsappNumber="   " {...props} />);
    reveal();
    fireEvent.press(screen.getByTestId("seller-whatsapp-row"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/93700000001");
  });

  it("hides the WhatsApp row when the WhatsApp number is undialable and there is no usable phone", () => {
    // whatsappUrl returns null for anything outside 10-15 digits, and the row is
    // conditional on it — so an unusable value must not render a dead button.
    render(<SellerPhoneReveal phone="12345" whatsappNumber="678" {...props} />);
    reveal();
    expect(screen.queryByTestId("seller-whatsapp-row")).toBeNull();
  });
});
