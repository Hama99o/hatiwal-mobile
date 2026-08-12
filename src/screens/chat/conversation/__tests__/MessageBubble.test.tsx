/**
 * MessageBubble — Jest unit tests for all bubble types.
 *
 * Covers:
 *  1. text bubble renders body text
 *  2. system bubble renders centered text
 *  3. document bubble renders filename and "Tap to open" label
 *  4. image_message bubble renders inline (via expo-image Image mock)
 *  5. image_message bubble shows placeholder when attachmentUrl is null
 *  6. image_message bubble is tappable (min 44px touch target via accessibilityRole)
 *  7. meetup_accepted / meetup_declined / offer_accepted / offer_declined return null (no bubble)
 *  8. isMine vs theirs alignment via accessibilityLabel on fullscreen viewer
 *  9. TASK-O947 review fixes: OutcomeBadge dedup/semantics (offer uses
 *     Tag/X, never the meetup Calendar icons), the accept/decline pending
 *     spinner, and Accept/Decline/Counter accessibility role + label.
 */

import React from "react";
import { ActivityIndicator } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// expo-image is mocked globally in setup.ts as { Image: "Image" }.
// That string tag is sufficient — RNTL renders it as a component so we
// can query it via UNSAFE_getAllByType or by checking source prop directly.

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock("lucide-react-native", () => ({
  MapPin:          "MapPin",
  Clock:           "Clock",
  Check:           "Check",
  Tag:             "Tag",
  ExternalLink:    "ExternalLink",
  FileText:        "FileText",
  CalendarCheck:   "CalendarCheck",
  CalendarX:       "CalendarX",
  // TASK-O947 review fix (icon semantics) — the offer OutcomeBadge now uses
  // an outcome-encoding pair instead of reusing the bubble's own `Tag`
  // header icon (which carried no success semantics) / the generic `X`.
  CheckCircle2:    "CheckCircle2",
  XCircle:         "XCircle",
  Camera:          "Camera",
  X:               "X",
  ImageIcon:       "ImageIcon",
  ArrowLeftRight:  "ArrowLeftRight",
  Trash2:          "Trash2",
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background:          "#fff",
    foreground:          "#000",
    card:                "#fff",
    border:              "#e5e7eb",
    muted:               "#f3f4f6",
    mutedForeground:     "#6b7280",
    primary:             "#3b82f6",
    primaryForeground:   "#fff",
    secondary:           "#f3f4f6",
    primaryAlpha:        "rgba(59,130,246,0.12)",
    destructive:         "#ef4444",
    destructiveForeground: "#fff",
    destructiveAlpha:    "rgba(239,68,68,0.12)",
    success:             "#22c55e",
    successForeground:   "#fff",
    successAlpha:        "rgba(34,197,94,0.12)",
    warning:             "#f59e0b",
    warningForeground:   "#fff",
    warningAlpha:        "rgba(245,158,11,0.12)",
    shadow:              "#000",
    darkScrim:           "rgba(0,0,0,0.45)",
    darkScrimHeavy:      "rgba(0,0,0,0.85)",
    overlayForeground:   "#fff",
    overlayButtonBg:     "rgba(255,255,255,0.15)",
    photoViewerBg:       "#000",
  }),
}));

jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: () => ({
    isRtl:          false,
    formatTime:     () => "10:00",
    formatCurrency: (v: number) => String(v),
  }),
}));

jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("sonner-native", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import type { Message } from "@/api/conversations";

const now = "2026-01-01T10:00:00Z";

function makeMsg(overrides: Partial<Message>): Message {
  return {
    id: 1,
    body: "Hello",
    kind: "text",
    readAt: null,
    createdAt: now,
    sender: { id: 1, name: "Ahmad" },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

import { MessageBubble } from "../MessageBubble";

describe("MessageBubble — text", () => {
  it("renders the message body in a text bubble", () => {
    render(
      <MessageBubble
        message={makeMsg({ body: "Is this still available?" })}
        isMine={false}
      />
    );
    expect(screen.getByText("Is this still available?")).toBeTruthy();
  });

  it("renders mine bubble (right-aligned) without crashing", () => {
    render(
      <MessageBubble
        message={makeMsg({ body: "Yes, come by tomorrow." })}
        isMine={true}
      />
    );
    expect(screen.getByText("Yes, come by tomorrow.")).toBeTruthy();
  });
});

describe("MessageBubble — system", () => {
  it("renders system message body centered", () => {
    render(
      <MessageBubble
        message={makeMsg({ kind: "system", body: "Conversation started" })}
        isMine={false}
      />
    );
    expect(screen.getByText("Conversation started")).toBeTruthy();
  });
});

describe("MessageBubble — document", () => {
  it("renders filename and tap hint for a document message", () => {
    render(
      <MessageBubble
        message={makeMsg({ kind: "document", body: "receipt.pdf", attachmentUrl: "https://cdn.example.com/receipt.pdf" })}
        isMine={false}
      />
    );
    expect(screen.getByText("receipt.pdf")).toBeTruthy();
    expect(screen.getByText("chat.document.tap")).toBeTruthy();
  });
});

describe("MessageBubble — image_message", () => {
  it("does NOT show the loading placeholder when attachmentUrl is provided", () => {
    render(
      <MessageBubble
        message={makeMsg({
          kind: "image_message",
          body: "photo.jpg",
          attachmentUrl: "https://cdn.example.com/photo.jpg",
        })}
        isMine={false}
      />
    );
    // The loading placeholder text must be absent — we have a real URL
    expect(screen.queryByText("chat.photo.loading")).toBeNull();
  });

  it("passes the attachment URL to expo-image as the source prop", () => {
    const { UNSAFE_getAllByType } = render(
      <MessageBubble
        message={makeMsg({
          kind: "image_message",
          body: "photo.jpg",
          attachmentUrl: "https://cdn.example.com/chat_photo.jpg",
        })}
        isMine={false}
      />
    );
    // Global setup mocks expo-image as { Image: "Image" } (string tag).
    // UNSAFE_getAllByType finds all elements with that tag.
    const images = UNSAFE_getAllByType("Image" as any);
    expect(images.length).toBeGreaterThan(0);
    // The source prop on the first (inline) Image must carry the attachment URL.
    const inlineImage = images[0];
    expect(inlineImage.props.source?.uri).toBe("https://cdn.example.com/chat_photo.jpg");
  });

  it("shows the loading placeholder when attachmentUrl is null", () => {
    render(
      <MessageBubble
        message={makeMsg({ kind: "image_message", body: "photo.jpg", attachmentUrl: null })}
        isMine={false}
      />
    );
    expect(screen.getByText("chat.photo.loading")).toBeTruthy();
  });

  it("has a touch target with imagebutton accessibilityRole", () => {
    render(
      <MessageBubble
        message={makeMsg({
          kind: "image_message",
          body: "photo.jpg",
          attachmentUrl: "https://cdn.example.com/photo.jpg",
        })}
        isMine={true}
      />
    );
    const btn = screen.getByRole("imagebutton");
    expect(btn).toBeTruthy();
  });

  it("renders the fullscreen viewer Modal when the bubble is tapped", () => {
    render(
      <MessageBubble
        message={makeMsg({
          kind: "image_message",
          body: "photo.jpg",
          attachmentUrl: "https://cdn.example.com/photo.jpg",
        })}
        isMine={false}
      />
    );
    const btn = screen.getByRole("imagebutton");
    fireEvent.press(btn);
    // After tap the close button for the fullscreen viewer should appear.
    // t("common.close") returns the key "common.close" in the test mock.
    expect(screen.getByLabelText("common.close")).toBeTruthy();
  });
});

describe("MessageBubble — response kinds (render null)", () => {
  const responseKinds: Message["kind"][] = [
    "meetup_accepted",
    "meetup_declined",
    "offer_accepted",
    "offer_declined",
  ];

  responseKinds.forEach((kind) => {
    it(`returns null for kind:${kind}`, () => {
      const { toJSON } = render(
        <MessageBubble message={makeMsg({ kind })} isMine={false} />
      );
      expect(toJSON()).toBeNull();
    });
  });
});

describe("MessageBubble — offer_counter (TASK-O829)", () => {
  const counterMsg = makeMsg({
    kind: "offer_counter",
    body: "9500|AFN|10000",
    offerAmount: 9500,
    offerCurrency: "AFN",
    sender: { id: 2, name: "Seller" },
  });

  it("renders the counter amount from offerAmount field", () => {
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
      />
    );
    // formatCurrency mock returns the raw number as a string
    expect(screen.getByText("9500")).toBeTruthy();
  });

  it("renders the counter label key", () => {
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
      />
    );
    // t() returns the key in tests
    expect(screen.getByText("chat.offer.counteredAt")).toBeTruthy();
  });

  it("shows Accept and Decline buttons when buyer receives counter (not isMine, onOfferRespond provided)", () => {
    const onRespond = jest.fn();
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        onOfferRespond={onRespond}
      />
    );
    expect(screen.getByText("chat.offer.accept")).toBeTruthy();
    expect(screen.getByText("chat.offer.decline")).toBeTruthy();
  });

  it("does NOT show Accept/Decline when seller views their own counter (isMine=true)", () => {
    render(
      <MessageBubble
        message={counterMsg}
        isMine={true}
      />
    );
    expect(screen.queryByText("chat.offer.accept")).toBeNull();
    expect(screen.queryByText("chat.offer.decline")).toBeNull();
  });

  it("shows the accepted outcome badge when offerOutcome is accepted", () => {
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        offerOutcome="accepted"
      />
    );
    expect(screen.getByText("chat.offer.accepted")).toBeTruthy();
  });

  it("shows the declined outcome badge when offerOutcome is declined", () => {
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        offerOutcome="declined"
      />
    );
    expect(screen.getByText("chat.offer.declined")).toBeTruthy();
  });

  it("calls onOfferRespond(true) when Accept is tapped", () => {
    const onRespond = jest.fn();
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        onOfferRespond={onRespond}
      />
    );
    fireEvent.press(screen.getByText("chat.offer.accept"));
    expect(onRespond).toHaveBeenCalledWith(true);
  });

  it("calls onOfferRespond(false) when Decline is tapped", () => {
    const onRespond = jest.fn();
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        onOfferRespond={onRespond}
      />
    );
    fireEvent.press(screen.getByText("chat.offer.decline"));
    expect(onRespond).toHaveBeenCalledWith(false);
  });
});

