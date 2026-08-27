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
 *  7. (TASK-K729 review fix) `offerUnavailableReason` — the offer row still
 *     renders when hidden specifically for reserved/sold, disabled, with the
 *     reason as a subline, instead of a silent gap.
 *  8. (SF-M2) "Place a hold for {{name}}" / "Release hold" rows.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Calendar: "Calendar",
  ImageIcon: "ImageIcon",
  Paperclip: "Paperclip",
  Tag: "Tag",
  // SF-M2 — "Place a hold" / "Release hold" row icons.
  Lock: "Lock",
  LockOpen: "LockOpen",
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// The GLOBAL react-i18next mock (src/__tests__/setup.ts) is `t: (key) => key`
// — it drops the `options` argument entirely, so it can never surface WHETHER
// `wrapBidiIsolate(placeHoldRow.buyerName)` actually reached the label the
// seller sees ("Place a hold for Ahmad" needs an isolated name so a mixed-
// script buyer name never reorders inside a Pashto/Dari sentence, see
// `reserveAfterAccept.ts`'s own header for why). Overridden HERE (this file
// only, not globally) to interpolate options into the returned string —
// every OTHER call in this component passes no options at all, so this is a
// no-op for them (falls through to the bare key, exactly like the global
// mock) and only changes behaviour for the one row that actually needs it.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${JSON.stringify(options)}` : key,
    // `Text` (src/components/reusables/text.tsx) reads `i18n.language` on
    // every render to pick a font — matches the shape the global mock
    // (src/__tests__/setup.ts) provides, just not dropped here too.
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

// Import AFTER mocks
import { ComposerActionsSheet } from "../ComposerActionsSheet";
// TASK-K729 (review fix, MEDIUM): the REAL predicates Conversation.tsx
// imports — this file used to re-declare `canOfferInThread` locally, which
// is how the original K729 bug (its matrix once asserted reserved -> true)
// stayed green. See threadAvailability.test.ts for the dedicated matrix.
import { canOfferInThread, offerUnavailableStatus } from "../threadAvailability";

// ── Fixture helpers ──────────────────────────────────────────────────────────

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

// ── 7. TASK-K729 review fix — offerUnavailableReason disabled row ───────────

describe("ComposerActionsSheet — offerUnavailableReason (TASK-K729 review fix)", () => {
  it("renders the offer row disabled with the reason subline when canMakeOffer=false and a reason is given", () => {
    render(
      <ComposerActionsSheet
        {...baseProps({ canMakeOffer: false, offerUnavailableReason: "Item reserved" })}
      />
    );
    expect(screen.getByTestId("composer-action-offer-disabled")).toBeTruthy();
    expect(screen.getByText("chat.offer.makeOffer")).toBeTruthy();
    expect(screen.getByText("Item reserved")).toBeTruthy();
  });

  it("does NOT call onMakeOffer or onClose when the disabled reason row is pressed", () => {
    const onMakeOffer = jest.fn();
    const onClose = jest.fn();
    render(
      <ComposerActionsSheet
        {...baseProps({
          canMakeOffer: false,
          offerUnavailableReason: "Item sold",
          onMakeOffer,
          onClose,
        })}
      />
    );
    fireEvent.press(screen.getByTestId("composer-action-offer-disabled"));
    expect(onMakeOffer).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does NOT render any offer row at all when canMakeOffer=false and no reason is given (every other hidden reason)", () => {
    render(<ComposerActionsSheet {...baseProps({ canMakeOffer: false })} />);
    expect(screen.queryByTestId("composer-action-offer")).toBeNull();
    expect(screen.queryByTestId("composer-action-offer-disabled")).toBeNull();
  });

  it("renders the normal, enabled offer row (not the disabled one) when canMakeOffer=true, even if a reason is somehow passed", () => {
    render(
      <ComposerActionsSheet
        {...baseProps({ canMakeOffer: true, offerUnavailableReason: "Item reserved" })}
      />
    );
    expect(screen.getByTestId("composer-action-offer")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-offer-disabled")).toBeNull();
  });

  it("marks the disabled reason row with accessibilityState.disabled", () => {
    render(
      <ComposerActionsSheet
        {...baseProps({ canMakeOffer: false, offerUnavailableReason: "Item reserved" })}
      />
    );
    const row = screen.getByTestId("composer-action-offer-disabled");
    expect(row.props.accessibilityState).toEqual({ disabled: true });
  });

  it("wires the real offerUnavailableStatus/canOfferInThread matrix end-to-end for a reserved listing", () => {
    const listing = { status: "reserved" };
    const canMakeOffer = canOfferInThread({ canSend: true, listing });
    const status = offerUnavailableStatus({ canSend: true, listing });

    expect(canMakeOffer).toBe(false);
    expect(status).toBe("reserved");

    render(<ComposerActionsSheet {...baseProps({ canMakeOffer, offerUnavailableReason: "Item reserved" })} />);
    expect(screen.getByTestId("composer-action-offer-disabled")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-offer")).toBeNull();
  });

  // ── TASK-K729 (review fix, MEDIUM — dark/light contrast) ───────────────────
  // Row-level `opacity: 0.5` used to dim `subLabel` (the reason text) too,
  // compositing to 1.96:1 in light mode / 2.65:1 in dark — the least legible
  // text in the sheet, exactly where the buyer goes looking for the missing
  // offer button. Opacity now only ever applies for the `disabled` prop (an
  // upload in flight); the reason row dims its icon/label instead and leaves
  // the reason subline at full opacity.
  it("does NOT apply row-level opacity to the disabled reason row (keeps the reason subline fully legible)", () => {
    render(
      <ComposerActionsSheet
        {...baseProps({ canMakeOffer: false, offerUnavailableReason: "Item reserved" })}
      />
    );
    const row = screen.getByTestId("composer-action-offer-disabled");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.opacity).toBe(1);
  });

  it("dims the disabled reason row's LABEL (not the reason subline) to colors.mutedForeground as the affordance cue", () => {
    render(
      <ComposerActionsSheet
        {...baseProps({ canMakeOffer: false, offerUnavailableReason: "Item reserved" })}
      />
    );
    const label = screen.getByText("chat.offer.makeOffer");
    const labelStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.flat(Infinity).filter(Boolean))
      : label.props.style;
    const reason = screen.getByText("Item reserved");
    const reasonStyle = Array.isArray(reason.props.style)
      ? Object.assign({}, ...reason.props.style.flat(Infinity).filter(Boolean))
      : reason.props.style;

    // Light mode (default test environment) literal token values from useColors().
    expect(labelStyle.color).toBe("hsl(215,16%,47%)"); // colors.mutedForeground
    expect(reasonStyle.color).toBe("hsl(215,16%,47%)"); // colors.mutedForeground (unchanged)
  });

  it("still renders a NORMAL row's label in colors.foreground (not dimmed)", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    const label = screen.getByText("chat.attachPhoto");
    const labelStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.flat(Infinity).filter(Boolean))
      : label.props.style;
    expect(labelStyle.color).toBe("hsl(222,47%,11%)"); // colors.foreground (light mode)
  });

  it("still dims every row via row-level opacity while an upload is in flight (`disabled` prop)", () => {
    render(<ComposerActionsSheet {...baseProps({ disabled: true })} />);
    const row = screen.getByTestId("composer-action-photo");
    const flattenedStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style.flat(Infinity).filter(Boolean))
      : row.props.style;
    expect(flattenedStyle.opacity).toBe(0.5);
  });
});

