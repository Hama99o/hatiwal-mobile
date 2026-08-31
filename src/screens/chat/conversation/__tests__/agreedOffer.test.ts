/**
 * agreedOffer — unit tests for TASK-C763.
 *
 * Exercises the REAL, exported `findAgreedOffer`/`shouldShowAgreedDealBanner`
 * that `Conversation.tsx` imports directly — never a hand-copied duplicate
 * (see `offerGuards.test.ts`'s own header comment on the C381 test tautology
 * this house avoids repeating).
 */
import { buildOfferIndex, type OfferThreadMessage } from "../offerGuards";
import { findAgreedOffer, shouldShowAgreedDealBanner, type AgreedOfferMessage } from "../agreedOffer";

function msg(overrides: Partial<AgreedOfferMessage & OfferThreadMessage>): AgreedOfferMessage &
  OfferThreadMessage {
  return {
    id: 1,
    kind: "offer",
    respondsToId: null,
    body: null,
    offerAmount: null,
    offerCurrency: null,
    ...overrides,
  };
}

describe("findAgreedOffer", () => {
  it("returns null for an empty thread", () => {
    expect(findAgreedOffer([], buildOfferIndex([]))).toBeNull();
  });

  it("returns null when the newest offer/counter is still pending", () => {
    const messages = [msg({ id: 1, kind: "offer", offerAmount: 5000, offerCurrency: "AFN" })];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toBeNull();
  });

  it("returns null when the offer was declined", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 5000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_declined", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toBeNull();
  });

  it("returns null when the offer was superseded by a counter (the counter, not the original, is the live row)", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 5000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_counter", respondsToId: 1, offerAmount: 5500, offerCurrency: "AFN" }),
    ];
    // Neither row is accepted yet — the counter is pending, the original is superseded.
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toBeNull();
  });

  it("BUYER accepted a plain seller offer (the O947 path) — resolves the accepted offer", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 12000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toEqual({
      offerMessageId: 1,
      amount: 12000,
      currency: "AFN",
      // SF-M11: these offers name no quantity, so the agreed units are ONE.
      quantity: 1,
    });
  });

  it("BUYER accepted the SELLER's counter-offer (the C763 hole) — resolves the accepted counter, not the superseded original", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 12000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_counter", respondsToId: 1, offerAmount: 13500, offerCurrency: "AFN" }),
      msg({ id: 3, kind: "offer_accepted", respondsToId: 2 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toEqual({
      offerMessageId: 2,
      amount: 13500,
      currency: "AFN",
      // SF-M11: these offers name no quantity, so the agreed units are ONE.
      quantity: 1,
    });
  });

  it("falls back to parsing body when offerAmount/offerCurrency are missing (legacy row)", () => {
    const messages = [
      msg({ id: 1, kind: "offer", body: "9000|AFN|10000", offerAmount: null, offerCurrency: null }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toEqual({
      offerMessageId: 1,
      amount: 9000,
      currency: "AFN",
      // SF-M11: these offers name no quantity, so the agreed units are ONE.
      quantity: 1,
    });
  });

  it("returns the NEWEST accepted offer when a second negotiation round happened after the first was accepted", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 5000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
      msg({ id: 3, kind: "offer", offerAmount: 7000, offerCurrency: "AFN" }),
      msg({ id: 4, kind: "offer_accepted", respondsToId: 3 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toEqual({
      offerMessageId: 3,
      amount: 7000,
      currency: "AFN",
      // SF-M11: these offers name no quantity, so the agreed units are ONE.
      quantity: 1,
    });
  });

  it("ignores an accepted amount of zero (never a valid agreed price)", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 0, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))).toBeNull();
  });
});

describe("shouldShowAgreedDealBanner", () => {
  const agreedOffer = { offerMessageId: 2, amount: 13500, currency: "AFN" };

  it("true for the owner on an active listing with an agreed offer", () => {
    expect(
      shouldShowAgreedDealBanner({ isOwner: true, listing: { status: "active" }, agreedOffer })
    ).toBe(true);
  });

  it("false for the buyer (never shown to a non-owner) even with an agreed offer", () => {
    expect(
      shouldShowAgreedDealBanner({ isOwner: false, listing: { status: "active" }, agreedOffer })
    ).toBe(false);
  });

  it("false when there is no agreed offer yet", () => {
    expect(
      shouldShowAgreedDealBanner({ isOwner: true, listing: { status: "active" }, agreedOffer: null })
    ).toBe(false);
  });

  it.each(["draft", "reserved", "sold"] as const)(
    "false for a %s listing even with an agreed offer",
    (status) => {
      expect(
        shouldShowAgreedDealBanner({ isOwner: true, listing: { status }, agreedOffer })
      ).toBe(false);
    }
  );

  it("false when the listing is missing entirely", () => {
    expect(shouldShowAgreedDealBanner({ isOwner: true, listing: null, agreedOffer })).toBe(false);
  });
});

// ── SF-M11: the agreed offer carries how many units it was for ─────────────
//
// This is the number mark-sold opens on, so a wrong answer here sells the
// wrong quantity — the failure the whole ticket exists to prevent.
describe("findAgreedOffer — agreed quantity", () => {
  it("carries the accepted offer's quantity through", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 12000, offerCurrency: "AFN", offerQuantity: 3 }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))?.quantity).toBe(3);
  });

  it("reads an offer that named no quantity as ONE unit", () => {
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 12000, offerCurrency: "AFN" }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))?.quantity).toBe(1);
  });

  it("takes the quantity from the NEWEST accepted offer, not a superseded one", () => {
    // A counter restates the quantity as well as the price (the API permits
    // `offer_quantity` on `offer_counter` for exactly this reason), so a deal
    // re-agreed at 5 units must not settle at the 3 of the superseded offer.
    const messages = [
      msg({ id: 1, kind: "offer", offerAmount: 12000, offerCurrency: "AFN", offerQuantity: 3 }),
      msg({
        id: 2,
        kind: "offer_counter",
        respondsToId: 1,
        offerAmount: 11000,
        offerCurrency: "AFN",
        offerQuantity: 5,
      }),
      msg({ id: 3, kind: "offer_accepted", respondsToId: 2 }),
    ];
    expect(findAgreedOffer(messages, buildOfferIndex(messages))?.quantity).toBe(5);
  });
});
