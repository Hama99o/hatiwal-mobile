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
