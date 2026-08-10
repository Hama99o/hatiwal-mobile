/**
 * offerInThread — unit tests for TASK-C381 (make/counter an offer without
 * leaving the chat thread).
 *
 * ConversationScreen itself is too deeply coupled (ActionCable, composer
 * draft persistence, FlatList, gesture-handler/reanimated) to mount in JSDOM
 * — see reportParticipant.test.tsx / reserveAfterOffer.test.tsx for the same
 * rationale. Instead these tests cover:
 *
 *  1. The composer offer-button visibility guard (`canOfferInThread`) as a
 *     pure predicate mirroring the one in Conversation.tsx.
 *  2. The counter-back guard (`canCounterBack`) as a pure predicate mirroring
 *     the `onOfferCounter` wiring in Conversation.tsx's renderItem.
 *  3. A minimal wrapper — `ThreadOfferAffordance` — that mirrors the real
 *     composer Tag button + OfferSheet + handleSendOfferInThread contract
 *     (optimistic append, canonical body encoding, rollback + toast on
 *     failure), using the REAL OfferSheet component (no duplicated chip
 *     logic) and a mocked conversationsAPI.
 *  4. The real MessageBubble component rendering a Counter action on
 *     `offer_counter` bubbles (the buyer countering the seller's counter).
 */

import React, { useState } from "react";
import { View, Pressable, Text as RNText } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  X: "X",
  Tag: "Tag",
  MapPin: "MapPin",
  Clock: "Clock",
  Check: "Check",
  ExternalLink: "ExternalLink",
  FileText: "FileText",
  CalendarCheck: "CalendarCheck",
  CalendarX: "CalendarX",
  Camera: "Camera",
  ImageIcon: "ImageIcon",
  ArrowLeftRight: "ArrowLeftRight",
  Trash2: "Trash2",
}));

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("@/lib/animation", () => ({
  useReduceMotion: () => false,
}));

jest.mock("sonner-native", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/api/conversations", () => ({
  conversationsAPI: {
    sendMessage: jest.fn(),
  },
}));

// Import after mocks
import { toast } from "sonner-native";
import { conversationsAPI, type Message } from "@/api/conversations";
import { OfferSheet } from "@/screens/shared/listing-detail/OfferSheet";
import { MessageBubble } from "../conversation/MessageBubble";

// ─── Pure guards — mirror the logic in Conversation.tsx ──────────────────────

type MiniListing = { status: string; negotiable?: boolean } | null | undefined;