// ── TASK-M913: deleted message tombstone ──────────────────────────────────────
describe("MessageBubble — deleted tombstone (TASK-M913)", () => {
  it("renders tombstone text when message.deleted is true (mine)", () => {
    render(
      <MessageBubble
        message={makeMsg({ body: null, deleted: true })}
        isMine={true}
      />
    );
    expect(screen.getByText("chat.message.deleted")).toBeTruthy();
  });

  it("renders tombstone text when message.deleted is true (theirs)", () => {
    render(
      <MessageBubble
        message={makeMsg({ body: null, deleted: true })}
        isMine={false}
      />
    );
    expect(screen.getByText("chat.message.deleted")).toBeTruthy();
  });

  it("does NOT show original body when message is deleted", () => {
    render(
      <MessageBubble
        message={makeMsg({ body: null, deleted: true })}
        isMine={false}
      />
    );
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("does NOT render an onDeleteMessage modal for a deleted message", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({ body: null, deleted: true })}
        isMine={true}
        onDeleteMessage={onDelete}
      />
    );
    // Tombstone — no delete action available
    expect(screen.queryByText("chat.message.deleteAction")).toBeNull();
  });
});

describe("MessageBubble — delete action (TASK-M913)", () => {
  it("does NOT expose delete affordance when isMine is false", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({ body: "Hello" })}
        isMine={false}
        onDeleteMessage={onDelete}
      />
    );
    // Not mine — no long-press menu
    expect(screen.queryByText("chat.message.deleteAction")).toBeNull();
  });

  it("shows delete action sheet when isMine=true and onDeleteMessage is provided (long press)", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({ body: "Hello" })}
        isMine={true}
        onDeleteMessage={onDelete}
      />
    );
    // Find the Pressable by testID and long-press it
    const longPressable = screen.getByTestId("message-bubble-pressable");
    fireEvent(longPressable, "longPress");
    // After long press, the delete action label should be visible in the modal
    expect(screen.getByText("chat.message.deleteAction")).toBeTruthy();
  });

  // TASK-M913 review fix: document and image_message bubbles must also wire
  // long-press delete — it was previously text-only.
  it("shows the delete action sheet from a long press on a document bubble (own message)", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({
          kind: "document",
          body: "receipt.pdf",
          attachmentUrl: "https://cdn.example.com/receipt.pdf",
        })}
        isMine={true}
        onDeleteMessage={onDelete}
      />
    );
    const longPressable = screen.getByTestId("message-bubble-document-pressable");
    fireEvent(longPressable, "longPress");
    expect(screen.getByText("chat.message.deleteAction")).toBeTruthy();
  });

  it("shows the delete action sheet from a long press on an image_message bubble (own message)", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({
          kind: "image_message",
          body: null,
          attachmentUrl: "https://cdn.example.com/photo.jpg",
        })}
        isMine={true}
        onDeleteMessage={onDelete}
      />
    );
    const longPressable = screen.getByRole("imagebutton");
    fireEvent(longPressable, "longPress");
    expect(screen.getByText("chat.message.deleteAction")).toBeTruthy();
  });

  it("does NOT show a delete action sheet from a document/image long press when isMine is false", () => {
    const onDelete = jest.fn();
    render(
      <MessageBubble
        message={makeMsg({
          kind: "document",
          body: "receipt.pdf",
          attachmentUrl: "https://cdn.example.com/receipt.pdf",
        })}
        isMine={false}
        onDeleteMessage={onDelete}
      />
    );
    const longPressable = screen.getByTestId("message-bubble-document-pressable");
    fireEvent(longPressable, "longPress");
    expect(screen.queryByText("chat.message.deleteAction")).toBeNull();
  });
});