// ── SF-M2: "Place a hold" / "Release hold" (Sell Flow Redesign) ────────────────

describe("ComposerActionsSheet — Place a hold / Release hold (SF-M2)", () => {
  it("renders no hold row at all by default (buyer/non-owner threads, sold/draft listings)", () => {
    render(<ComposerActionsSheet {...baseProps()} />);
    expect(screen.queryByTestId("composer-action-place-hold")).toBeNull();
    expect(screen.queryByTestId("composer-action-release-hold")).toBeNull();
  });

  it("renders 'Place a hold for {{name}}' when placeHoldRow is given", () => {
    render(<ComposerActionsSheet {...baseProps({ placeHoldRow: { buyerName: "Ahmad", onPress: jest.fn() } })} />);
    expect(screen.getByTestId("composer-action-place-hold")).toBeTruthy();
    expect(screen.getByText('chat.listingActions.placeHold|{"name":"⁦Ahmad⁩"}')).toBeTruthy();
    expect(screen.queryByTestId("composer-action-release-hold")).toBeNull();
  });

  it("renders 'Release hold' when releaseHoldRow is given", () => {
    render(<ComposerActionsSheet {...baseProps({ releaseHoldRow: { onPress: jest.fn() } })} />);
    expect(screen.getByTestId("composer-action-release-hold")).toBeTruthy();
    expect(screen.getByText("chat.listingActions.releaseHold")).toBeTruthy();
    expect(screen.queryByTestId("composer-action-place-hold")).toBeNull();
  });

  it("closes the sheet BEFORE invoking the place-hold handler (iOS black-screen guard)", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onPress = jest.fn(() => callOrder.push("place-hold"));
    render(<ComposerActionsSheet {...baseProps({ onClose, placeHoldRow: { buyerName: "Ahmad", onPress } })} />);

    fireEvent.press(screen.getByTestId("composer-action-place-hold"));
    expect(callOrder).toEqual(["close", "place-hold"]);
  });

  it("closes the sheet BEFORE invoking the release-hold handler (iOS black-screen guard)", () => {
    const callOrder: string[] = [];
    const onClose = jest.fn(() => callOrder.push("close"));
    const onPress = jest.fn(() => callOrder.push("release-hold"));
    render(<ComposerActionsSheet {...baseProps({ onClose, releaseHoldRow: { onPress } })} />);

    fireEvent.press(screen.getByTestId("composer-action-release-hold"));
    expect(callOrder).toEqual(["close", "release-hold"]);
  });

  it("does not call the place-hold handler when the row is pressed while disabled", () => {
    const onPress = jest.fn();
    render(<ComposerActionsSheet {...baseProps({ disabled: true, placeHoldRow: { buyerName: "Ahmad", onPress } })} />);
    fireEvent.press(screen.getByTestId("composer-action-place-hold"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
