import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ListingUnavailableNotice } from "./ListingUnavailableNotice";

const meta: Meta<typeof ListingUnavailableNotice> = {
  title: "Chat/ListingUnavailableNotice",
  component: ListingUnavailableNotice,
};

export default meta;
type Story = StoryObj<typeof ListingUnavailableNotice>;

const CATEGORY = {
  id: 3,
  nameEn: "Electronics",
  namePs: "برقی توکي",
  nameFa: "برقیات",
  slug: "electronics",
};

// Reserved — generic recovery copy, category known, seller known. Both
// recovery actions render.
export const Reserved: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
    sellerVerified: true,
  },
};

// Sold — same as Reserved but the terminal, dimmed-tone state.
export const Sold: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
    sellerVerified: true,
  },
};

// No category on the listing — falls back to the generic "Browse similar
// listings" label/route. "View their listings" still shows. Never an empty
// action row.
export const NoCategoryFallback: Story = {
  args: {
    status: "reserved",
    category: null,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// No seller info on the conversation payload — only "Browse similar" shows;
// at least one recovery action always renders, never a dead end.
export const NoSellerInfo: Story = {
  args: {
    status: "sold",
    category: CATEGORY,
  },
};

// Minimal payload — neither category nor seller. Still shows the generic
// Browse action.
export const MinimalPayload: Story = {
  args: {
    status: "reserved",
  },
};

// TASK-K729 (HIGH review fix) — the viewer IS the buyer the seller committed
// to: a positive headline, no recovery CTAs (nothing to recover from).
export const ReservedForYou: Story = {
  args: {
    status: "reserved",
    viewerIsSaleBuyer: true,
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

export const SoldToYou: Story = {
  args: {
    status: "sold",
    viewerIsSaleBuyer: true,
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// TASK-K729 (HIGH review follow-up) — the real next step for "sold + you
// bought this": a "Rate {seller}" CTA opening the REV2 review prompt.
export const SoldToYouCanRate: Story = {
  args: {
    status: "sold",
    viewerIsSaleBuyer: true,
    transactionId: 501,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
    sellerVerified: true,
  },
};

// Already reviewed — the CTA is hidden (the server would 422 on a duplicate).
export const SoldToYouAlreadyReviewed: Story = {
  args: {
    status: "sold",
    viewerIsSaleBuyer: true,
    transactionId: 501,
    hasReviewedSale: true,
    sellerId: 42,
    sellerName: "Ahmad Karimi",
  },
};

// A long seller name (with the longer ps/fa button labels in mind) — the
// recovery CTAs must never overflow. TASK-K729 (review fix, MEDIUM —
// truncated CTAs): the two actions are stacked full-width (not a shared
// `flex: 1` row) with `numberOfLines={2}` labels, so a long label WRAPS to a
// second line instead of truncating mid-word.
export const LongSellerName: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Mohammad Ismail Ahmadzai Popalzai",
  },
};

// Pashto RTL — long ps/fa CTA labels ("مشاهده موارد مشابه در {{category}}",
// "سایر آگهی‌های {{name}}") mirrored correctly. Both actions are stacked
// full-width column buttons (see LongSellerName above), so RTL only affects
// the icon/label row direction inside each button, not the stack itself.
export const ReservedPashtoRtl: Story = {
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "احمد کریمی",
  },
};

// TASK-K729 (review fix, MEDIUM — truncated CTAs): the two recovery buttons
// used to share ONE row (`flex: 1` each) — on a 360dp-wide device (the
// stated target, e.g. mid-range Android) that left ~17 characters per
// button, truncating the PRIMARY CTA mid-word (worst in ps/fa, whose labels
// run longer than English). They now stack full-width instead. Wrapping this
// story's own preview in a fixed 360-wide container catches a truncation
// regression visually — `LongSellerName`/`ReservedPashtoRtl` above only
// assert "must never overflow", which truncation doesn't trip.
export const Width360Dp: Story = {
  decorators: [
    (Story) => (
      <View style={{ width: 360 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Mohammad Ismail Ahmadzai Popalzai",
  },
};

// TASK-K729 (review fix, LOW — test/story coverage): `Width360Dp` above only
// exercises an English long name; the truncation risk that motivated the
// stacked layout actually lives in the LONGER ps/fa CTA labels themselves
// ("مشاهده موارد مشابه در برقیات", "د هغه/هغې نور توکي وګورئ"), and
// `ReservedPashtoRtl` (unconstrained width) doesn't catch a 360dp regression.
// Switch device/Storybook locale to 'ps' or 'fa' to see the actual mirrored
// labels — the component reads `isRtl` from useLocalization() at runtime.
export const Width360DpPashtoRtl: Story = {
  decorators: [
    (Story) => (
      <View style={{ width: 360 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    status: "reserved",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "محمد اسماعیل احمدزی پوپلزی",
  },
};

// TASK-K729 (review fix, LOW — test/story coverage): `Width360Dp` above only
// covers `status="reserved"` — `sold` is the state where BOTH the
// `StatusBadge` pill and the "View their listings" button's border
// historically lost contrast against the accent-filled banner (fixed by
// ListingStatusBanner's `layout="row"` colors.card surface), so it needs its
// own 360dp regression guard too.
export const Width360DpSold: Story = {
  decorators: [
    (Story) => (
      <View style={{ width: 360 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    status: "sold",
    category: CATEGORY,
    sellerId: 42,
    sellerName: "Mohammad Ismail Ahmadzai Popalzai",
  },
};