// ── TASK-M263: meetup proposal with a precise map pin ─────────────────────────
describe("MessageBubble — meetup_proposal with precise coords (TASK-M263)", () => {
  it("renders place and time for a legacy 2-part body", () => {
    render(
      <MessageBubble
        message={makeMsg({ kind: "meetup_proposal", body: "Kabul City Center | Fri 3pm" })}
        isMine={false}
      />
    );
    expect(screen.getByText("Kabul City Center")).toBeTruthy();
    expect(screen.getByText("Fri 3pm")).toBeTruthy();
  });

  it("does NOT show the precise-pin badge for a legacy 2-part body", () => {
    render(
      <MessageBubble
        message={makeMsg({ kind: "meetup_proposal", body: "Kabul City Center | Fri 3pm" })}
        isMine={false}
      />
    );
    expect(screen.queryByTestId("meetup-precise-pin-badge")).toBeNull();
  });

  it("shows the precise-pin badge when a 3-part body with valid coords is present", () => {
    render(
      <MessageBubble
        message={makeMsg({
          kind: "meetup_proposal",
          body: "Kabul City Center | Fri 3pm | 34.5553,69.2075",
        })}
        isMine={false}
      />
    );
    expect(screen.getByTestId("meetup-precise-pin-badge")).toBeTruthy();
  });

  it("does NOT show the precise-pin badge when the 3rd segment is malformed", () => {
    render(
      <MessageBubble
        message={makeMsg({
          kind: "meetup_proposal",
          body: "Kabul City Center | Fri 3pm | not-a-coordinate",
        })}
        isMine={false}
      />
    );
    expect(screen.queryByTestId("meetup-precise-pin-badge")).toBeNull();
  });

  it("opens maps with a coordinate URL when a precise pin is attached", () => {
    const { Linking } = require("react-native");
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    render(
      <MessageBubble
        message={makeMsg({
          kind: "meetup_proposal",
          body: "Kabul City Center | Fri 3pm | 34.5553,69.2075",
        })}
        isMine={false}
      />
    );

    fireEvent.press(screen.getByLabelText("chat.meetup.openInMaps"));

    expect(openURLSpy).toHaveBeenCalled();
    const calledUrl = openURLSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("34.5553,69.2075");

    openURLSpy.mockRestore();
  });

  it("falls back to a fuzzy text-query URL for a legacy 2-part body (no coords)", () => {
    const { Linking } = require("react-native");
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    render(
      <MessageBubble
        message={makeMsg({ kind: "meetup_proposal", body: "Kabul City Center | Fri 3pm" })}
        isMine={false}
      />
    );

    fireEvent.press(screen.getByLabelText("chat.meetup.openInMaps"));

    expect(openURLSpy).toHaveBeenCalled();
    const calledUrl = openURLSpy.mock.calls[0][0] as string;
    // No coordinates known — must fall back to a text search containing the place name.
    expect(calledUrl).toContain(encodeURIComponent("Kabul City Center"));
    expect(calledUrl).not.toContain("34.5553");

    openURLSpy.mockRestore();
  });
});

