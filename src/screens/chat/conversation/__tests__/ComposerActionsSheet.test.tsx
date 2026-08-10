/**
 * ComposerActionsSheet — Jest unit tests (TASK-K487).
 *
 * Covers:
 *  1. Photo / File / Propose meetup rows always render.
 *  2. Make-an-offer row visibility mirrors Conversation.tsx's
 *     `canOfferInThread` matrix exactly (open + listing exists + not deleted
 *     + not reserved or sold (TASK-K729) + negotiable !== false).
 *  3. Every row closes the sheet BEFORE invoking its handler (iOS
 *     black-screen guard) — call-order assertions, not just "both called".
 *  4. Tapping the backdrop calls onClose without invoking any handler.
 *  5. `disabled` (upload in flight) suppresses every row's onPress.
 *  6. RTL — renders without throwing and flips row direction when isRtl=true.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Calendar: "Calendar",
  ImageIcon: "ImageIcon",
  Paperclip: "Paperclip",
  Tag: "Tag",
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// Import AFTER mocks
import { ComposerActionsSheet } from "../ComposerActionsSheet";

// ── Fixture helpers ──────────────────────────────────────────────────────────

/** Mirrors `canOfferInThread` in Conversation.tsx (TASK-K729: reserved excluded too). */
function canOfferInThread(params: {
  canSend: boolean;
  listing: { status: string; negotiable?: boolean } | null | undefined;
  listingDeleted?: boolean;
}): boolean {
  const { canSend, listing, listingDeleted } = params;
  return (
    canSend &&
    !!listing &&
    !listingDeleted &&
    listing.status !== "sold" &&
    listing.status !== "reserved" &&
    listing.negotiable !== false
  );
}

function baseProps(overrides: Partial<React.ComponentProps<typeof ComposerActionsSheet>> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    onPhoto: jest.fn(),
    onFile: jest.fn(),
    onProposeMeetup: jest.fn(),
    onMakeOffer: jest.fn(),
    canMakeOffer: true,
    ...overrides,
  };
}

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false });
  jest.clearAllMocks();
});

// ── 1. Always-present rows ───────────────────────────────────────────────────

describe("ComposerActionsSheet — always-present rows", () => {
  it("renders Photo, File and Propose meetup rows", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    expect(screen.getByTestId("composer-action-photo")).toBeTruthy();
    expect(screen.getByTestId("composer-action-file")).toBeTruthy();
    expect(screen.getByTestId("composer-action-meetup")).toBeTruthy();
  });

  it("renders the sheet title", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    expect(screen.getByText("chat.composer.actionsTitle")).toBeTruthy();
  });

  it("uses the existing translation keys for row labels (no new duplicate strings)", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    expect(screen.getByText("chat.attachPhoto")).toBeTruthy();
    expect(screen.getByText("chat.attachFile")).toBeTruthy();
    expect(screen.getByText("chat.proposeMeetup")).toBeTruthy();
    expect(screen.getByText("chat.offer.makeOffer")).toBeTruthy();
  });
});

// ── 2. Offer row visibility matrix (mirrors canOfferInThread) ───────────────