/** Mirrors `canOfferInThread` in Conversation.tsx (TASK-K729: reserved excluded too). */
function canOfferInThread(params: {
  canSend: boolean;
  listing: MiniListing;
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

/**
 * Mirrors the `onOfferCounter` guard in Conversation.tsx's renderItem.
 *
 * Review fixes (both offers are only "made or countered" from the OTHER
 * side, i.e. `!isMine` — `isSeller` no longer gates the "offer" branch):
 *  1. A fresh "offer" can now come from either participant (a seller
 *     opening one is a proactive discount, per this card's composer
 *     button) — so the recipient, buyer OR seller, must be able to
 *     counter it back. The old `isSeller`-only gate silently dead-ended a
 *     seller-initiated offer: the buyer could Accept/Decline it (that path
 *     was never seller-gated) but never Counter it.
 *  2. A counter can itself be superseded by a FURTHER counter-back —
 *     `isCounterSuperseded` mirrors `isOfferCountered` for the original
 *     offer, so an already-superseded counter stops offering its own
 *     Counter (and Accept/Decline) actions once the recipient has replied
 *     with a counter of their own.
 */
function canCounterBack(params: {
  kind: "offer" | "offer_counter";
  isMine: boolean;
  isOfferCountered: boolean;
  offerOutcome: "accepted" | "declined" | null;
  isCounterSuperseded?: boolean;
}): boolean {
  const { kind, isMine, isOfferCountered, offerOutcome, isCounterSuperseded = false } = params;
  if (kind === "offer") return !isOfferCountered && !isMine;
  if (kind === "offer_counter") return !isMine && !offerOutcome && !isCounterSuperseded;
  return false;
}

/** Mirrors the `onOfferRespond` guard in Conversation.tsx's renderItem. */
function canRespondToOffer(params: {
  kind: "offer" | "offer_counter";
  isOfferCountered: boolean;
  isCounterSuperseded?: boolean;
}): boolean {
  const { kind, isOfferCountered, isCounterSuperseded = false } = params;
  if (kind === "offer") return !isOfferCountered;
  if (kind === "offer_counter") return !isCounterSuperseded;
  return false;
}

// ─── 1. canOfferInThread — composer button visibility matrix ─────────────────

describe("canOfferInThread — composer button visibility matrix", () => {
  const ACTIVE: MiniListing = { status: "active" };
  const RESERVED: MiniListing = { status: "reserved" };
  const SOLD: MiniListing = { status: "sold" };
  const FIRM: MiniListing = { status: "active", negotiable: false };
  const NEGOTIABLE_EXPLICIT: MiniListing = { status: "active", negotiable: true };

  it("shows the button on an open conversation about an active, negotiable listing", () => {
    expect(canOfferInThread({ canSend: true, listing: ACTIVE })).toBe(true);
  });

  it("shows the button when negotiable is explicitly true", () => {
    expect(canOfferInThread({ canSend: true, listing: NEGOTIABLE_EXPLICIT })).toBe(true);
  });

  it("shows the button when negotiable is undefined (default negotiable)", () => {
    expect(canOfferInThread({ canSend: true, listing: { status: "active" } })).toBe(true);
  });

  // TASK-K729: a reserved listing now hides the button too (the seller has
  // already committed to a buyer) — ListingUnavailableNotice explains why.
  it("hides the button for a reserved listing", () => {
    expect(canOfferInThread({ canSend: true, listing: RESERVED })).toBe(false);
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

  it("hides the button when the listing is sold", () => {
    expect(canOfferInThread({ canSend: true, listing: SOLD })).toBe(false);
  });

  it("hides the button when the listing is firm-priced (negotiable === false)", () => {
    expect(canOfferInThread({ canSend: true, listing: FIRM })).toBe(false);
  });
});

// ─── 2. canCounterBack — counter-back guard matrix ────────────────────────────

describe("canCounterBack — offer / offer_counter guard matrix", () => {
  it("offer: the recipient (seller) can counter the buyer's fresh offer", () => {
    expect(
      canCounterBack({ kind: "offer", isMine: false, isOfferCountered: false, offerOutcome: null })
    ).toBe(true);
  });

  it("offer: review fix — the recipient (buyer) can also counter a SELLER's own fresh offer (proactive discount)", () => {
    // Before the fix this required isSeller===true, so a seller-initiated
    // "offer" (a proactive discount — explicitly allowed by this card's
    // composer button, which shows for both roles) could be Accepted or
    // Declined by the buyer but never Countered. The guard only cares who
    // DIDN'T send the message, not which role they are.
    expect(
      canCounterBack({ kind: "offer", isMine: false, isOfferCountered: false, offerOutcome: null })
    ).toBe(true);
  });

  it("offer: my own fresh offer never shows a Counter button to me", () => {
    expect(
      canCounterBack({ kind: "offer", isMine: true, isOfferCountered: false, offerOutcome: null })
    ).toBe(false);
  });

  it("offer: already countered offer suppresses the counter action", () => {
    expect(
      canCounterBack({ kind: "offer", isMine: false, isOfferCountered: true, offerOutcome: null })
    ).toBe(false);
  });

  it("offer_counter: the recipient (not mine) can counter back", () => {
    expect(
      canCounterBack({ kind: "offer_counter", isMine: false, isOfferCountered: false, offerOutcome: null })
    ).toBe(true);
  });

  it("offer_counter: the recipient can counter back regardless of role (buyer or seller)", () => {
    expect(
      canCounterBack({ kind: "offer_counter", isMine: false, isOfferCountered: false, offerOutcome: null, isCounterSuperseded: false })
    ).toBe(true);
  });

  it("offer_counter: my own counter never shows a Counter button", () => {
    expect(
      canCounterBack({ kind: "offer_counter", isMine: true, isOfferCountered: false, offerOutcome: null })
    ).toBe(false);
  });

  it("offer_counter: an accepted counter suppresses the Counter button", () => {
    expect(
      canCounterBack({ kind: "offer_counter", isMine: false, isOfferCountered: false, offerOutcome: "accepted" })
    ).toBe(false);
  });

  it("offer_counter: a declined counter suppresses the Counter button", () => {
    expect(
      canCounterBack({ kind: "offer_counter", isMine: false, isOfferCountered: false, offerOutcome: "declined" })
    ).toBe(false);
  });

  it("offer_counter: review fix — a counter already superseded by a further counter-back suppresses the Counter button", () => {
    // Recipient countered C1 with C2 — C1 has no offer_accepted/offer_declined
    // response (they replied with a counter, not a decision) so offerOutcome
    // stays null, but it MUST still stop showing actions once superseded.
    expect(
      canCounterBack({ kind: "offer_counter", isMine: false, isOfferCountered: false, offerOutcome: null, isCounterSuperseded: true })
    ).toBe(false);
  });
});

// ─── 2b. canRespondToOffer — Accept/Decline guard matrix ──────────────────────

describe("canRespondToOffer — review fix: a superseded counter stops offering Accept/Decline too", () => {
  it("offer: respondable while not yet countered", () => {
    expect(canRespondToOffer({ kind: "offer", isOfferCountered: false })).toBe(true);
  });

  it("offer: not respondable once countered", () => {
    expect(canRespondToOffer({ kind: "offer", isOfferCountered: true })).toBe(false);
  });

  it("offer_counter: respondable while not yet superseded by a further counter-back", () => {
    expect(canRespondToOffer({ kind: "offer_counter", isOfferCountered: false, isCounterSuperseded: false })).toBe(true);
  });

  it("offer_counter: review fix — NOT respondable once superseded by a further counter-back", () => {
    // Without this, after the recipient sends C2 in response to C1, C1 kept
    // showing Accept/Decline to them — letting them accept/decline a counter
    // they had already superseded with a counter of their own.
    expect(canRespondToOffer({ kind: "offer_counter", isOfferCountered: false, isCounterSuperseded: true })).toBe(false);
  });
});

// ─── 3. Thread offer composer + OfferSheet — integration wrapper ─────────────

/**
 * Minimal wrapper mirroring the real composer's Tag button + OfferSheet +
 * handleSendOfferInThread contract from Conversation.tsx. Uses the REAL
 * OfferSheet component (no duplicated chip logic) and the mocked
 * conversationsAPI so we can assert the canonical body encoding, the
 * optimistic append, and the rollback-on-failure path.
 */
function ThreadOfferAffordance({
  listing,
  canSend,
  listingDeleted = false,
  conversationId = 1,
}: {
  listing: { currency: string; price: number; status: string; negotiable?: boolean } | null;
  canSend: boolean;
  listingDeleted?: boolean;
  conversationId?: number;
}) {
  const [messages, setMessages] = useState<Pick<Message, "id" | "body" | "kind">[]>([]);
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const canOffer = canOfferInThread({ canSend, listing, listingDeleted });

  const handleSend = async (inputAmount: string) => {
    const amt = Number(inputAmount);
    if (!amt || amt <= 0) return;
    const currency = listing?.currency ?? "AFN";
    const listedPrice = listing?.price ?? 0;
    const body = `${amt}|${currency}|${listedPrice}`;

    // Close the sheet immediately — mirrors handleSend clearing the composer.
    setVisible(false);
    setAmount("");
    setBusy(true);

    const optimistic = { id: -1, body, kind: "offer" as const };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await conversationsAPI.sendMessage(conversationId, body, "offer");
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error("chat.thread.sendFailed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {canOffer && (
        <Pressable
          testID="thread-offer-button"
          accessibilityLabel="chat.offer.makeOffer"
          onPress={() => setVisible(true)}
        >
          <RNText>Tag</RNText>
        </Pressable>
      )}
      {canOffer && listing && (
        <OfferSheet
          visible={visible}
          onClose={() => {
            setVisible(false);
            setAmount("");
          }}
          onSend={handleSend}
          offerAmount={amount}
          onChangeAmount={setAmount}
          currency={listing.currency}
          price={listing.price}
          isBusy={busy}
        />
      )}
      {messages.map((m) => (
        <RNText key={m.id} testID={`thread-message-${m.id}`}>
          {m.kind}:{m.body}
        </RNText>
      ))}
    </View>
  );
}

const NEGOTIABLE_LISTING = { currency: "AFN", price: 85000, status: "active" };

function makeSentMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 999,
    body: "80750|AFN|85000",
    kind: "offer",
    readAt: null,
    createdAt: "2026-01-01T10:00:00Z",
    sender: { id: 1, name: "Buyer" },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ThreadOfferAffordance — composer button rendering", () => {
  it("renders the Tag offer button for a negotiable, active listing", () => {
    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} />);
    expect(screen.getByTestId("thread-offer-button")).toBeTruthy();
  });

  it("does NOT render the button when the conversation is closed", () => {
    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={false} />);
    expect(screen.queryByTestId("thread-offer-button")).toBeNull();
  });

  it("does NOT render the button when the listing is deleted", () => {
    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} listingDeleted={true} />);
    expect(screen.queryByTestId("thread-offer-button")).toBeNull();
  });

  it("does NOT render the button when the listing is sold", () => {
    render(<ThreadOfferAffordance listing={{ ...NEGOTIABLE_LISTING, status: "sold" }} canSend={true} />);
    expect(screen.queryByTestId("thread-offer-button")).toBeNull();
  });

  // TASK-K729
  it("does NOT render the button when the listing is reserved", () => {
    render(<ThreadOfferAffordance listing={{ ...NEGOTIABLE_LISTING, status: "reserved" }} canSend={true} />);
    expect(screen.queryByTestId("thread-offer-button")).toBeNull();
  });

  it("does NOT render the button when the listing is firm-priced", () => {
    render(<ThreadOfferAffordance listing={{ ...NEGOTIABLE_LISTING, negotiable: false }} canSend={true} />);
    expect(screen.queryByTestId("thread-offer-button")).toBeNull();
  });

  it("has the correct accessibility label", () => {
    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} />);
    expect(screen.getByTestId("thread-offer-button").props.accessibilityLabel).toBe("chat.offer.makeOffer");
  });
});

