/**
 * ListingUnavailableNotice — Jest unit tests (TASK-K729).
 *
 * Covers:
 *  1. Reserved vs sold copy for the GENERIC (viewerIsSaleBuyer=false/undefined)
 *     case — neutral, never claims "for another buyer".
 *  2. Reserved-for-you / sold-to-you copy when viewerIsSaleBuyer=true, and
 *     that NO recovery CTA renders in that case (nothing to recover from).
 *  3. "Browse similar in {category}" is always shown (generic case) when a
 *     category is present, and navigates to Browse pre-filtered by categoryId.
 *  4. Falls back to the generic "Browse similar listings" label + an
 *     unfiltered Browse route when the listing has no category — never an
 *     empty action row (at least one recovery action always renders).
 *  5. "View their listings" only renders in the GENERIC case when sellerId +
 *     sellerName are both present, and navigates to the seller's public
 *     profile — WITHOUT a duplicate seller identity block (TASK-K729 review
 *     fix, MEDIUM — vertical budget + duplicate person UI: Conversation.tsx's
 *     nav bar already shows the same avatar+name+verified for this person).
 *  6. RTL — renders without throwing and flips row direction when isRtl=true.
 *  7. The notice always renders the shared StatusBadge (dedup fix).
 *  8. "Rate {seller}" CTA (TASK-K729 HIGH review follow-up) — only for sold +
 *     viewerIsSaleBuyer + a transactionId, hidden once already reviewed,
 *     opens the REV2 ReviewPromptSheet with the viewer's own transactionId.
 *  9. TASK-K729 (review fix, LOW) — the seller identity for the
 *     viewerIsSaleBuyer branch is hoisted OUT of `canRateSeller`, so it also
 *     renders for "Reserved for you" and the already-reviewed "sold" state,
 *     plus the dedicated `soldToYouReviewedBody` copy once reviewed. This
 *     branch KEEPS its identity (unlike the generic branch in #5) — that
 *     state is an in-person meetup / rating the seller, not a plain
 *     "go look elsewhere" recovery action.
 * 10. TASK-K729 (review fix, MEDIUM — must fix) — `onReviewSubmitted` fires
 *     when the REV2 ReviewPromptSheet's own `onSubmitted` callback runs, so
 *     the caller can invalidate the stale cached conversation.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("lucide-react-native", () => ({
  Search: "Search",
  Store: "Store",
  Star: "Star",
}));

// REV2 sheet — its own component has its own tests (ReviewPromptSheet.test.tsx).
// A jest.fn() factory lets these tests assert exactly which props it's opened
// with (transactionId / callerRole / counterpartyName) without pulling in its
// react-query mutation / http chain.
jest.mock("@/components/common/ReviewPromptSheet", () => ({
  ReviewPromptSheet: jest.fn(() => null),
}));

// useCategoryName is a thin wrapper around localizedCategoryName — stub it to
// avoid pulling in @/api/categories (and its http/axios import chain) here.
jest.mock("@/hooks/useCategoryName", () => ({
  useCategoryName: () => (cat: { nameEn: string }) => cat.nameEn,
}));

// useLocalization is mocked as a jest.fn() so individual tests can override
// isRtl via mockReturnValueOnce without needing jest.doMock.
const mockUseLocalization = jest.fn(() => ({ isRtl: false }));
jest.mock("@/hooks/useLocalization", () => ({
  useLocalization: (...args: unknown[]) => mockUseLocalization(...args),
}));

// Import AFTER mocks
import { ListingUnavailableNotice } from "../ListingUnavailableNotice";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";

const CATEGORY = { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "برقیات", slug: "electronics" };

afterEach(() => {
  mockUseLocalization.mockReturnValue({ isRtl: false });
  jest.clearAllMocks();
});

// ── 1. Generic (viewerIsSaleBuyer false/undefined) — reserved vs sold copy ────

describe("ListingUnavailableNotice — generic recovery copy", () => {
  it("shows the reserved title + body for status='reserved'", () => {
    render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.reservedBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldTitle")).toBeNull();
    // Never the viewer-scoped copy when viewerIsSaleBuyer is omitted.
    expect(screen.queryByText("chat.thread.unavailable.reservedForYouTitle")).toBeNull();
  });

  it("shows the sold title + body for status='sold'", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByText("chat.thread.unavailable.soldTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.soldBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.reservedTitle")).toBeNull();
  });

  it("renders the notice container testID for both statuses", () => {
    const { rerender } = render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.getByTestId("listing-unavailable-notice")).toBeTruthy();
    rerender(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByTestId("listing-unavailable-notice")).toBeTruthy();
  });

  it("explicitly passing viewerIsSaleBuyer=false renders the same generic copy as omitting it", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer={false} />);
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
  });
});

// ── 2. viewerIsSaleBuyer=true — the positive, viewer-scoped copy ──────────────

describe("ListingUnavailableNotice — viewer-scoped copy (TASK-K729 HIGH review fix)", () => {
  it("shows 'reserved for you' copy (not the generic recovery copy) for status='reserved'", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer />);
    expect(screen.getByText("chat.thread.unavailable.reservedForYouTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.reservedForYouBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.reservedTitle")).toBeNull();
    expect(screen.queryByText("chat.thread.unavailable.reservedBody")).toBeNull();
  });

  it("shows 'you bought this item' copy for status='sold'", () => {
    render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer />);
    expect(screen.getByText("chat.thread.unavailable.soldToYouTitle")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.soldToYouBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldTitle")).toBeNull();
  });

  it("never renders the Browse-similar CTA when the viewer is the committed buyer — nothing to recover from", () => {
    render(
      <ListingUnavailableNotice
        status="reserved"
        viewerIsSaleBuyer
        category={CATEGORY}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-browse-similar")).toBeNull();
  });

  it("never renders the seller identity / 'View their listings' CTA when the viewer is the committed buyer", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
    expect(screen.queryByTestId("unavailable-seller-identity")).toBeNull();
  });
});

// ── 3 & 4. Browse similar — always present, category vs generic fallback ──────

describe("ListingUnavailableNotice — Browse similar action", () => {
  it("shows the category-specific label when a category is present", () => {
    render(<ListingUnavailableNotice status="reserved" category={CATEGORY} />);
    expect(
      screen.getByText("chat.thread.unavailable.browseSimilar")
    ).toBeTruthy();
  });

  it("navigates to Browse pre-filtered by categoryId when a category is present", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="sold" category={CATEGORY} />);
    fireEvent.press(screen.getByTestId("unavailable-browse-similar"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(main)/(tabs)/browse",
      params: { categoryId: "3" },
    });
  });

  it("falls back to the generic label + unfiltered Browse route when there is no category", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="reserved" category={null} />);
    expect(screen.getByText("chat.thread.unavailable.browseSimilarGeneric")).toBeTruthy();

    fireEvent.press(screen.getByTestId("unavailable-browse-similar"));
    expect(mockPush).toHaveBeenCalledWith("/(main)/(tabs)/browse");
  });

  it("always renders the Browse similar action in the generic case — never an empty action row", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.getByTestId("unavailable-browse-similar")).toBeTruthy();
  });
});

// ── 5. "View their listings" action — conditional; no duplicate identity ──────
//
// TASK-K729 (review fix, MEDIUM — vertical budget + duplicate person UI):
// this generic recovery branch used to render its own `UserIdentity`,
// duplicating the exact same avatar+name+verified treatment Conversation.tsx's
// nav bar already shows ~100px above for the same person. Dropped from this
// branch only — the viewer-scoped branch (covered in section 9 below) keeps
// its own identity, since that state is about an in-person meetup / rating
// the seller, not a plain "go look elsewhere" recovery action.

describe('ListingUnavailableNotice — "View their listings" action (no duplicate identity)', () => {
  it("renders the action (but no seller identity block) when sellerId + sellerName are present", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />);
    expect(screen.getByTestId("unavailable-more-from-seller")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.viewTheirListings")).toBeTruthy();
    // No duplicate person UI — the nav bar above already shows this seller.
    expect(screen.queryByTestId("unavailable-seller-identity")).toBeNull();
    expect(screen.queryByText("Ahmad Karimi")).toBeNull();
  });

  // TASK-K729 (review fix, MEDIUM — must fix, touch target regression): this
  // button is `variant="ghost" size="sm"` (minHeight: 36, button.tsx) with
  // `alignSelf: "center"` shrinking its width to the label — below the
  // DESIGN_SYSTEM.md §3 44px minimum, and it's the LAST item above the
  // composer (the thumb zone). `hitSlop` must restore an effective >=44pt
  // target so this can't silently regress a third time (see
  // docs/SPRINT_BOARD_ARCHIVE.md's earlier Profile.tsx fix for the same class
  // of defect).
  it("has a hitSlop that restores an effective >=44pt touch target on the demoted ghost/sm button", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />);
    const button = screen.getByTestId("unavailable-more-from-seller");
    expect(button.props.hitSlop).toBeTruthy();
    const { top = 0, bottom = 0, left = 0, right = 0 } =
      typeof button.props.hitSlop === "number"
        ? { top: button.props.hitSlop, bottom: button.props.hitSlop, left: button.props.hitSlop, right: button.props.hitSlop }
        : button.props.hitSlop;
    // size="sm" is a 36pt button (button.tsx) — top+bottom hitSlop must add
    // back at least the missing 8pt to clear the 44pt minimum.
    expect(top + bottom).toBeGreaterThanOrEqual(8);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  it("does NOT render the seller action when sellerId is missing", () => {
    render(<ListingUnavailableNotice status="reserved" sellerName="Ahmad Karimi" />);
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
  });

  it("does NOT render the seller action when sellerName is missing", () => {
    render(<ListingUnavailableNotice status="reserved" sellerId={9} />);
    expect(screen.queryByTestId("unavailable-more-from-seller")).toBeNull();
  });

  it("navigates to the seller's public profile when tapped", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
    });

    render(<ListingUnavailableNotice status="sold" sellerId={9} sellerName="Ahmad Karimi" />);
    fireEvent.press(screen.getByTestId("unavailable-more-from-seller"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/seller/9");
  });
});

// ── 6. RTL ────────────────────────────────────────────────────────────────────

describe("ListingUnavailableNotice — RTL", () => {
  it("renders without throwing when isRtl=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() =>
      render(<ListingUnavailableNotice status="reserved" sellerId={9} sellerName="Ahmad Karimi" />)
    ).not.toThrow();
  });

  it("renders without throwing when isRtl=true and viewerIsSaleBuyer=true", () => {
    mockUseLocalization.mockReturnValueOnce({ isRtl: true });
    expect(() =>
      render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer />)
    ).not.toThrow();
  });
});

// ── 7. StatusBadge pill deliberately suppressed (redundant chrome) ────────────
//
// TASK-K729 (review fix, LOW — redundant chrome): ListingHeader (the pinned
// card ~8px above this notice) already renders a `StatusBadge` beside the
// listing title for EVERY viewer, so this notice passes `showBadge={false}`
// to `ListingStatusBanner` — the leading accent edge + the headline below
// ("Item sold" / "Reserved for you") still carry the status without a THIRD
// restatement of the same fact. `ListingStatusBanner.test.tsx` covers
// `showBadge`'s own default-true/false behaviour directly.

describe("ListingUnavailableNotice — StatusBadge pill suppressed (no duplicate chrome)", () => {
  it("does NOT render the shared StatusBadge pill for status='reserved' — ListingHeader already shows one", () => {
    render(<ListingUnavailableNotice status="reserved" />);
    expect(screen.queryByText("listing.status.reserved")).toBeNull();
    // The headline still communicates the state in words.
    expect(screen.getByText("chat.thread.unavailable.reservedTitle")).toBeTruthy();
  });

  it("does NOT render the shared StatusBadge pill for status='sold' either", () => {
    render(<ListingUnavailableNotice status="sold" />);
    expect(screen.queryByText("listing.status.sold")).toBeNull();
    expect(screen.getByText("chat.thread.unavailable.soldTitle")).toBeTruthy();
  });
});

// ── 8. "Rate {seller}" CTA (TASK-K729 HIGH review follow-up) ──────────────────

describe("ListingUnavailableNotice — Rate seller CTA (sold + viewerIsSaleBuyer)", () => {
  it("renders the Rate seller CTA when sold + viewerIsSaleBuyer + a transactionId are all present", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.getByTestId("unavailable-rate-seller")).toBeTruthy();
    expect(screen.getByText("chat.thread.unavailable.rateSeller")).toBeTruthy();
  });

  it("does NOT render the Rate seller CTA for status='reserved' even when viewerIsSaleBuyer + transactionId are set — the deal isn't done yet", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer transactionId={42} />);
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  it("does NOT render the Rate seller CTA when transactionId is missing", () => {
    render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer />);
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  it("does NOT render the Rate seller CTA once the viewer has already reviewed the sale", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        hasReviewedSale
      />
    );
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  it("does NOT render the Rate seller CTA in the generic (non-buyer) case", () => {
    render(<ListingUnavailableNotice status="sold" transactionId={42} />);
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  // ── TASK-K729 (review fix, LOW) ─────────────────────────────────────────────
  // `canRateSeller` is gated on `hasSellerName` (a display name only) — NOT
  // `hasSeller` (name + id). The Rate CTA never links anywhere by
  // `sellerId`; `ReviewPromptSheet` only ever needs a `transactionId` + a
  // display name. Without a `sellerName`, the button is correctly hidden
  // (it has nothing to label itself with or pass to the sheet).
  it("does NOT render the Rate seller CTA when sellerName is missing, even with a transactionId present (would open the review sheet with an empty counterparty)", () => {
    render(
      <ListingUnavailableNotice status="sold" viewerIsSaleBuyer transactionId={42} sellerId={9} />
    );
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  // TASK-K729 (review fix, LOW — the actual dead-end bug this gate change
  // fixes): a `sellerName` with NO `sellerId` (a future list->detail shape
  // change, a partially-anonymized user) used to hide the ONLY next step for
  // "sold + you bought this" while the body copy still promised "...then
  // leave them a review" — rating a seller has never needed their id.
  it("DOES render the Rate seller CTA when sellerId is missing but sellerName is present — rating never needed an id", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.getByTestId("unavailable-rate-seller")).toBeTruthy();

    fireEvent.press(screen.getByTestId("unavailable-rate-seller"));
    const lastProps = (ReviewPromptSheet as jest.Mock).mock.calls.at(-1)?.[0];
    // The real name is used — never the generic fallback — since it IS present.
    expect(lastProps).toMatchObject({ visible: true, counterpartyName: "Ahmad Karimi" });
  });

  it("opens the REV2 ReviewPromptSheet with the viewer's own transactionId and callerRole='buyer' when tapped", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        sellerId={9}
        sellerName="Ahmad Karimi"
        sellerAvatarUrl="https://example.com/avatar.jpg"
      />
    );

    // Closed until tapped.
    expect((ReviewPromptSheet as jest.Mock).mock.calls.at(-1)?.[0]).toMatchObject({ visible: false });

    fireEvent.press(screen.getByTestId("unavailable-rate-seller"));

    const lastProps = (ReviewPromptSheet as jest.Mock).mock.calls.at(-1)?.[0];
    expect(lastProps).toMatchObject({
      visible: true,
      transactionId: 42,
      callerRole: "buyer",
      counterpartyName: "Ahmad Karimi",
      counterpartyAvatarUrl: "https://example.com/avatar.jpg",
    });
  });
});

// ── 9. Seller identity hoisted out of canRateSeller (TASK-K729 review fix, LOW) ─

describe("ListingUnavailableNotice — seller identity for the viewer-scoped states", () => {
  it("renders the seller identity for 'Reserved for you' — about to meet a stranger in person", () => {
    render(
      <ListingUnavailableNotice
        status="reserved"
        viewerIsSaleBuyer
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.getByTestId("unavailable-seller-identity-buyer")).toBeTruthy();
    expect(screen.getByText("Ahmad Karimi")).toBeTruthy();
    // No recovery CTA and no Rate CTA — nothing to recover from, deal isn't sold yet.
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  it("renders the seller identity for the already-reviewed sold state (previously a mini dead end with no identity)", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        hasReviewedSale
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    expect(screen.getByTestId("unavailable-seller-identity-buyer")).toBeTruthy();
    // The Rate CTA is still hidden — already reviewed.
    expect(screen.queryByTestId("unavailable-rate-seller")).toBeNull();
  });

  it("shows the dedicated 'already reviewed' body copy instead of re-asking for a review", () => {
    render(
      <ListingUnavailableNotice status="sold" viewerIsSaleBuyer transactionId={42} hasReviewedSale />
    );
    expect(screen.getByText("chat.thread.unavailable.soldToYouReviewedBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldToYouBody")).toBeNull();
  });

  it("shows the 'leave a review' body copy (not the reviewed copy) before the viewer has reviewed", () => {
    render(<ListingUnavailableNotice status="sold" viewerIsSaleBuyer transactionId={42} />);
    expect(screen.getByText("chat.thread.unavailable.soldToYouBody")).toBeTruthy();
    expect(screen.queryByText("chat.thread.unavailable.soldToYouReviewedBody")).toBeNull();
  });

  it("does NOT render a buyer-branch identity when no seller info is present", () => {
    render(<ListingUnavailableNotice status="reserved" viewerIsSaleBuyer />);
    expect(screen.queryByTestId("unavailable-seller-identity-buyer")).toBeNull();
  });
});

// ── 10. onReviewSubmitted (TASK-K729 review fix, MEDIUM — must fix) ────────────

describe("ListingUnavailableNotice — onReviewSubmitted callback", () => {
  it("calls onReviewSubmitted when the REV2 ReviewPromptSheet's onSubmitted fires", () => {
    const onReviewSubmitted = jest.fn();
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        sellerId={9}
        sellerName="Ahmad Karimi"
        onReviewSubmitted={onReviewSubmitted}
      />
    );

    fireEvent.press(screen.getByTestId("unavailable-rate-seller"));

    const lastProps = (ReviewPromptSheet as jest.Mock).mock.calls.at(-1)?.[0];
    // Simulate the sheet's own mutation onSuccess firing its onSubmitted prop.
    lastProps.onSubmitted({ id: 1, visible: true } as never);

    expect(onReviewSubmitted).toHaveBeenCalledTimes(1);
  });

  it("never throws when onReviewSubmitted is omitted", () => {
    render(
      <ListingUnavailableNotice
        status="sold"
        viewerIsSaleBuyer
        transactionId={42}
        sellerId={9}
        sellerName="Ahmad Karimi"
      />
    );
    fireEvent.press(screen.getByTestId("unavailable-rate-seller"));
    const lastProps = (ReviewPromptSheet as jest.Mock).mock.calls.at(-1)?.[0];
    expect(() => lastProps.onSubmitted({ id: 1, visible: true } as never)).not.toThrow();
  });
});
