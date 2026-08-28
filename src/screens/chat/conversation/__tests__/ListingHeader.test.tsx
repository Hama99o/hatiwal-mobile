/**
 * ListingHeader — Jest unit tests for the lifecycle action button and the
 * TASK-N071 firm-price notice.
 *
 * SF-M2 (Sell Flow Redesign, `docs/SELL_FLOW_REDESIGN.md` §4.4.1) dropped the
 * old `showReserve`/`showMarkSold` toggle entirely: the header's one compact
 * pill is now ALWAYS "Mark sold" for `isOwner && (status === "active" ||
 * status === "reserved") && buyer` — reserve is no longer triggered from this
 * component at all (it moved into `ComposerActionsSheet`'s "+" menu). The
 * pill also requires a known `buyer` (this conversation's other participant)
 * because tapping it opens `BuyerPickerSheet` in CONFIRM mode, preselected to
 * that buyer — there is nothing to confirm sold-to before the conversation's
 * own data has loaded.
 *
 * Covers:
 *  1. No lifecycle button when isOwner is false (buyer side)
 *  2. "Mark sold" button shown for owner + active listing + known buyer
 *  3. "Mark sold" button shown for owner + reserved listing + known buyer
 *  4. No lifecycle button when buyer is unknown, even for an owner on a live listing
 *  5. No lifecycle button for owner + sold listing (terminal state)
 *  6. No lifecycle button for owner + draft listing
 *  7. Tapping Mark Sold opens BuyerPickerSheet (confirm mode) scoped to `buyer`
 *  8. Confirming calls listingsAPI.markSold(id, result) + onLifecycleDone + toast.success
 *  9. Closing the sheet does NOT call listingsAPI.markSold
 * 10. API error fires toast.error and does NOT call onLifecycleDone
 * 11. Tapping the outer Pressable calls onPress (open listing) when no action is shown
 * 12. (TASK-N071) Firm-price notice visibility — buyer vs owner, negotiable flag variants
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
// QA-BUG5 — ListingHeader now calls the shared `useMarkSoldWithUndo` hook,
// which uses `useMutation`, so every render needs a QueryClient ancestor
// (it didn't before: the old code called `listingsAPI.markSold` directly).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  ChevronRight: "ChevronRight",
  ChevronLeft:  "ChevronLeft",
  MapPin:       "MapPin",
}));

jest.mock("@/components/common/RemoteImage", () => ({
  RemoteImage: () => null,
}));

jest.mock("@/components/common/PriceTag", () => ({
  PriceTag: "PriceTag",
}));

jest.mock("@/components/common/StatusBadge", () => ({
  StatusBadge: "StatusBadge",
}));

jest.mock("@/components/reusables/badge", () => ({
  Badge: "Badge",
}));

jest.mock("@/api/listings", () => ({
  listingsAPI: {
    markSold: jest.fn(),
  },
}));

// QA-BUG5 — the shared `useMarkSoldWithUndo` hook's Undo action calls this,
// same as `useListingLifecycle.test.tsx`'s own mock.
jest.mock("@/api/transactions", () => ({
  transactionsAPI: {
    deleteTransaction: jest.fn(),
  },
}));

jest.mock("@/utils/alert", () => ({
  confirmAlert: jest.fn(),
}));

jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
    error:   jest.fn(),
  },
}));

// BuyerPickerSheet (TASK-TX01/SF-M2) — a minimal stand-in exposing a
// "confirm-skip" button (legacy no-buyer path), a "confirm-buyer-42" button,
// a "close" button, and (SF-M2) surfaces `preselectedBuyer`'s id so a suite
// can assert the caller scoped the sheet to a SPECIFIC, already-known buyer.
// Uses the manual mock at `src/components/common/__mocks__/BuyerPickerSheet.tsx`
// — an inline JSX-returning factory crashes babel-plugin-jest-hoist (T704).
// Real sheet behavior is covered by its own unit tests.
jest.mock("@/components/common/BuyerPickerSheet");

// ReviewPromptSheet opens after a sale is recorded; it has its own tests, so
// this suite stubs it out — but (QA-BUG5) gates the stub on `visible` with a
// real testID, mirroring the `PublishSuccessSheet` stub precedent in
// MyListingDetail.test.tsx, so the QA-BUG2 sequencing (it must not appear
// before the mark-sold toast finishes its own lifecycle) is assertable here
// too, not just in useListingLifecycle.test.tsx.
jest.mock("@/components/common/ReviewPromptSheet", () => {
  const { View } = require("react-native");
  function ReviewPromptSheet({ visible }: { visible: boolean }) {
    return visible ? <View testID="review-prompt-sheet" /> : null;
  }
  return { ReviewPromptSheet };
});

// Import AFTER mocks
import { ListingHeader } from "../ListingHeader";
import { listingsAPI }   from "@/api/listings";
import { transactionsAPI } from "@/api/transactions";
import { confirmAlert }  from "@/utils/alert";
import { toast }         from "sonner-native";

// ── Typed helpers ──────────────────────────────────────────────────────────────

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockTransactionsAPI = transactionsAPI as jest.Mocked<typeof transactionsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Fixtures ───────────────────────────────────────────────────────────────────

const baseListing = {
  id: 7,
  title: "Samsung Galaxy S22",
  thumbnailUrl: null,
  price: 45000,
  currency: "AFN",
  status: "active",
  location: "Kabul",
};

const baseBuyer = { id: 55, name: "Ahmad Karimi" };

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** Wraps every render in a QueryClientProvider — see the import comment above. */
function renderHeader(element: React.ReactElement, qc: QueryClient = makeQueryClient()) {
  return render(<QueryClientProvider client={qc}>{element}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Buyer — no lifecycle button ────────────────────────────────────────────

describe("ListingHeader — buyer (isOwner=false)", () => {
  it("does not render a Mark Sold button even with a known buyer", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={false}
        buyer={baseBuyer}
      />
    );
    expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
  });

  it("does not render a Mark Sold button for a reserved listing either", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={false}
        buyer={baseBuyer}
      />
    );
    expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
  });
});