describe("ThreadOfferAffordance — opens the existing OfferSheet prefilled from the listing", () => {
  it("opens the sheet with the listed price and quick-amount chips computed from it", async () => {
    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} />);
    fireEvent.press(screen.getByTestId("thread-offer-button"));

    await waitFor(() => {
      expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy();
    });
    // TASK-G083 quick-amount chips: 95/90/85% of 85000 = 80750/76500/72250.
    expect(screen.getByTestId("quick-chip-80750")).toBeTruthy();
    expect(screen.getByTestId("quick-chip-76500")).toBeTruthy();
    expect(screen.getByTestId("quick-chip-72250")).toBeTruthy();
  });
});

describe("ThreadOfferAffordance — sending an offer from the thread", () => {
  it("sends a kind:offer message with the canonical amount|currency|listedPrice body", async () => {
    (conversationsAPI.sendMessage as jest.Mock).mockResolvedValue(makeSentMessage());

    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} conversationId={42} />);
    fireEvent.press(screen.getByTestId("thread-offer-button"));
    await waitFor(() => expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy());

    fireEvent.press(screen.getByTestId("quick-chip-80750"));

    await act(async () => {
      fireEvent.press(screen.getByText("listing.detail.sendOffer"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(conversationsAPI.sendMessage).toHaveBeenCalledWith(42, "80750|AFN|85000", "offer");
  });

  it("appends the offer optimistically before the request resolves, then reconciles with the server response", async () => {
    let resolveSend!: (m: Message) => void;
    (conversationsAPI.sendMessage as jest.Mock).mockReturnValue(
      new Promise<Message>((resolve) => {
        resolveSend = resolve;
      })
    );

    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} />);
    fireEvent.press(screen.getByTestId("thread-offer-button"));
    await waitFor(() => expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy());
    fireEvent.press(screen.getByTestId("quick-chip-80750"));

    act(() => {
      fireEvent.press(screen.getByText("listing.detail.sendOffer"));
    });

    // Optimistic bubble is visible immediately — before the promise resolves.
    expect(screen.getByTestId("thread-message--1")).toBeTruthy();
    expect(screen.getByText("offer:80750|AFN|85000")).toBeTruthy();
    // The sheet closes right away (mirrors handleSend clearing the composer).
    expect(screen.queryByText("listing.detail.offerTitle")).toBeNull();

    await act(async () => {
      resolveSend(makeSentMessage({ id: 999 }));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // Reconciled with the real server id — the optimistic negative id is gone.
    expect(screen.queryByTestId("thread-message--1")).toBeNull();
    expect(screen.getByTestId("thread-message-999")).toBeTruthy();
  });

  it("rolls back the optimistic bubble and shows an error toast when the send fails", async () => {
    (conversationsAPI.sendMessage as jest.Mock).mockRejectedValue(new Error("network error"));

    render(<ThreadOfferAffordance listing={NEGOTIABLE_LISTING} canSend={true} />);
    fireEvent.press(screen.getByTestId("thread-offer-button"));
    await waitFor(() => expect(screen.getByText("listing.detail.offerTitle")).toBeTruthy());
    fireEvent.press(screen.getByTestId("quick-chip-80750"));

    await act(async () => {
      fireEvent.press(screen.getByText("listing.detail.sendOffer"));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    // Rolled back — no leftover bubble of any kind.
    expect(screen.queryByText("offer:80750|AFN|85000")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("chat.thread.sendFailed");
  });
});

// ─── 4. MessageBubble — Counter action on offer_counter (TASK-C381) ──────────

const now = "2026-01-01T10:00:00Z";

function makeCounterMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 5,
    body: "9500|AFN|10000",
    kind: "offer_counter",
    offerAmount: 9500,
    offerCurrency: "AFN",
    readAt: null,
    createdAt: now,
    sender: { id: 2, name: "Seller" },
    ...overrides,
  };
}

describe("MessageBubble — offer_counter Counter action (TASK-C381)", () => {
  it("shows a Counter action when the recipient (not mine) receives a counter and onOfferCounter is provided", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
      />
    );
    expect(screen.getByLabelText("chat.offer.counterBack")).toBeTruthy();
    // Reuses the existing "Counter" label — no duplicated chip/label logic.
    expect(screen.getByText("chat.offer.counter")).toBeTruthy();
  });

  it("calls onOfferCounter when the Counter action is tapped, so the sheet reopens prefilled", () => {
    const onCounter = jest.fn();
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={onCounter}
      />
    );
    fireEvent.press(screen.getByLabelText("chat.offer.counterBack"));
    expect(onCounter).toHaveBeenCalledTimes(1);
  });

  it("does NOT show a Counter action when onOfferCounter is not provided", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
      />
    );
    expect(screen.queryByLabelText("chat.offer.counterBack")).toBeNull();
  });

  it("does NOT show a Counter action on my own counter (isMine=true), even if onOfferCounter is passed", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={true}
        onOfferCounter={jest.fn()}
      />
    );
    expect(screen.queryByLabelText("chat.offer.counterBack")).toBeNull();
    expect(screen.queryByText("chat.offer.accept")).toBeNull();
  });

  it("does NOT show a Counter action once the counter has been accepted", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
        offerOutcome="accepted"
      />
    );
    expect(screen.queryByLabelText("chat.offer.counterBack")).toBeNull();
    expect(screen.getByText("chat.offer.accepted")).toBeTruthy();
  });

  it("does NOT show a Counter action once the counter has been declined", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
        offerOutcome="declined"
      />
    );
    expect(screen.queryByLabelText("chat.offer.counterBack")).toBeNull();
    expect(screen.getByText("chat.offer.declined")).toBeTruthy();
  });

  it("still shows Accept/Decline alongside the Counter action, so the buyer can respond OR counter back", () => {
    render(
      <MessageBubble
        message={makeCounterMsg()}
        isMine={false}
        onOfferRespond={jest.fn()}
        onOfferCounter={jest.fn()}
      />
    );
    expect(screen.getByText("chat.offer.accept")).toBeTruthy();
    expect(screen.getByText("chat.offer.decline")).toBeTruthy();
    expect(screen.getByLabelText("chat.offer.counterBack")).toBeTruthy();
  });
});
