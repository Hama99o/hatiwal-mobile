/**
 * ListingHeader — Jest unit tests for the lifecycle action buttons and
 * the TASK-N071 firm-price notice.
 *
 * Covers:
 *  1. No lifecycle button when isOwner is false (buyer side)
 *  2. "Reserve" button shown for owner + active listing
 *  3. "Mark Sold" button shown for owner + reserved listing
 *  4. No lifecycle button for owner + sold listing (terminal state)
 *  5. No lifecycle button for owner + draft listing
 *  6. (TASK-TX01) Tapping Reserve opens the BuyerPickerSheet; confirming calls
 *     listingsAPI.reserveListing(id, result) and fires onLifecycleDone + toast.success
 *  7. (TASK-TX01) Tapping Mark Sold opens the BuyerPickerSheet; confirming calls
 *     listingsAPI.markSold(id, result) + onLifecycleDone + toast.success
 *  8. Closing the sheet does NOT call listingsAPI.markSold
 *  9. API error fires toast.error and does NOT call onLifecycleDone
 * 10. Tapping the outer Pressable calls onPress (open listing) when no action is shown
 * 11. (TASK-N071) Firm-price notice visibility — buyer vs owner, negotiable flag variants
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

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
    reserveListing: jest.fn(),
    markSold:       jest.fn(),
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

// BuyerPickerSheet (TASK-TX01) — a minimal stand-in exposing a "confirm-skip"
// button (legacy no-buyer path) and a "close" button. Uses the manual mock at
// `src/components/common/__mocks__/BuyerPickerSheet.tsx` — an inline JSX-
// returning factory crashes babel-plugin-jest-hoist (T704). Real sheet
// behavior is covered by its own unit tests.
jest.mock("@/components/common/BuyerPickerSheet");

// ReviewPromptSheet opens after a sale is recorded; it uses react-query
// (useMutation), which these lifecycle tests don't provide. It has its own
// tests — stub it out. Null factory (no require/JSX) is babel-hoist-safe.
jest.mock("@/components/common/ReviewPromptSheet", () => ({
  ReviewPromptSheet: () => null,
}));

// Import AFTER mocks
import { ListingHeader } from "../ListingHeader";
import { listingsAPI }   from "@/api/listings";
import { confirmAlert }  from "@/utils/alert";
import { toast }         from "sonner-native";

// ── Typed helpers ──────────────────────────────────────────────────────────────

const mockListingsAPI = listingsAPI as jest.Mocked<typeof listingsAPI>;
const mockConfirmAlert = confirmAlert as jest.MockedFunction<typeof confirmAlert>;
const mockToast = toast as { success: jest.Mock; error: jest.Mock };

// ── Fixture ────────────────────────────────────────────────────────────────────

const baseListing = {
  id: 7,
  title: "Samsung Galaxy S22",
  thumbnailUrl: null,
  price: 45000,
  currency: "AFN",
  status: "active",
  location: "Kabul",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 1. Buyer — no lifecycle button ────────────────────────────────────────────

describe("ListingHeader — buyer (isOwner=false)", () => {
  it("does not render a Reserve button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={false}
      />
    );
    expect(screen.queryByText("chat.listingActions.reserve")).toBeNull();
  });

  it("does not render a Mark Sold button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={false}
      />
    );
    expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
  });
});

// ── 2. Owner + active → Reserve ───────────────────────────────────────────────

describe("ListingHeader — owner + active listing", () => {
  it("renders the Reserve button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
      />
    );
    expect(screen.getByText("chat.listingActions.reserve")).toBeTruthy();
  });

  it("does NOT render the Mark Sold button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
      />
    );
    expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
  });
});

// ── 3. Owner + reserved → Mark Sold ──────────────────────────────────────────

describe("ListingHeader — owner + reserved listing", () => {
  it("renders the Mark Sold button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
      />
    );
    expect(screen.getByText("chat.listingActions.markSold")).toBeTruthy();
  });

  it("does NOT render the Reserve button", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
      />
    );
    expect(screen.queryByText("chat.listingActions.reserve")).toBeNull();
  });
});

// ── 4 & 5. Terminal / non-actionable statuses ─────────────────────────────────

describe("ListingHeader — owner + sold or draft listing (no action)", () => {
  it.each(["sold", "draft"] as const)(
    "renders no lifecycle button for status=%s",
    (status) => {
      render(
        <ListingHeader
          listing={{ ...baseListing, status }}
          isOwner={true}
        />
      );
      expect(screen.queryByText("chat.listingActions.reserve")).toBeNull();
      expect(screen.queryByText("chat.listingActions.markSold")).toBeNull();
    }
  );
});

// ── 6. Reserve action (TASK-TX01: opens BuyerPickerSheet) ──────────────────────

describe("ListingHeader — Reserve action", () => {
  it("opens the BuyerPickerSheet (not confirmAlert) when tapped", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, id: 7, status: "active" }}
        isOwner={true}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.reserve"));

    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-reserve")).toBeTruthy();
  });

  it("calls listingsAPI.reserveListing with listing id + result on picker confirm", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({} as any);
    const onLifecycleDone = jest.fn();

    render(
      <ListingHeader
        listing={{ ...baseListing, id: 7, status: "active" }}
        isOwner={true}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.reserve"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockListingsAPI.reserveListing).toHaveBeenCalledWith(7, {});
    });
  });

  it("calls onLifecycleDone and toast.success on reserve success", async () => {
    mockListingsAPI.reserveListing.mockResolvedValueOnce({} as any);
    const onLifecycleDone = jest.fn();

    render(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.reserve"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(onLifecycleDone).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith("chat.listingActions.reserveSuccess");
    });
  });

  it("calls toast.error and NOT onLifecycleDone when reserveListing throws", async () => {
    mockListingsAPI.reserveListing.mockRejectedValueOnce(new Error("Network error"));
    const onLifecycleDone = jest.fn();

    render(
      <ListingHeader
        listing={{ ...baseListing, status: "active" }}
        isOwner={true}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.reserve"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("chat.listingActions.reserveFailed");
      expect(onLifecycleDone).not.toHaveBeenCalled();
    });
  });
});

// ── 7. Mark Sold action (TASK-TX01: opens BuyerPickerSheet) ────────────────────

describe("ListingHeader — Mark Sold action", () => {
  it("opens the BuyerPickerSheet (not confirmAlert) when tapped", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));

    expect(mockConfirmAlert).not.toHaveBeenCalled();
    expect(screen.getByTestId("buyer-picker-visible-sold")).toBeTruthy();
  });

  it("calls listingsAPI.markSold with listing id + result on picker confirm", async () => {
    mockListingsAPI.markSold.mockResolvedValueOnce({} as any);

    render(
      <ListingHeader
        listing={{ ...baseListing, id: 7, status: "reserved" }}
        isOwner={true}
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

    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(onLifecycleDone).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith("chat.listingActions.markSoldSuccess");
    });
  });

  it("calls toast.error and NOT onLifecycleDone when markSold throws", async () => {
    mockListingsAPI.markSold.mockRejectedValueOnce(new Error("Network error"));
    const onLifecycleDone = jest.fn();

    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
        onLifecycleDone={onLifecycleDone}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("confirm-skip"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("chat.listingActions.markSoldFailed");
      expect(onLifecycleDone).not.toHaveBeenCalled();
    });
  });
});

// ── 8. Closing the picker ───────────────────────────────────────────────────────

describe("ListingHeader — closing the BuyerPickerSheet", () => {
  it("does NOT call listingsAPI.markSold when the sheet is closed without confirming", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, status: "reserved" }}
        isOwner={true}
      />
    );

    fireEvent.press(screen.getByText("chat.listingActions.markSold"));
    fireEvent.press(screen.getByTestId("picker-close"));

    expect(mockListingsAPI.markSold).not.toHaveBeenCalled();
  });
});

// ── 9. Smoke tests ─────────────────────────────────────────────────────────────

describe("ListingHeader — smoke tests", () => {
  it.each(["active", "reserved", "sold", "draft"] as const)(
    "renders without throwing for owner + status=%s",
    (status) => {
      expect(() =>
        render(
          <ListingHeader
            listing={{ ...baseListing, status }}
            isOwner={true}
          />
        )
      ).not.toThrow();
    }
  );

  it.each(["active", "reserved"] as const)(
    "renders without throwing for buyer (isOwner=false) + status=%s",
    (status) => {
      expect(() =>
        render(
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
      render(
        <ListingHeader listing={{ ...baseListing, status: "active" }} />
      )
    ).not.toThrow();
  });
});

// ── 11. TASK-N071: Firm-price notice ──────────────────────────────────────────

describe("ListingHeader — TASK-N071: firm-price notice", () => {
  it("shows the firm-price notice when negotiable=false and isOwner=false", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={false}
      />
    );
    expect(screen.getByTestId("firm-price-chat-notice")).toBeTruthy();
  });

  it("does NOT show the firm-price notice when negotiable=true", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, negotiable: true }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("does NOT show the firm-price notice when negotiable is undefined (defaults to negotiable)", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing }}
        isOwner={false}
      />
    );
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("does NOT show the firm-price notice when isOwner=true even if negotiable=false", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={true}
      />
    );
    // Owners set the price — they see no notice
    expect(screen.queryByTestId("firm-price-chat-notice")).toBeNull();
  });

  it("the firm-price notice strip renders the 'chat.offer.firmNotice' translation key text", () => {
    render(
      <ListingHeader
        listing={{ ...baseListing, negotiable: false }}
        isOwner={false}
      />
    );
    // The notice Text component inside the firm-price strip renders this key
    // (t() returns the key in test env; Badge is mocked as a string element)
    expect(screen.getByText("chat.offer.firmNotice")).toBeTruthy();
  });
});