describe("ComposerActionsSheet — offer row visibility matrix", () => {
  const ACTIVE = { status: "active" };
  const RESERVED = { status: "reserved" };
  const SOLD = { status: "sold" };
  const FIRM = { status: "active", negotiable: false };

  it.each([
    ["open conversation + active + negotiable listing", { canSend: true, listing: ACTIVE }, true],
    // TASK-K729: reserved now hides the row too — ListingUnavailableNotice explains why.
    ["open conversation + reserved listing", { canSend: true, listing: RESERVED }, false],
    ["closed conversation (canSend=false)", { canSend: false, listing: ACTIVE }, false],
    ["no listing on the conversation", { canSend: true, listing: null }, false],
    ["listing has been deleted", { canSend: true, listing: ACTIVE, listingDeleted: true }, false],
    ["listing is sold", { canSend: true, listing: SOLD }, false],
    ["listing is firm-priced (negotiable === false)", { canSend: true, listing: FIRM }, false],
  ] as const)("%s → offer row %s", (_desc, params, expected) => {
    const canMakeOffer = canOfferInThread(params as never);
    expect(canMakeOffer).toBe(expected);

    render(<ComposerActionsSheet {...baseProps({ canMakeOffer })} />);
    if (expected) {
      expect(screen.getByTestId("composer-action-offer")).toBeTruthy();
    } else {
      expect(screen.queryByTestId("composer-action-offer")).toBeNull();
    }
  });

  it("Photo/File/Propose meetup rows still render even when the offer row is hidden", () => {
    render(<ComposerActionsSheet {...baseProps({ canMakeOffer: false })} />);
    expect(screen.getByTestId("composer-action-photo")).toBeTruthy();
    expect(screen.getByTestId("composer-action-file")).toBeTruthy();
    expect(screen.getByTestId("composer-action-meetup")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-offer")).toBeNull();
  });
});

// ── 3. iOS black-screen guard — onClose fires BEFORE the handler ────────────

describe("ComposerActionsSheet — closes before invoking a handler (iOS black-screen guard)", () => {
  it("Photo row: onClose() then onPhoto()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onPhoto = jest.fn(() => callOrder.push("photo"));
    render(<ComposerActionsSheet {...baseProps({ onClose, onPhoto })} />);

    fireEvent.press(screen.getByTestId("composer-action-photo"));

    expect(callOrder).toEqual(["close", "photo"]);
  });

  it("File row: onClose() then onFile()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onFile = jest.fn(() => callOrder.push("file"));
    render(<ComposerActionsSheet {...baseProps({ onClose, onFile })} />);

    fireEvent.press(screen.getByTestId("composer-action-file"));

    expect(callOrder).toEqual(["close", "file"]);
  });

  it("Propose meetup row: onClose() then onProposeMeetup()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onProposeMeetup = jest.fn(() => callOrder.push("meetup"));
    render(<ComposerActionsSheet {...baseProps({ onClose, onProposeMeetup })} />);

    fireEvent.press(screen.getByTestId("composer-action-meetup"));

    expect(callOrder).toEqual(["close", "meetup"]);
  });

  it("Make an offer row: onClose() then onMakeOffer()", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onMakeOffer = jest.fn(() => callOrder.push("offer"));
    render(<ComposerActionsSheet {...baseProps({ onClose, onMakeOffer, canMakeOffer: true })} />);

    fireEvent.press(screen.getByTestId("composer-action-offer"));

    expect(callOrder).toEqual(["close", "offer"]);
  });
});

// ── 4. Backdrop ──────────────────────────────────────────────────────────────

describe("ComposerActionsSheet — backdrop", () => {
  it("tapping the backdrop calls onClose and no other handler", () => {
    const onClose = jest.fn();
    const onPhoto = jest.fn();
    const onFile = jest.fn();
    const onProposeMeetup = jest.fn();
    const onMakeOffer = jest.fn();
    render(
      <ComposerActionsSheet
        {...baseProps({ onClose, onPhoto, onFile, onProposeMeetup, onMakeOffer })}
      />
    );

    fireEvent.press(screen.getByTestId("composer-actions-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPhoto).not.toHaveBeenCalled();
    expect(onFile).not.toHaveBeenCalled();
    expect(onProposeMeetup).not.toHaveBeenCalled();
    expect(onMakeOffer).not.toHaveBeenCalled();
  });
});

// ── 5. Disabled while an upload is in flight ─────────────────────────────────

describe("ComposerActionsSheet — disabled while a photo/file upload is in flight", () => {
  it("does not call onPhoto when the Photo row is pressed while disabled", () => {
    const onPhoto = jest.fn();
    const onClose = jest.fn();
    render(<ComposerActionsSheet {...baseProps({ onPhoto, onClose, disabled: true })} />);

    fireEvent.press(screen.getByTestId("composer-action-photo"));

    expect(onPhoto).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onFile when the File row is pressed while disabled", () => {
    const onFile = jest.fn();
    render(<ComposerActionsSheet {...baseProps({ onFile, disabled: true })} />);

    fireEvent.press(screen.getByTestId("composer-action-file"));

    expect(onFile).not.toHaveBeenCalled();
  });

  it("does not call onMakeOffer when the offer row is pressed while disabled", () => {
    const onMakeOffer = jest.fn();
    render(<ComposerActionsSheet {...baseProps({ onMakeOffer, disabled: true, canMakeOffer: true })} />);

    fireEvent.press(screen.getByTestId("composer-action-offer"));

    expect(onMakeOffer).not.toHaveBeenCalled();
  });
});

// ── 6. RTL ────────────────────────────────────────────────────────────────────

describe("ComposerActionsSheet — RTL", () => {
  it("renders without throwing when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() => render(<ComposerActionsSheet {...baseProps()} />)).not.toThrow();
  });

  it("flips the row flexDirection to row-reverse when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    render(<ComposerActionsSheet {...baseProps()} />);
    const row = screen.getByTestId("composer-action-photo");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.flexDirection).toBe("row-reverse");
  });

  it("uses row (not row-reverse) when isRtl=false (default)", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    const row = screen.getByTestId("composer-action-photo");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.flexDirection).toBe("row");
  });
});
