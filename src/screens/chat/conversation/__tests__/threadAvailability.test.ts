/**
 * threadAvailability — Jest unit tests (TASK-K729, review fix MEDIUM).
 *
 * These test the REAL functions Conversation.tsx imports (not hand-copied
 * duplicates) — see offerInThread.test.tsx / ComposerActionsSheet.test.tsx,
 * which used to re-declare `canOfferInThread` locally and could (and did)
 * drift from the real guard while staying green.
 */
import {
  canOfferInThread,
  showUnavailableNotice,
  offerUnavailableStatus,
} from "../threadAvailability";

const ACTIVE = { status: "active" };
const RESERVED = { status: "reserved" };
const SOLD = { status: "sold" };
const FIRM = { status: "active", negotiable: false };

describe("canOfferInThread", () => {
  it("shows the button on an open conversation about an active, negotiable listing", () => {
    expect(canOfferInThread({ canSend: true, listing: ACTIVE })).toBe(true);
  });

  it("shows the button when negotiable is explicitly true", () => {
    expect(canOfferInThread({ canSend: true, listing: { status: "active", negotiable: true } })).toBe(true);
  });

  it("shows the button when negotiable is undefined (default negotiable)", () => {
    expect(canOfferInThread({ canSend: true, listing: { status: "active" } })).toBe(true);
  });

  it("hides the button for a reserved listing", () => {
    expect(canOfferInThread({ canSend: true, listing: RESERVED })).toBe(false);
  });

  it("hides the button for a sold listing", () => {
    expect(canOfferInThread({ canSend: true, listing: SOLD })).toBe(false);
  });

  it("hides the button when the conversation is closed (canSend=false)", () => {
    expect(canOfferInThread({ canSend: false, listing: ACTIVE })).toBe(false);
  });

  it("hides the button when there is no listing on the conversation", () => {
    expect(canOfferInThread({ canSend: true, listing: null })).toBe(false);
    expect(canOfferInThread({ canSend: true, listing: undefined })).toBe(false);
  });

  it("hides the button when the listing has been deleted", () => {
    expect(canOfferInThread({ canSend: true, listing: ACTIVE, listingDeleted: true })).toBe(false);
  });

  it("hides the button when the listing is firm-priced (negotiable === false)", () => {
    expect(canOfferInThread({ canSend: true, listing: FIRM })).toBe(false);
  });
});

describe("showUnavailableNotice", () => {
  it("shows for a non-owner viewer on a reserved listing once the viewer is known", () => {
    expect(
      showUnavailableNotice({ isOwner: false, viewerKnown: true, listing: RESERVED })
    ).toBe(true);
  });

  it("shows for a non-owner viewer on a sold listing", () => {
    expect(
      showUnavailableNotice({ isOwner: false, viewerKnown: true, listing: SOLD })
    ).toBe(true);
  });

  // The original K729 bug: the seller's own view of their reserved/sold
  // thread must NEVER see the buyer-facing recovery copy.
  it("is hidden for the listing's own seller (isOwner=true) on a reserved listing", () => {
    expect(
      showUnavailableNotice({ isOwner: true, viewerKnown: true, listing: RESERVED })
    ).toBe(false);
  });

  it("is hidden for the listing's own seller (isOwner=true) on a sold listing", () => {
    expect(
      showUnavailableNotice({ isOwner: true, viewerKnown: true, listing: SOLD })
    ).toBe(false);
  });

  it("is hidden for an active listing (baseline — nothing to explain)", () => {
    expect(
      showUnavailableNotice({ isOwner: false, viewerKnown: true, listing: ACTIVE })
    ).toBe(false);
  });

  // Review fix, LOW: never flash the buyer-facing copy before the viewer is
  // known (currentUser still hydrating on a cold start) — a seller opening a
  // reserved/sold thread must not see it even for one frame.
  it("is hidden while the viewer is not yet known (viewerKnown=false), even on a reserved listing", () => {
    expect(
      showUnavailableNotice({ isOwner: false, viewerKnown: false, listing: RESERVED })
    ).toBe(false);
  });

  it("is hidden when there is no listing on the conversation", () => {
    expect(showUnavailableNotice({ isOwner: false, viewerKnown: true, listing: null })).toBe(false);
  });

  it("is hidden when the listing has been deleted", () => {
    expect(
      showUnavailableNotice({ isOwner: false, viewerKnown: true, listing: RESERVED, listingDeleted: true })
    ).toBe(false);
  });
});

describe("offerUnavailableStatus", () => {
  it("returns 'reserved' on an open conversation about a reserved listing", () => {
    expect(offerUnavailableStatus({ canSend: true, listing: RESERVED })).toBe("reserved");
  });

  it("returns 'sold' on an open conversation about a sold listing", () => {
    expect(offerUnavailableStatus({ canSend: true, listing: SOLD })).toBe("sold");
  });

  it("returns null for an active listing — no reason needed", () => {
    expect(offerUnavailableStatus({ canSend: true, listing: ACTIVE })).toBeNull();
  });

  it("returns null when the conversation is closed — a different notice covers that", () => {
    expect(offerUnavailableStatus({ canSend: false, listing: RESERVED })).toBeNull();
  });

  it("returns null when the listing has been deleted — a different notice covers that", () => {
    expect(offerUnavailableStatus({ canSend: true, listing: RESERVED, listingDeleted: true })).toBeNull();
  });

  it("returns null when the listing is firm-priced but still active — that's a different reason", () => {
    expect(offerUnavailableStatus({ canSend: true, listing: FIRM })).toBeNull();
  });
});