// Review fix (LOW-MEDIUM, DUPLICATION + A11Y GAP) — the meetup Accept/Decline
// row now shares `ActionPairRow` with the offer row, so it gets the same
// accessibilityRole/Label/State, `disabled`, and `pending` machinery the
// offer row already had (TASK-O947) instead of drifting further from it.
describe("MessageBubble — meetup accept/decline a11y + disabled/pending (review fix)", () => {
  const meetupMsg = makeMsg({ kind: "meetup_proposal", body: "Shahr-e-Naw|Tomorrow 3pm" });

  it("gives Accept and Decline an accessibilityRole + label", () => {
    render(<MessageBubble message={meetupMsg} isMine={false} onMeetupRespond={jest.fn()} />);
    const accept = screen.getByLabelText("chat.meetup.accept");
    const decline = screen.getByLabelText("chat.meetup.decline");
    expect(accept.props.accessibilityRole).toBe("button");
    expect(decline.props.accessibilityRole).toBe("button");
  });

  it("reflects disabled + busy via accessibilityState when a response is in flight", () => {
    render(
      <MessageBubble
        message={meetupMsg}
        isMine={false}
        onMeetupRespond={jest.fn()}
        meetupActionsDisabled
        meetupResponsePending="accept"
      />
    );
    const accept = screen.getByLabelText("chat.meetup.accept");
    const decline = screen.getByLabelText("chat.meetup.decline");
    expect(accept.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(decline.props.accessibilityState).toEqual({ disabled: true, busy: false });
  });

  it("swaps the Accept label for a spinner when meetupResponsePending is 'accept'", () => {
    render(
      <MessageBubble
        message={meetupMsg}
        isMine={false}
        onMeetupRespond={jest.fn()}
        meetupActionsDisabled
        meetupResponsePending="accept"
      />
    );
    expect(screen.queryByText("chat.meetup.accept")).toBeNull();
    expect(screen.getByText("chat.meetup.decline")).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it("does not disable Accept/Decline when a DIFFERENT proposal in the thread is pending", () => {
    render(
      <MessageBubble message={meetupMsg} isMine={false} onMeetupRespond={jest.fn()} meetupActionsDisabled={false} />
    );
    expect(screen.getByText("chat.meetup.accept")).toBeTruthy();
    expect(screen.getByText("chat.meetup.decline")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator).length).toBe(0);
  });
});

describe("MessageBubble — offer with Counter button (TASK-O829)", () => {
  const offerMsg = makeMsg({
    kind: "offer",
    body: "8000|AFN|10000",
    offerAmount: 8000,
    offerCurrency: "AFN",
    sender: { id: 1, name: "Buyer" },
  });

  it("shows Counter button when seller receives offer and onOfferCounter is provided", () => {
    const onCounter = jest.fn();
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={onCounter}
      />
    );
    expect(screen.getByText("chat.offer.counter")).toBeTruthy();
  });

  it("calls onOfferCounter when Counter is tapped", () => {
    const onCounter = jest.fn();
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={onCounter}
      />
    );
    fireEvent.press(screen.getByText("chat.offer.counter"));
    expect(onCounter).toHaveBeenCalledTimes(1);
  });

  it("does NOT show Counter button when onOfferCounter is not provided", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
      />
    );
    expect(screen.queryByText("chat.offer.counter")).toBeNull();
  });
});

// ── TASK-C381 review fix (DR MUST): "countered"/superseded muted chip ────────