// ── 2 & 3. Owner + Live (active OR reserved) + known buyer → Mark sold ───────

describe("ListingHeader — owner + Live listing + known buyer (SF-M2: always Mark sold)", () => {
  it.each(["active", "reserved"] as const)(
    "renders the Mark Sold button for status=%s",
    (status) => {
      renderHeader(
        <ListingHeader
          listing={{ ...baseListing, status }}
          isOwner={true}
          buyer={baseBuyer}
        />
      );
      expect(screen.getByText("chat.listingActions.markSold")).toBeTruthy();
    }
  );

  it("never renders a Reserve button — reserve moved out of this component entirely (SF-M2)", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );
    expect(screen.queryByText("chat.listingActions.reserve")).toBeNull();
  });
});

// ── 4. No buyer known yet → no action, even for an owner on a live listing ──

describe("ListingHeader — owner but buyer not yet known", () => {
  it.each(["active", "reserved"] as const)(
    "renders no Mark Sold button for status=%s when buyer is null",
    (status) => {
      renderHeader(
        <ListingHeader
          listing={{ ...baseListing, status }}
          isOwner={true}
          buyer={null}
        />
      );
      expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
    }
  );

  it("renders no Mark Sold button when buyer is omitted (defaults to null)", () => {
    renderHeader(
      <ListingHeader listing={{ ...baseListing, status: "active" }} isOwner={true} />
    );
    expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
  });
});

// ── 5 & 6. Terminal / non-actionable statuses ─────────────────────────────────

describe("ListingHeader — owner + sold or draft listing (no action)", () => {
  it.each(["sold", "draft"] as const)(
    "renders no lifecycle button for status=%s, even with a known buyer",
    (status) => {
      renderHeader(
        <ListingHeader
          listing={{ ...baseListing, status }}
          isOwner={true}
          buyer={baseBuyer}
        />
      );
      expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
    }
  );
});

// ── 7-10. Mark Sold action (TASK-TX01/SF-M2: opens BuyerPickerSheet in confirm mode) ──

