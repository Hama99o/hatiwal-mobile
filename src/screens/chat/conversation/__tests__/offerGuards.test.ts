/**
 * offerGuards — unit tests for TASK-C381 (review fix, MUST).
 *
 * `offerInThread.test.tsx` used to hand-copy `canCounterBack`/
 * `canRespondToOffer` instead of importing the real predicates from
 * `Conversation.tsx` — a tautology that could never fail. These tests
 * exercise the REAL, exported `buildOfferIndex`/`canRespondToOffer`/
 * `canCounterBack` functions Conversation.tsx actually imports.
 */
import {
  buildOfferIndex,
  canRespondToOffer,
  canCounterBack,
  type OfferThreadMessage,
} from "../offerGuards";

function msg(overrides: Partial<OfferThreadMessage>): OfferThreadMessage {
  return { id: 1, kind: "offer", respondsToId: null, ...overrides };
}

describe("buildOfferIndex", () => {
  it("returns an empty index for an empty thread", () => {
    expect(buildOfferIndex([]).size).toBe(0);
  });

  it("ignores text/meetup/system messages entirely", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "text" as never }),
      msg({ id: 2, kind: "meetup_proposal" as never }),
      msg({ id: 3, kind: "system" as never }),
    ]);
    expect(index.size).toBe(0);
  });

  it("a single unanswered offer is pending — not superseded, no outcome", () => {
    const index = buildOfferIndex([msg({ id: 1, kind: "offer" })]);
    expect(index.get(1)).toEqual({ outcome: null, isSuperseded: false });
  });

  it("a directly accepted offer carries outcome=accepted, not superseded", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_accepted", respondsToId: 1 }),
    ]);
    expect(index.get(1)).toEqual({ outcome: "accepted", isSuperseded: false });
  });

  it("a directly declined offer carries outcome=declined", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_declined", respondsToId: 1 }),
    ]);
    expect(index.get(1)).toEqual({ outcome: "declined", isSuperseded: false });
  });

  it("an offer answered with a counter is superseded, with no outcome (the counter card owns the outcome)", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_counter", respondsToId: 1 }),
    ]);
    expect(index.get(1)).toEqual({ outcome: null, isSuperseded: true });
    // The counter itself is the new live tip — pending, not superseded.
    expect(index.get(2)).toEqual({ outcome: null, isSuperseded: false });
  });

  it("a counter answered by a further counter-back is itself superseded (multi-round negotiation)", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_counter", respondsToId: 1 }),
      msg({ id: 3, kind: "offer_counter", respondsToId: 2 }),
    ]);
    expect(index.get(1)?.isSuperseded).toBe(true);
    expect(index.get(2)?.isSuperseded).toBe(true);
    expect(index.get(3)).toEqual({ outcome: null, isSuperseded: false });
  });

  it("a counter-back that is accepted ends the chain with outcome=accepted on the last counter", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_counter", respondsToId: 1 }),
      msg({ id: 3, kind: "offer_counter", respondsToId: 2 }),
      msg({ id: 4, kind: "offer_accepted", respondsToId: 3 }),
    ]);
    expect(index.get(3)).toEqual({ outcome: "accepted", isSuperseded: false });
  });

  // ── DR review fix: "only the newest pending offer keeps live actions" ──────
  it("two independent standalone pending offers: only the newer one stays live", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }), // buyer's first offer, never answered
      msg({ id: 2, kind: "offer" }), // buyer changes their mind, opens a second
    ]);
    expect(index.get(1)).toEqual({ outcome: null, isSuperseded: true });
    expect(index.get(2)).toEqual({ outcome: null, isSuperseded: false });
  });

  it("an EARLIER pending offer that already has its own direct outcome is unaffected by a later standalone offer", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer_declined", respondsToId: 1 }),
      msg({ id: 3, kind: "offer" }), // a fresh offer after the first was declined
    ]);
    expect(index.get(1)).toEqual({ outcome: "declined", isSuperseded: false });
    expect(index.get(3)).toEqual({ outcome: null, isSuperseded: false });
  });

  it("three independent pending offers: only the last is live, the earlier two are both superseded", () => {
    const index = buildOfferIndex([
      msg({ id: 1, kind: "offer" }),
      msg({ id: 2, kind: "offer" }),
      msg({ id: 3, kind: "offer" }),
    ]);
    expect(index.get(1)?.isSuperseded).toBe(true);
    expect(index.get(2)?.isSuperseded).toBe(true);
    expect(index.get(3)?.isSuperseded).toBe(false);
  });
});

describe("canRespondToOffer", () => {
  it("false when there is no index entry (not an offer/offer_counter row)", () => {
    expect(canRespondToOffer(undefined)).toBe(false);
  });

  it("true for a pending, non-superseded offer/counter", () => {
    expect(canRespondToOffer({ outcome: null, isSuperseded: false })).toBe(true);
  });

  it("false once a direct outcome exists", () => {
    expect(canRespondToOffer({ outcome: "accepted", isSuperseded: false })).toBe(false);
    expect(canRespondToOffer({ outcome: "declined", isSuperseded: false })).toBe(false);
  });

  it("false once superseded (by a counter or by a newer standalone offer)", () => {
    expect(canRespondToOffer({ outcome: null, isSuperseded: true })).toBe(false);
  });
});

describe("canCounterBack", () => {
  it("false for my own offer/counter, even if it is the live pending one", () => {
    expect(
      canCounterBack({ isMine: true, flags: { outcome: null, isSuperseded: false } })
    ).toBe(false);
  });

  it("true for the OTHER participant's pending offer/counter", () => {
    expect(
      canCounterBack({ isMine: false, flags: { outcome: null, isSuperseded: false } })
    ).toBe(true);
  });

  it("false once answered or superseded, regardless of isMine", () => {
    expect(
      canCounterBack({ isMine: false, flags: { outcome: "accepted", isSuperseded: false } })
    ).toBe(false);
    expect(
      canCounterBack({ isMine: false, flags: { outcome: null, isSuperseded: true } })
    ).toBe(false);
  });

  it("false when there is no index entry", () => {
    expect(canCounterBack({ isMine: false, flags: undefined })).toBe(false);
  });
});