describe("MessageBubble — offerOutcome='countered' renders a muted chip, not a silent gap", () => {
  const offerMsg = makeMsg({
    kind: "offer",
    body: "8000|AFN|10000",
    offerAmount: 8000,
    offerCurrency: "AFN",
    sender: { id: 1, name: "Buyer" },
  });

  const counterMsg = makeMsg({
    kind: "offer_counter",
    body: "9500|AFN|10000",
    offerAmount: 9500,
    offerCurrency: "AFN",
    sender: { id: 2, name: "Seller" },
  });

  it("shows the muted 'no longer active' chip on a superseded ORIGINAL offer", () => {
    render(<MessageBubble message={offerMsg} isMine={false} offerOutcome="countered" />);
    expect(screen.getByText("chat.offer.noLongerActive")).toBeTruthy();
  });

  it("shows the muted chip on a superseded COUNTER (further countered-back)", () => {
    render(<MessageBubble message={counterMsg} isMine={false} offerOutcome="countered" />);
    expect(screen.getByText("chat.offer.noLongerActive")).toBeTruthy();
  });

  it("does NOT show Accept/Decline/Counter alongside the muted chip", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        offerOutcome="countered"
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
      />
    );
    expect(screen.queryByText("chat.offer.accept")).toBeNull();
    expect(screen.queryByText("chat.offer.decline")).toBeNull();
    expect(screen.queryByLabelText("chat.offer.counterBack")).toBeNull();
  });

  it("does NOT show the accepted/declined pill alongside the muted chip", () => {
    render(<MessageBubble message={offerMsg} isMine={false} offerOutcome="countered" />);
    expect(screen.queryByText("chat.offer.accepted")).toBeNull();
    expect(screen.queryByText("chat.offer.declined")).toBeNull();
  });

  it("renders on the sender's own bubble too (isMine=true) — a countered offer is inert for both sides", () => {
    render(<MessageBubble message={offerMsg} isMine={true} offerOutcome="countered" />);
    expect(screen.getByText("chat.offer.noLongerActive")).toBeTruthy();
  });
});

// ── TASK-O947 review fixes ────────────────────────────────────────────────────

describe("MessageBubble — offer outcome badge dedup + semantics (TASK-O947)", () => {
  const offerMsg = makeMsg({
    kind: "offer",
    body: "8000|AFN|10000",
    offerAmount: 8000,
    offerCurrency: "AFN",
    sender: { id: 1, name: "Buyer" },
  });

  // Review fix (LOW-MEDIUM, ICON SEMANTICS) — `Tag` used to be reused for
  // "accepted" too, but it's ALSO the bubble's own always-on header icon
  // (the "PRICE OFFER" label just above), so it carried no success
  // semantics of its own and the accepted/declined pair was asymmetric
  // (subject-encoding vs outcome-encoding). `CheckCircle2`/`XCircle` is an
  // outcome-encoding pair, distinct from both the header's `Tag` and the
  // meetup pill's `CalendarCheck`/`CalendarX`.
  it("uses the CheckCircle2 icon (not the meetup CalendarCheck icon) for an accepted offer", () => {
    render(<MessageBubble message={offerMsg} isMine={false} offerOutcome="accepted" />);
    expect(screen.getByText("chat.offer.accepted")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType("CheckCircle2" as any).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByType("CalendarCheck" as any).length).toBe(0);
  });

  it("uses the XCircle icon (not the meetup CalendarX icon) for a declined offer", () => {
    render(<MessageBubble message={offerMsg} isMine={false} offerOutcome="declined" />);
    expect(screen.getByText("chat.offer.declined")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType("XCircle" as any).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByType("CalendarX" as any).length).toBe(0);
  });

  it("still uses CalendarCheck/CalendarX for a meetup outcome (distinct vocabulary from offers)", () => {
    const meetupMsg = makeMsg({ kind: "meetup_proposal", body: "Shahr-e-Naw|Tomorrow 3pm" });
    render(<MessageBubble message={meetupMsg} isMine={false} meetupOutcome="accepted" />);
    expect(screen.getByText("chat.meetup.accepted")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType("CalendarCheck" as any).length).toBeGreaterThan(0);
  });
});