describe("ListingHeader — Mark Sold action", () => {
  it("opens the BuyerPickerSheet (not confirmAlert), preselected to `buyer`, when tapped", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));

    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
    expect(screen.getByTestId("buyer-picker-preselected-buyer-id")).toHaveTextContent("55");
  });

  it("calls listingsAPI.markSold with listing id + result on picker confirm", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({} as any);

    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, id: 7, status: "reserved" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockListingsAPI.markSold).toHaveBeenCalledWith(7, {});
    });
  });

  it("calls onLifecycleDone and toast.success on markSold success", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({} as any);
    const onLifecycleDone = jest.fn();

    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => {
      expect(onLifecycleDone).toHaveBeenCalledTimes(1);
      // QA-BUG5 — this now goes through the shared `useMarkSoldWithUndo` hook,
      // the SAME toast copy `useListingLifecycle`'s own mark-sold uses (there is
      // exactly one "marked sold" message in the app now, not two that can drift).
      expect(mockToast.success).toHaveBeenCalledWith("listing.markSoldSuccess");
    });
  });

  it("calls toast.error and NOT onLifecycleDone when markSold throws", async () => {
    mockListingsAPI.markSold.mockRejectedValueOnce(new Error("Network error"));
    const onLifecycleDone = jest.fn();

    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      // QA-BUG5 — the shared hook's onError shows the SERVER's own words
      // (`apiErrorMessage`) instead of a fixed "could not mark as sold" copy;
      // a plain `Error("Network error")` with no `.response` reads as offline.
      expect(mockToast.error).toHaveBeenCalledWith("common.errorNetwork");
      expect(onLifecycleDone).not.toHaveBeenCalled();
    });
  });

  it("does NOT call listingsAPI.markSold when the sheet is closed without confirming", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("picker-close"));

    expect(mockListingsAPI.markSold).not.toHaveBeenCalled();
  });
});

// ── QA-BUG5 (FlowApp #303): Undo + review-prompt sequencing ─────────────────
//
// Before this fix, ListingHeader hand-rolled its own `listingsAPI.markSold`
// call and raised a plain success toast with NO Undo action at all — the
// listing screens' `useListingLifecycle` already had the SF-M5
// "Marked sold · Undo" toast, chat did not, even though chat is the
// shortest real path to a sale (the buyer is already known there). Both
// tests below FAIL against that old code: the first because its toast call
// carried no second argument at all (`options` is `undefined`, so reading
// `.action` off it throws); the second because it opened `ReviewPromptSheet`
// in the SAME tick as the toast (the old synchronous shape QA-BUG2 already
// fixed on the listing screens), so `review-prompt-sheet` would already be
// present at the "not yet" assertion.

describe("ListingHeader — QA-BUG5: Undo + review-prompt sequencing (shared with useListingLifecycle)", () => {
  it("the success toast carries an Undo action when the response has a transaction id, and invoking it calls transactionsAPI.deleteTransaction with that id", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" },
      transaction: { id: 88 },
    } as any);
    mockTransactionsAPI.deleteTransaction.mockResolvedValueOnce({
      listing: { status: "active" },
    } as any);

    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    const [message, options] = mockToast.success.mock.calls[0];
    expect(message).toBe("listing.markSoldSuccess");
    expect(options.action.label).toBe("common.undo");

    await act(async () => {
      options.action.onClick();
    });

    await waitFor(() =>
      expect(mockTransactionsAPI.deleteTransaction).toHaveBeenCalledWith(88)
    );
  });

  it("REV2: a sold response with a buyer opens the review prompt only once the toast's own lifecycle finishes (QA-BUG2 sequencing preserved on the chat path)", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({
      listing: { status: "sold" },
      transaction: {
        id: 88,
        buyer: { id: 55, name: "Ahmad Karimi", avatarUrl: null },
      },
    } as any);

    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        buyer={baseBuyer}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-buyer-42"));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    // Not yet — opening now would cover the toast's own Undo action on
    // Android, exactly what QA-BUG2 fixed on the listing screens.
    expect(screen.queryByTestId("review-prompt-sheet")).toBeNull();

    const [, options] = mockToast.success.mock.calls[0];
    await act(async () => {
      options.onAutoClose();
    });

    await waitFor(() => expect(screen.getByTestId("review-prompt-sheet")).toBeTruthy());
  });
});

// ── 11. Smoke tests ─────────────────────────────────────────────────────────────

