/**
 * listingAvailability — Jest unit tests (SF-M3, docs/SELL_FLOW_REDESIGN.md
 * §4.2.1). These exercise the REAL predicates ListingDetail.tsx imports —
 * mirrors the house pattern already proven at threadAvailability.test.ts, so
 * the guard that ships is the one under test, not a hand-copied duplicate.
 */
import {
  canContactListing,
  canOfferOnListing,
  isListingDeadEnd,
} from "../listingAvailability";

const ACTIVE = { status: "active" };
const RESERVED = { status: "reserved" };
const SOLD = { status: "sold" };
const DRAFT = { status: "draft" };

describe("canContactListing", () => {
  it("is contactable when active and not the owner", () => {
    expect(canContactListing({ listing: ACTIVE, isOwnListing: false })).toBe(true);
  });

  // The whole point of SF-M3: reserved is no longer a dead end.
  it("is contactable when reserved and not the owner", () => {
    expect(canContactListing({ listing: RESERVED, isOwnListing: false })).toBe(true);
  });

  it("is NOT contactable when sold", () => {
    expect(canContactListing({ listing: SOLD, isOwnListing: false })).toBe(false);
  });

  it("is NOT contactable for a draft", () => {
    expect(canContactListing({ listing: DRAFT, isOwnListing: false })).toBe(false);
  });

  it("is NOT contactable for the listing's own owner, regardless of status", () => {
    expect(canContactListing({ listing: ACTIVE, isOwnListing: true })).toBe(false);
    expect(canContactListing({ listing: RESERVED, isOwnListing: true })).toBe(false);
  });

  it("is NOT contactable when there is no listing", () => {
    expect(canContactListing({ listing: null, isOwnListing: false })).toBe(false);
    expect(canContactListing({ listing: undefined, isOwnListing: false })).toBe(false);
  });
});

describe("canOfferOnListing", () => {
  it("shows the offer button on an active, negotiable listing", () => {
    expect(canOfferOnListing({ listing: ACTIVE, isNegotiable: true })).toBe(true);
  });

  // §3.2's deliberate judgment call: offers stay paused on a reserved
  // listing even though the listing itself is contactable again.
  it("hides the offer button on a reserved listing even when negotiable", () => {
    expect(canOfferOnListing({ listing: RESERVED, isNegotiable: true })).toBe(false);
  });

  it("hides the offer button when the listing is firm-priced", () => {
    expect(canOfferOnListing({ listing: ACTIVE, isNegotiable: false })).toBe(false);
  });

  it("hides the offer button on a sold listing", () => {
    expect(canOfferOnListing({ listing: SOLD, isNegotiable: true })).toBe(false);
  });

  it("hides the offer button when there is no listing", () => {
    expect(canOfferOnListing({ listing: null, isNegotiable: true })).toBe(false);
  });
});

describe("isListingDeadEnd", () => {
  it("is true only for sold", () => {
    expect(isListingDeadEnd("sold")).toBe(true);
  });

  // The behaviour change: reserved used to be a dead end too, no longer.
  it("is false for reserved", () => {
    expect(isListingDeadEnd("reserved")).toBe(false);
  });

  it("is false for active", () => {
    expect(isListingDeadEnd("active")).toBe(false);
  });

  it("is false for draft / null / undefined", () => {
    expect(isListingDeadEnd("draft")).toBe(false);
    expect(isListingDeadEnd(null)).toBe(false);
    expect(isListingDeadEnd(undefined)).toBe(false);
  });
});