describe("MessageBubble — offer accept/decline pending spinner (TASK-O947, MEDIUM/STATES)", () => {
  const offerMsg = makeMsg({
    kind: "offer",
    body: "8000|AFN|10000",
    offerAmount: 8000,
    offerCurrency: "AFN",
    sender: { id: 1, name: "Buyer" },
  });

  it("swaps the Accept label for a spinner when offerResponsePending is 'accept'", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
        offerResponsePending="accept"
      />
    );
    expect(screen.queryByText("chat.offer.accept")).toBeNull();
    expect(screen.getByText("chat.offer.decline")).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it("swaps the Decline label for a spinner when offerResponsePending is 'decline'", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
        offerResponsePending="decline"
      />
    );
    expect(screen.getByText("chat.offer.accept")).toBeTruthy();
    expect(screen.queryByText("chat.offer.decline")).toBeNull();
    expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it("shows both labels (no spinner) when nothing is pending, even if globally disabled", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
      />
    );
    expect(screen.getByText("chat.offer.accept")).toBeTruthy();
    expect(screen.getByText("chat.offer.decline")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator).length).toBe(0);
  });

  // Review fix (SHOULD-FIX, STATES) — dimming the WHOLE row (including the
  // pending button's own spinner) re-created the exact ambiguity the
  // pending spinner was meant to remove: a half-opacity spinner inside an
  // already-disabled row reads as barely more legible than the dead tap it
  // replaced. Only dim when NOTHING on this row is pending.
  it("keeps the row at full opacity when THIS bubble's own action is pending (not merely dimmed)", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
        offerResponsePending="accept"
      />
    );
    const row = screen.getByTestId("offer-actions-row");
    expect(row.props.style).toEqual(expect.objectContaining({ opacity: 1 }));
  });

  it("dims the row when globally disabled but nothing on this bubble is pending", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
      />
    );
    const row = screen.getByTestId("offer-actions-row");
    expect(row.props.style).toEqual(expect.objectContaining({ opacity: 0.5 }));
  });
});

describe("MessageBubble — offer action a11y (TASK-O947, LOW/A11Y)", () => {
  const offerMsg = makeMsg({
    kind: "offer",
    body: "8000|AFN|10000",
    offerAmount: 8000,
    offerCurrency: "AFN",
    sender: { id: 1, name: "Buyer" },
  });

  it("gives Accept, Decline, and Counter an accessibilityRole + label even with no counterAccessibilityLabel override", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
      />
    );
    const accept = screen.getByLabelText("chat.offer.accept");
    const decline = screen.getByLabelText("chat.offer.decline");
    const counter = screen.getByLabelText("chat.offer.counter");

    expect(accept.props.accessibilityRole).toBe("button");
    expect(decline.props.accessibilityRole).toBe("button");
    expect(counter.props.accessibilityRole).toBe("button");
  });

  it("still honors an explicit counterAccessibilityLabel override (offer_counter bubble)", () => {
    const counterMsg = makeMsg({
      kind: "offer_counter",
      body: "9500|AFN|10000",
      offerAmount: 9500,
      offerCurrency: "AFN",
      sender: { id: 2, name: "Seller" },
    });
    render(
      <MessageBubble
        message={counterMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
      />
    );
    const counter = screen.getByLabelText("chat.offer.counterBack");
    expect(counter.props.accessibilityRole).toBe("button");
  });

  it("reflects the disabled state via accessibilityState", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
      />
    );
    const accept = screen.getByLabelText("chat.offer.accept");
    // Review fix (SHOULD-FIX, A11Y) — `busy` is now always present (not just
    // `disabled`) so it can flip to `true` below without a shape change.
    expect(accept.props.accessibilityState).toEqual({ disabled: true, busy: false });
  });

  // Review fix (SHOULD-FIX, A11Y) — the visible label is replaced by a
  // spinner while `accessibilityLabel` still reads a plain "Accept offer",
  // so a screen-reader user gets no progress signal at all without `busy`.
  it("sets accessibilityState.busy on the specific action that is pending, and only that one", () => {
    render(
      <MessageBubble
        message={offerMsg}
        isMine={false}
        onOfferRespond={jest.fn()}
        offerActionsDisabled
        offerResponsePending="accept"
      />
    );
    const accept = screen.getByLabelText("chat.offer.accept");
    const decline = screen.getByLabelText("chat.offer.decline");
    expect(accept.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(decline.props.accessibilityState).toEqual({ disabled: true, busy: false });
  });
});