describe("ListingHeader — smoke tests", () => {
  it.each(["active", "reserved", "sold", "draft"] as const)(
    "renders without throwing for owner + status=%s",
    (status) => {
      expect(() =>
        renderHeader(
          <ListingHeader
            listing={{ ...baseListing, status }}
            isOwner={true}
            buyer={baseBuyer}
          />
        )
      ).not.toThrow();
    }
  );

  it.each(["active", "reserved"] as const)(
    "renders without throwing for buyer (isOwner=false) + status=%s",
    (status) => {
      expect(() =>
        renderHeader(
          <ListingHeader
            listing={{ ...baseListing, status }}
            isOwner={false}
          />
        )
      ).not.toThrow();
    }
  );

  it("renders without throwing when isOwner is omitted (defaults false)", () => {
    expect(() =>
      renderHeader(
        <ListingHeader listing={{ ...baseListing, status: "active" }} />
      )
    ).not.toThrow();
  });
});

// ── 12. TASK-N071: Firm-price notice ──────────────────────────────────────────

describe("ListingHeader — TASK-N071: firm-price notice", () => {
  it("shows the firm-price notice when negotiable=false and isOwner=false", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={false}
      />
    );
    expect(screen.getByTestId("firm-price-chat-notice")).toBeTruthy();
  });

  it("does NOT show the firm-price notice when negotiable=true", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, negotiable: true }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("does NOT show the firm-price notice when negotiable is undefined (defaults to negotiable)", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("does NOT show the firm-price notice when isOwner=true even if negotiable=false", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={true}
      />
    );
    // Owners set the price — they see no notice
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("the firm-price notice strip renders the 'chat.offer.firmNotice' translation key text", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={false}
      />
    );
    // The notice Text component inside the firm-price strip renders this key
    // (t() returns the key in test env; Badge is mocked as a string element)
    expect(screen.getByText("chat.offer.firmNotice")).toBeTruthy();
  });

  // TASK-K729 review fix: suppressed once reserved/sold — the reserved/sold
  // recovery notice (ListingUnavailableNotice, rendered elsewhere in
  // Conversation.tsx) already explains why the offer control is gone; the
  // two notices stacking would give the buyer two conflicting reasons.
  it("does NOT show the firm-price notice when the listing is reserved, even if negotiable=false", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved", negotiable: false }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("does NOT show the firm-price notice when the listing is sold, even if negotiable=false", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "sold", negotiable: false }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });
});

// ── Multi-quantity (docs/SPIKE_LISTING_QUANTITY.md) ───────────────────────────
//
// The seller often closes the deal inside the thread, so the header's own
// Mark Sold flow has to offer the same choice the My Listings screen does.
// Without the stock passed through, this surface could only ever sell a whole
// batch at once.

describe("ListingHeader — multi-quantity", () => {
  it("tells the buyer picker how many are left, so it can ask 'how many did you sell?'", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved", multiUnit: true, availableUnits: 11 }}
        isOwner
        buyer={baseBuyer}
      />
    );
    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    expect(screen.getByTestId("buyer-picker-remaining")).toHaveTextContent("11");
  });

  it("reports 1 for a single-item listing, so the picker asks nothing new", () => {
    renderHeader(
      <ListingHeader listing={{ ...baseListing, status: "active" }} isOwner buyer={baseBuyer} />
    );
    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    expect(screen.getByTestId("buyer-picker-remaining")).toHaveTextContent("1");
  });

  // PriceTag is stubbed as a string element in this suite (see the mock at the
  // top), so the "each" suffix itself cannot render here — PriceTag's own
  // PriceTagPerUnit.test.tsx covers that. What this suite owns is whether the
  // header passes the flag at all.
  it("passes perUnit to the price on a multi-unit listing", () => {
    renderHeader(
      <ListingHeader
        listing={{ ...baseListing, multiUnit: true, availableUnits: 11 }}
        isOwner={false}
      />
    );
    expect(screen.UNSAFE_getByType("PriceTag" as never).props.perUnit).toBe(true);
  });

  it("does not pass perUnit on a single-item listing", () => {
    renderHeader(<ListingHeader listing={baseListing} isOwner={false} />);
    expect(screen.UNSAFE_getByType("PriceTag" as never).props.perUnit).toBe(false);
  });
});
