/**
 * soldShowcaseEmptyState unit tests (TASK-TX02 review fix — MAJOR)
 *
 * Regression covered: the public seller profile's Sold showcase tab used to
 * always render the generic "No sold items yet" empty state, even when the
 * TransactionStatsBadge above it already reported a non-zero lifetime
 * soldCount — a listing removed after being sold falls out of the showcase
 * (`.sold.not_removed` on the backend) without ever decrementing soldCount
 * (by design). That combination directly contradicted the badge on the same
 * screen. getSoldShowcaseEmptyState() now selects honest copy based on
 * whether the seller has ANY lifetime sold count.
 */

import { getSoldShowcaseEmptyState } from "../soldShowcaseEmptyState";

const mockT = jest.fn((key: string) => key);

beforeEach(() => {
  mockT.mockClear();
});

describe("getSoldShowcaseEmptyState", () => {
  it("uses the generic empty copy when soldCount is 0", () => {
    const copy = getSoldShowcaseEmptyState(0, mockT);

    expect(copy.title).toBe("profile.userProfile.sold.emptyTitle");
    expect(copy.description).toBe("profile.userProfile.sold.emptyDescription");
  });

  it("uses the generic empty copy when soldCount is null", () => {
    const copy = getSoldShowcaseEmptyState(null, mockT);

    expect(copy.title).toBe("profile.userProfile.sold.emptyTitle");
  });

  it("uses the generic empty copy when soldCount is undefined", () => {
    const copy = getSoldShowcaseEmptyState(undefined, mockT);

    expect(copy.title).toBe("profile.userProfile.sold.emptyTitle");
  });

  it("uses the 'hidden' copy when soldCount is positive (avoids contradicting the trust badge)", () => {
    const copy = getSoldShowcaseEmptyState(3, mockT);

    expect(copy.title).toBe("profile.userProfile.sold.emptyTitleHidden");
    expect(copy.description).toBe("profile.userProfile.sold.emptyDescriptionHidden");
  });

  it("uses the 'hidden' copy even for soldCount of exactly 1", () => {
    const copy = getSoldShowcaseEmptyState(1, mockT);

    expect(copy.title).toBe("profile.userProfile.sold.emptyTitleHidden");
  });

  it("calls t() with the resolved key", () => {
    getSoldShowcaseEmptyState(2, mockT);

    expect(mockT).toHaveBeenCalledWith("profile.userProfile.sold.emptyTitleHidden");
    expect(mockT).toHaveBeenCalledWith("profile.userProfile.sold.emptyDescriptionHidden");
  });
});
