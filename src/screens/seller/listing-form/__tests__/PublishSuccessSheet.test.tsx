/**
 * PublishSuccessSheet unit tests — TASK-J952 (+ review-fix pass).
 *
 * Asserts:
 *  - The three actions (Share listing / View as buyer / Post another) and
 *    the Done button render from the `listing.form.publishSuccess.*` i18n
 *    keys (react-i18next's t() mock returns the key unchanged for those —
 *    see the local override below, which mirrors src/__tests__/setup.ts but
 *    additionally interpolates `listing.share.body` for the share tests).
 *  - Pressing "Share listing" invokes RN's Share.share with the resolved
 *    share URL, built from the SAME localized `listing.share.body` i18n
 *    template ListingDetail.handleShare uses (not a hardcoded JS string) —
 *    both when the backend provides an https shareUrl and when it falls
 *    back to the hatiwal:// deep link via resolveShareUrl.
 *  - "View as buyer" pushes the public listing route and closes the sheet.
 *  - "Post another" replaces with the create-form route and closes the sheet.
 *  - Pressing Done / the close (X) icon / the backdrop all call onClose.
 *  - Renders null when listing is null, and null when visible=false.
 *  - A listing with no photo renders the muted Camera icon tile, never a
 *    RemoteImage with the loading blurhash standing in as a fake photo.
 *  - Content is wrapped in a ScrollView so it never clips at large font
 *    sizes (the sheet also caps itself with `maxHeight`).
 *  - RTL layout (isRtl) does not throw.
 *  - A success haptic fires exactly once per open (design review fix,
 *    CYCLE-4) — not at all while closed, and not again on a re-render that
 *    keeps `visible` true (e.g. the listing object being re-seeded by a
 *    background refetch).
 *
 * useLocalization/useColors are mocked globally (setup.ts). react-i18next is
 * re-mocked locally (below) to add real interpolation for `listing.share.body`.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Share, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import type { Listing } from "@/api/listings";

// ─── Additional mocks (on top of the global setup.ts mocks) ───────────────────

jest.mock("lucide-react-native", () => ({
  CheckCircle2: "CheckCircle2",
  Share2: "Share2",
  Eye: "Eye",
  Plus: "Plus",
  X: "X",
  Camera: "Camera",
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => `hatiwal://${path}`),
}));

// react-i18next: same "return the key" behavior as the global setup.ts mock,
// but `listing.share.body` additionally interpolates — needed to assert the
// actual share text (title/price/url), which the global mock (key-only)
// can't exercise. Mirrors the real `"{{title}} — {{price}}\n{{url}}"` template
// from src/i18n/locales/en/listing.json.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "listing.share.body" && opts) {
        return `${opts.title} — ${opts.price}\n${opts.url}`;
      }
      return key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

import { PublishSuccessSheet } from "../PublishSuccessSheet";

// ─── Fixture ────────────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 501,
    title: "Lenovo ThinkPad X1 Carbon",
    description: "Excellent condition.",
    price: 45000,
    currency: "AFN",
    status: "active",
    categoryId: 3,
    location: "Kabul",
    address: "Near the blue mosque",
    latitude: 34.5,
    longitude: 69.1,
    thumbnailUrl: "https://example.com/photo.jpg",
    imageUrls: ["https://example.com/photo.jpg"],
    images: ["https://example.com/photo.jpg"],
    shareUrl: null,
    viewsCount: 0,
    negotiable: true,
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z",
    seller: { id: 1, name: "Ahmad Karimi", city: "Kabul" },
    category: { id: 3, nameEn: "Electronics", namePs: "برقی توکي", nameFa: "الکترونیک", slug: "electronics" },
    ...overrides,
  };
}

function buildProps(
  overrides: Partial<React.ComponentProps<typeof PublishSuccessSheet>> = {}
): React.ComponentProps<typeof PublishSuccessSheet> {
  return {
    visible: true,
    listing: makeListing(),
    onClose: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Rendering — key copy elements from i18n keys ─────────────────────────────

describe("PublishSuccessSheet — rendering", () => {
  it("renders the headline and subtitle", () => {
    render(<PublishSuccessSheet {...buildProps()} />);
    expect(screen.getByText("listing.form.publishSuccess.title")).toBeTruthy();
    expect(screen.getByText("listing.form.publishSuccess.subtitle")).toBeTruthy();
  });

  it("renders the three actions and the Done button from the i18n keys", () => {
    render(<PublishSuccessSheet {...buildProps()} />);
    expect(screen.getByText("listing.form.publishSuccess.share")).toBeTruthy();
    expect(screen.getByText("listing.form.publishSuccess.viewAsBuyer")).toBeTruthy();
    expect(screen.getByText("listing.form.publishSuccess.postAnother")).toBeTruthy();
    expect(screen.getByText("listing.form.publishSuccess.done")).toBeTruthy();
  });

  it("renders the listing title and summary row", () => {
    render(<PublishSuccessSheet {...buildProps({ listing: makeListing({ title: "Samsung Galaxy S22" }) })} />);
    expect(screen.getByTestId("publish-success-summary")).toBeTruthy();
    expect(screen.getByText("Samsung Galaxy S22")).toBeTruthy();
  });

  it("renders null when listing is null", () => {
    const { toJSON } = render(<PublishSuccessSheet {...buildProps({ listing: null })} />);
    expect(toJSON()).toBeNull();
  });

  it("renders null when visible=false (Modal hides its content)", () => {
    const { toJSON } = render(<PublishSuccessSheet {...buildProps({ visible: false })} />);
    expect(toJSON()).toBeNull();
  });

  it("wraps its content in a ScrollView so it never clips at large font sizes", () => {
    const { UNSAFE_getAllByType } = render(<PublishSuccessSheet {...buildProps()} />);
    expect(UNSAFE_getAllByType(ScrollView).length).toBeGreaterThan(0);
  });
});

// ─── No photo — muted icon tile, never a fake-loading blurhash ────────────────

describe("PublishSuccessSheet — no photo", () => {
  it("renders the muted Camera icon tile when the listing has no photo", () => {
    render(
      <PublishSuccessSheet
        {...buildProps({
          listing: makeListing({ thumbnailUrl: null, imageUrls: [], images: [] }),
        })}
      />
    );
    expect(screen.getByTestId("publish-success-no-photo")).toBeTruthy();
  });

  it("does not render the no-photo tile when the listing has a real thumbnail", () => {
    render(<PublishSuccessSheet {...buildProps()} />);
    expect(screen.queryByTestId("publish-success-no-photo")).toBeNull();
  });
});

// ─── Share — reuses resolveShareUrl + buildShareBody + RN Share.share ────────

describe("PublishSuccessSheet — share action", () => {
  it("calls Share.share with the server-provided https share URL embedded in the message", async () => {
    render(
      <PublishSuccessSheet
        {...buildProps({
          listing: makeListing({
            title: "Lenovo ThinkPad X1 Carbon",
            price: 45000,
            currency: "AFN",
            shareUrl: "https://hatiwal.example.com/l/501",
          }),
        })}
      />
    );

    fireEvent.press(screen.getByTestId("publish-success-share"));

    await Promise.resolve();

    expect(Share.share).toHaveBeenCalledTimes(1);
    const shareArg = (Share.share as jest.Mock).mock.calls[0][0];
    expect(shareArg.title).toBe("Lenovo ThinkPad X1 Carbon");
    expect(shareArg.message).toContain("https://hatiwal.example.com/l/501");
    expect(shareArg.message).toContain("Lenovo ThinkPad X1 Carbon");
  });

  it("falls back to a hatiwal:// deep link when shareUrl is absent", async () => {
    render(
      <PublishSuccessSheet
        {...buildProps({
          listing: makeListing({ id: 77, shareUrl: null }),
        })}
      />
    );

    fireEvent.press(screen.getByTestId("publish-success-share"));

    await Promise.resolve();

    const shareArg = (Share.share as jest.Mock).mock.calls[0][0];
    expect(shareArg.message).toMatch(/hatiwal:\/\/listing\/77/);
  });

  it("does not throw and swallows rejection when the user dismisses the native share sheet", async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error("dismissed"));
    render(<PublishSuccessSheet {...buildProps()} />);

    expect(() => fireEvent.press(screen.getByTestId("publish-success-share"))).not.toThrow();
    await Promise.resolve();
  });
});

// ─── View as buyer ─────────────────────────────────────────────────────────────

describe("PublishSuccessSheet — view as buyer", () => {
  it("pushes the public listing route and closes the sheet", () => {
    const onClose = jest.fn();
    render(<PublishSuccessSheet {...buildProps({ listing: makeListing({ id: 501 }), onClose })} />);

    fireEvent.press(screen.getByTestId("publish-success-view-as-buyer"));

    expect(mockPush).toHaveBeenCalledWith("/(main)/listing/501");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Post another ──────────────────────────────────────────────────────────────

describe("PublishSuccessSheet — post another", () => {
  it("replaces with the create-form route and closes the sheet", () => {
    const onClose = jest.fn();
    render(<PublishSuccessSheet {...buildProps({ onClose })} />);

    fireEvent.press(screen.getByTestId("publish-success-post-another"));

    expect(mockReplace).toHaveBeenCalledWith("/(main)/listing/new");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Dismiss ───────────────────────────────────────────────────────────────────

describe("PublishSuccessSheet — dismiss", () => {
  it("calls onClose when Done is pressed", () => {
    const onClose = jest.fn();
    render(<PublishSuccessSheet {...buildProps({ onClose })} />);
    fireEvent.press(screen.getByTestId("publish-success-done"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close (X) icon is pressed", () => {
    const onClose = jest.fn();
    render(<PublishSuccessSheet {...buildProps({ onClose })} />);
    fireEvent.press(screen.getByTestId("publish-success-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(<PublishSuccessSheet {...buildProps({ onClose })} />);
    const accessibleViews = UNSAFE_getAllByType(require("react-native").View).filter(
      (v: any) => v.props.accessible === true
    );
    expect(accessibleViews.length).toBeGreaterThan(0);
    fireEvent.press(accessibleViews[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── RTL layout ───────────────────────────────────────────────────────────────

describe("PublishSuccessSheet — RTL locale", () => {
  it("renders without throwing when isRtl is true (Pashto/Dari locale)", () => {
    jest.spyOn(require("@/hooks/useLocalization"), "useLocalization").mockReturnValue({
      formatCurrency: (amount: number, currency = "AFN") => `${currency} ${amount}`,
      formatDate: (d: string) => d,
      formatDateShort: (d: string) => d,
      formatTime: (d: string) => d,
      formatDateTime: (d: string) => d,
      formatNumber: (n: number) => String(n),
      isRtl: true,
      lang: "ps",
    });

    expect(() => render(<PublishSuccessSheet {...buildProps()} />)).not.toThrow();

    jest.restoreAllMocks();
  });
});

// ─── Success haptic (design review fix, CYCLE-4) ──────────────────────────────

describe("PublishSuccessSheet — success haptic", () => {
  it("fires a success haptic when the sheet opens", () => {
    render(<PublishSuccessSheet {...buildProps({ visible: true })} />);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it("does not fire a haptic while closed", () => {
    render(<PublishSuccessSheet {...buildProps({ visible: false })} />);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("does not fire a haptic when visible=true but listing=null (sheet renders nothing)", () => {
    // Explicitly-supported prop shape (MyListingDetail passes `listing ?? null`
    // before its own data has loaded) — the sheet must stay silent, not just
    // visually absent, when there is nothing on screen to celebrate.
    render(<PublishSuccessSheet {...buildProps({ visible: true, listing: null })} />);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("fires the haptic again on a fresh open, not on every re-render", () => {
    const { rerender } = render(<PublishSuccessSheet {...buildProps({ visible: false })} />);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();

    rerender(<PublishSuccessSheet {...buildProps({ visible: true })} />);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    // Same listing object re-seeded (identity change) while still visible —
    // must NOT re-fire.
    rerender(<PublishSuccessSheet {...buildProps({ visible: true, listing: makeListing() })} />);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});
