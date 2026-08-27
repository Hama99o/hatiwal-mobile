/**
 * ListingUnavailableNotice — TASK-K729.
 *
 * SF-M3 (docs/SELL_FLOW_REDESIGN.md §4.4.3): this whole notice is now
 * SOLD-ONLY. A reserved listing stays live and message-able (SF-B1) — it is
 * a normal, fully-usable thread, not a dead end — so `threadAvailability.ts`'s
 * `showUnavailableNotice` guard never feeds this component `status:
 * "reserved"` anymore; only `canOfferInThread` still excludes reserved (the
 * offer button specifically, per §3.2's deliberate "pause new offers, don't
 * pause the thread" judgment call). The `status` prop type below is left as
 * `"reserved" | "sold"` rather than narrowed to `"sold"` only: Conversation.tsx
 * (owned by a different, concurrently in-flight ticket) still asserts
 * `status={conversation.listing.status as "reserved" | "sold"}` at its call
 * site — narrowing here without touching that cast would fail to typecheck.
 * The `reserved`-flavoured copy branches below are consequently dead code at
 * runtime (never reachable through the real guard) but kept for type
 * compatibility; flagged as a fast-follow to fully narrow both together once
 * that other ticket's file is free.
 *
 * Historical (pre-SF-M3) doc, kept for context: when the pinned listing in a
 * chat thread turned `reserved` or `sold`, Conversation.tsx's
 * `canOfferInThread` guard went false and the composer's "Make an offer" row
 * silently disappeared from ComposerActionsSheet — with nothing telling the
 * buyer WHY, and no next step. This card replaces that silent gap with an
 * explicit, VIEWER-SCOPED reason:
 *
 *  - `viewerIsSaleBuyer` true (this conversation's buyer IS the buyer the
 *    seller committed to, per ConversationSerializer's
 *    `listing.viewer_is_sale_buyer`) -> a positive "Reserved for you" /
 *    "You bought this item" headline, no RECOVERY CTAs (there is nothing to
 *    recover from — the deal is real; the composer text input stays fully
 *    usable for arranging the meetup / after-sale chat). On `sold`
 *    specifically, this is the real next step for the winning buyer: a "Rate
 *    {seller}" button that opens the REV2 `ReviewPromptSheet` (using
 *    `listing.viewer_sale_transaction_id`, only ever populated for this exact
 *    viewer) — so "leave them a review" in the body copy isn't a dead end.
 *    Hidden once `viewer_has_reviewed_sale` is true.
 *  - `viewerIsSaleBuyer` false/undefined -> the neutral recovery copy (the
 *    seller has reserved/sold this item — NEVER "to another buyer": that
 *    would assert a fact we may not actually know, e.g. a legacy buyer-less
 *    reserve) plus a real next action: "Browse similar in {category}"
 *    (falling back to a generic label when the listing has no category) and
 *    "View {seller}'s other listings" when the seller is known — mirroring
 *    the buyer-facing recovery CTAs on the web listing detail
 *    (TASK-WEB-SOLDNEXT) so the two clients agree. Never an empty action row.
 *
 * Buyer-facing ONLY — Conversation.tsx renders this behind `!isOwner`. The
 * seller already has the lifecycle controls in ListingHeader and the
 * "Reserved for / Sold to" info in SaleBuyerCard elsewhere; they never see
 * this notice.
 *
 * Composed from shared components only (never hand-rolled): the accent
 * surface (leading edge + headline) comes from `ListingStatusBanner` (also
 * used by ListingDetail's own reserved/sold banner — one status treatment,
 * not two). This notice passes `showBadge={false}` — Conversation.tsx's
 * `ListingHeader`, ~8px above, already renders a `StatusBadge` beside the
 * listing title for every viewer, so this screen renders NO `StatusBadge` of
 * its own; the accent edge + bold headline below still carry the status
 * without a third restatement of the same fact. The seller's positive,
 * viewer-scoped states ("Reserved for you" / "You bought this item", where
 * the buyer is about to meet a stranger in person or is deciding whether to
 * leave a review) show the seller via `UserIdentity` (avatar + name +
 * verified tag). The generic recovery branch deliberately does NOT repeat it.
 *
 * TASK-K729 (review fix, MEDIUM — vertical budget + duplicate person UI):
 * the generic recovery state used to render its OWN `UserIdentity` for the
 * seller even though Conversation.tsx's nav bar already renders the exact
 * same avatar+name+verified treatment for the same person ~100px above,
 * with ListingHeader's thumbnail/title/price between them — the same
 * identity twice in the top chrome for no new information, and ~40px of
 * permanently pinned vertical space this screen can't spare. "View their
 * listings" (with a `Store` icon) already names the action unambiguously
 * beside the seller who's already introduced in the nav bar, so the
 * duplicate was dropped from that branch only; the viewer-scoped branch
 * keeps its identity, since that is the state where trust matters most
 * (an in-person meetup) and it is not repeating anything already on screen
 * for that specific state (the nav bar identity is a smaller nav treatment,
 * this one anchors the CTA immediately below it).
 */
import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Search, Star, Store } from "lucide-react-native";

import { Text } from "@/components/reusables/text";
import { Button } from "@/components/reusables/button";
import { ListingStatusBanner } from "@/components/common/ListingStatusBanner";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { useColors } from "@/hooks/useColors";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryName } from "@/hooks/useCategoryName";
import { useReduceMotion } from "@/lib/animation";
import type { EmbeddedCategory } from "@/api/categories";

/**
 * TASK-K729 (review fix, MEDIUM): re-exported alias — the actual shape is
 * the shared `EmbeddedCategory` (see @/api/categories), the same type
 * `ConversationListingCategory` in src/api/conversations.ts now reuses,
 * instead of each declaring its own identical `{id, nameEn, namePs, nameFa,
 * slug}` type.
 */
export type ListingUnavailableNoticeCategory = EmbeddedCategory;

export interface ListingUnavailableNoticeProps {
  /** Only "reserved" and "sold" ever render this notice — gated by the caller. */
  status: "reserved" | "sold";
  /**
   * True when THIS conversation's buyer is the buyer the seller committed to
   * for the current reservation/sale (ConversationSerializer's
   * `listing.viewer_is_sale_buyer`). Switches the whole notice to the
   * positive, viewer-scoped copy with no recovery CTAs.
   */
  viewerIsSaleBuyer?: boolean;
  category?: ListingUnavailableNoticeCategory | null;
  sellerId?: number;
  sellerName?: string;
  sellerAvatarUrl?: string | null;
  sellerVerified?: boolean;
  /**
   * The viewer's own Transaction id for this sale — `listing.viewer_sale_transaction_id`.
   * Only ever populated when `viewerIsSaleBuyer` is true. Required to render
   * the "Rate {seller}" CTA on a `sold` listing; the CTA is omitted without it.
   */
  transactionId?: number | null;
  /**
   * `listing.viewer_has_reviewed_sale` — hides the "Rate {seller}" CTA once
   * the viewer has already submitted their review (the server 422s on a
   * duplicate, so re-offering it would be a dead end of its own).
   */
  hasReviewedSale?: boolean | null;
  /**
   * TASK-K729 (review fix, MEDIUM — must fix): called after the buyer
   * successfully submits their review via the REV2 `ReviewPromptSheet`.
   * Without this, the cached `["conversation", id]` payload keeps
   * `viewerHasReviewedSale=false` (nothing refetches — the sheet is a plain
   * JS `Modal`, not a route, so `useFocusEffect` never re-fires), so the
   * "Rate {seller}" CTA stays on screen; a second tap re-submits and the
   * server 422s on the uniqueness constraint into an unexplained generic
   * error toast. The caller (Conversation.tsx) wires this to
   * `qc.invalidateQueries({ queryKey: ["conversation", id] })` (mirroring
   * the same refresh `onLifecycleDone` already performs) plus
   * `["pending-reviews"]` so the Profile "Rate your recent deals" nudge
   * doesn't go stale either.
   */
  onReviewSubmitted?: () => void;
}

export function ListingUnavailableNotice({
  status,
  viewerIsSaleBuyer = false,
  category,
  sellerId,
  sellerName,
  sellerAvatarUrl,
  sellerVerified,
  transactionId,
  hasReviewedSale = false,
  onReviewSubmitted,
}: ListingUnavailableNoticeProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  const router = useRouter();
  const getCategoryName = useCategoryName();
  const reduceMotion = useReduceMotion();
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);

  const isSold = status === "sold";
  const rowDir = isRtl ? "row-reverse" : "row";

  const title = viewerIsSaleBuyer
    ? isSold
      ? t("chat.thread.unavailable.soldToYouTitle")
      : t("chat.thread.unavailable.reservedForYouTitle")
    : isSold
    ? t("chat.thread.unavailable.soldTitle")
    : t("chat.thread.unavailable.reservedTitle");

  // TASK-K729 (review fix, LOW): once the viewer has already reviewed the
  // sale, `soldToYouBody`'s "...then leave them a review" no longer matches
  // reality — it asks for an action that's already done and no longer
  // offered (the "Rate {seller}" CTA below is hidden once `hasReviewedSale`
  // is true). A dedicated "thanks" sentence closes the loop instead of
  // silently asking for a review the server would 422 on as a duplicate.
  const body = viewerIsSaleBuyer
    ? isSold
      ? hasReviewedSale
        ? t("chat.thread.unavailable.soldToYouReviewedBody")
        : t("chat.thread.unavailable.soldToYouBody")
      : t("chat.thread.unavailable.reservedForYouBody")
    : isSold
    ? t("chat.thread.unavailable.soldBody")
    : t("chat.thread.unavailable.reservedBody");

  const handleBrowseSimilar = () => {
    if (category) {
      router.push({
        pathname: "/(main)/(tabs)/browse",
        params: { categoryId: String(category.id) },
      } as never);
    } else {
      router.push("/(main)/(tabs)/browse" as never);
    }
  };

  const handleMoreFromSeller = () => {
    if (sellerId == null) return;
    router.push(`/(main)/seller/${sellerId}` as never);
  };

  // `hasSeller` (needs BOTH id + name) gates "View their listings" — it
  // navigates by `sellerId`, so it's a genuine dead button without one.
  const hasSeller = sellerId != null && !!sellerName;
  // The buyer identity block needs ONLY a display name — it never renders a
  // link that requires `sellerId` — so it's gated on `hasSellerName`, not the
  // stricter `hasSeller`. (`canRateSeller` below deliberately does NOT use
  // this gate — see its own comment.)
  const hasSellerName = !!sellerName;
  const browseSimilarLabel = category
    ? t("chat.thread.unavailable.browseSimilar", { category: getCategoryName(category) })
    : t("chat.thread.unavailable.browseSimilarGeneric");
  const viewTheirListingsLabel = t("chat.thread.unavailable.viewTheirListings");

  // TASK-K729 (review fix, HIGH follow-up, then SHOULD-FIX round 2 — dead end
  // on the name axis): the real next step for "sold + viewer-is-buyer" — a
  // "Rate {seller}" CTA opening the REV2 review prompt, so the body copy's
  // "then leave them a review" isn't just text with no action behind it.
  // Requires only the viewer's own transactionId (never leaked for anyone
  // else) and is hidden once already reviewed. Rating genuinely needs
  // NEITHER a `sellerId` NOR a `sellerName` — gating this on `hasSellerName`
  // (an earlier version of this fix) reintroduced the exact dead end the
  // card exists to remove: "sold + viewerIsSaleBuyer + transactionId + no
  // sellerName" rendered `soldToYouBody` ("...then leave them a review")
  // with NO CTA behind it. The label below falls back to a generic name
  // instead, so the CTA is available whenever the viewer can actually rate.
  const canRateSeller = isSold && transactionId != null && !hasReviewedSale;
  // `||`, not `??` — a `sellerName` of `""` (not just missing) should also
  // fall back to the generic label, mirroring the identical `||` fallback on
  // `ReviewPromptSheet`'s `counterpartyName` prop below.
  const rateSellerLabel = t("chat.thread.unavailable.rateSeller", {
    name: sellerName || t("chat.thread.unavailable.rateSellerGenericName"),
  });

  return (
    <>
      <ListingStatusBanner
        testID="listing-unavailable-notice"
        status={status}
        title={title}
        subtitle={body}
        layout="row"
        reduceMotion={reduceMotion}
        // TASK-K729 (review fix, LOW — redundant chrome): ListingHeader
        // (Conversation.tsx's pinned card, ~8px above this banner) already
        // renders a `StatusBadge` beside the listing title for EVERY viewer
        // — a second, identical pill here plus the headline below it
        // ("Item sold") restated the same fact a third time in ~60px of
        // permanently pinned chrome. The leading accent edge + headline
        // still carry the status; only the duplicate pill is dropped.
        showBadge={false}
        // TASK-K729 (review fix, MEDIUM — layout): the banner is a direct
        // child of the screen root (no padding of its own), so an unbounded
        // rounded+bordered card stretched edge-to-edge — its side borders sat
        // exactly on the screen edges (clipped-looking corners) and its top
        // border doubled up on ListingHeader's own bottom hairline.
        style={{ marginHorizontal: 12, marginTop: 8 }}
      >
        {/* The seller is named once here for BOTH viewer-scoped sub-states
            ("Reserved for you" and "You bought this item", reviewed or not)
            — TASK-K729 (review fix, LOW): previously nested inside
            `canRateSeller`, so "Reserved for you" (about to meet a stranger
            in person) and the already-reviewed sold state rendered with no
            identity at all. This identity block (unlike `canRateSeller`
            below, which needs neither) is gated on `hasSellerName` — not
            `hasSeller` — since it never links anywhere, so it needs a name
            and avatar only, not a `sellerId`. */}
        {viewerIsSaleBuyer && (
          <View style={{ gap: 10, marginTop: 2 }}>
            {hasSellerName && (
              <UserIdentity
                name={sellerName as string}
                avatarUrl={sellerAvatarUrl}
                verified={sellerVerified}
                size={32}
                testID="unavailable-seller-identity-buyer"
              />
            )}
            {/* The one and only CTA for the winning buyer — "leave them a
                review" in the body copy above is a real next step, not just
                text. Never rendered for `reserved` (the deal isn't done yet
                — meetup guidance only) nor once the viewer has already
                reviewed the sale. */}
            {canRateSeller && (
              <Button
                variant="default"
                onPress={() => setReviewPromptVisible(true)}
                testID="unavailable-rate-seller"
                accessibilityRole="button"
                accessibilityLabel={rateSellerLabel}
                style={{ alignSelf: isRtl ? "flex-end" : "flex-start", minWidth: 0, maxWidth: "100%" }}
              >
                <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                  {/* TASK-K729 (review fix, LOW-MEDIUM — typography / action
                      hierarchy): was `size={14}` + `fontSize: 12` — 12 is the
                      house META size (DESIGN_SYSTEM.md §3: `text-xs
                      text-muted-foreground`), while the house PRIMARY action
                      label is 14/600 with 16-18px icons (EmptyState.tsx,
                      Profile.tsx's QuickActionCard). This is the winning
                      buyer's only next step on a dead thread — it should read
                      as loud as any other primary CTA, not a caption. */}
                  <Star size={16} color={colors.primaryForeground} />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 14, fontWeight: "600", color: colors.primaryForeground, flexShrink: 1 }}
                  >
                    {rateSellerLabel}
                  </Text>
                </View>
              </Button>
            )}
          </View>
        )}

        {/* Nothing to recover from once the viewer IS the committed buyer — the
            composer text input stays fully usable for the meetup / after-sale
            chat, so no CTA row (and never the "browse away" action, which
            would be a strange thing to suggest to the person who just won the
            deal). */}
        {!viewerIsSaleBuyer && (
          <View style={{ gap: 10, marginTop: 2 }}>
            {/* TASK-K729 (review fix, MEDIUM — vertical budget + duplicate
                person UI): no `UserIdentity` here on purpose. The nav bar
                immediately above (Conversation.tsx) already names and shows
                this exact seller with the same avatar+name+verified
                treatment — repeating it here only added ~40px of pinned
                chrome with no new information. "View their listings" below
                is unambiguous beside a seller already introduced above it. */}

            {/* TASK-K729 (review fix, MEDIUM — truncated CTAs): stacked full
                width instead of two `flex: 1` buttons sharing one row — on a
                360dp screen the shared row left ~17 characters per button,
                truncating the PRIMARY recovery CTA mid-word (worst in
                ps/fa, whose labels run longer than English). `numberOfLines={2}`
                is defensive wrapping if a label is ever still too long for
                one line at full width.
                TASK-K729 (review fix, LOW — touch-target abutment): `gap: 8`
                used to exactly equal the ghost button's `hitSlop.top: 8`
                below, so the two hit regions abutted with 0dp of slack — any
                future gap tightening would silently steal taps from the
                PRIMARY "Browse similar" CTA (the ghost link is the later
                sibling and wins overlaps). `gap: 12` restores real slack. */}
            <View style={{ flexDirection: "column", gap: 12 }}>
              {/* Always present — the one guaranteed recovery action, so no
                  dead end remains. Primary weight (variant="default") mirrors
                  the web recovery card's own CTA priority (TASK-WEB-SOLDNEXT). */}
              <Button
                variant="default"
                onPress={handleBrowseSimilar}
                testID="unavailable-browse-similar"
                accessibilityRole="button"
                accessibilityLabel={browseSimilarLabel}
              >
                <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                  {/* TASK-K729 (review fix, LOW-MEDIUM — typography / action
                      hierarchy): was `size={14}` + `fontSize: 12` (the house
                      META size) on the PRIMARY recovery CTA for a dead
                      thread — bumped to the house primary-action treatment
                      (14/600 + 16px icon, see the Rate-seller CTA above). */}
                  <Search size={16} color={colors.primaryForeground} />
                  <Text
                    numberOfLines={2}
                    style={{ fontSize: 14, fontWeight: "600", color: colors.primaryForeground, flexShrink: 1 }}
                  >
                    {browseSimilarLabel}
                  </Text>
                </View>
              </Button>

              {hasSeller && (
                // TASK-K729 (review fix, LOW — vertical budget): demoted from
                // a full 44pt `variant="outline"` button to a lighter
                // `variant="ghost" size="sm"` text-link row (36pt, no border,
                // no fill) now that the duplicate seller identity is gone —
                // the primary "Browse similar" CTA above stays the one
                // full-weight button; this secondary recovery action reclaims
                // ~12px of the permanently-pinned notice height without
                // hiding the action (the underline keeps it looking tappable).
                //
                // TASK-K729 (review fix, MEDIUM — must fix, touch target):
                // `size="sm"` resolves to `minHeight: 36` (button.tsx), and
                // `alignSelf: "center"` also shrinks the hit area horizontally
                // to the label's own width — the ONLY remaining
                // seller-recovery action on a dead thread shrank from a
                // full-width 44pt target to a ~36pt, label-width one, right
                // above the composer (the thumb zone). `hitSlop` restores an
                // effective >=44pt target (36 + top 4 + bottom 12 = 52) and
                // widens the horizontal hit area without giving back the
                // reclaimed visual height — `Button` spreads `...props` onto
                // `TouchableOpacity`, so this passes through as-is. Biased
                // toward `bottom` (this button is the LAST item above the
                // composer, so there's nothing below to abut) and away from
                // `top` (see the `gap: 12` note above — the 0dp-slack
                // abutment this asymmetry avoids).
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleMoreFromSeller}
                  testID="unavailable-more-from-seller"
                  accessibilityRole="button"
                  accessibilityLabel={viewTheirListingsLabel}
                  hitSlop={{ top: 4, bottom: 12, left: 16, right: 16 }}
                  style={{ alignSelf: "center" }}
                >
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                    <Store size={14} color={colors.foreground} />
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: colors.foreground,
                        textDecorationLine: "underline",
                        flexShrink: 1,
                      }}
                    >
                      {viewTheirListingsLabel}
                    </Text>
                  </View>
                </Button>
              )}
            </View>
          </View>
        )}
      </ListingStatusBanner>

      {/* REV2: rate the seller right from the "You bought this item" notice —
          rendered outside the banner (it's a full-screen Modal, not part of
          the accent surface). Controlled locally; `transactionId` is always
          the viewer's OWN sale (never leaked for anyone else).
          TASK-K729 (review fix, MEDIUM — must fix): `onSubmitted` forwards to
          `onReviewSubmitted` so the caller can invalidate the cached
          conversation (and the Profile pending-reviews nudge) — without this
          `viewerHasReviewedSale` stays stale after a successful submit (the
          sheet is a plain Modal, not a route, so `useFocusEffect` never
          re-fires), the "Rate {seller}" CTA never disappears, and a second
          tap 422s into an unexplained generic error toast. */}
      <ReviewPromptSheet
        visible={reviewPromptVisible}
        onClose={() => setReviewPromptVisible(false)}
        transactionId={transactionId ?? 0}
        callerRole="buyer"
        // TASK-K729 (review fix, LOW, then SHOULD-FIX round 2): `||`, not
        // `??` — `canRateSeller` does NOT require a `sellerName` (rating
        // needs neither an id nor a name), so this fallback is a REAL path,
        // not just defensive padding for an unconditionally-mounted sheet.
        // Mirrors `rateSellerLabel`'s identical fallback above — one rule,
        // not two. `??` only triggers on null/undefined, not on `""` — the
        // exact empty-string hole that produced a blank avatar and a
        // double-spaced sheet title before this fix.
        counterpartyName={sellerName || t("chat.thread.unavailable.rateSellerGenericName")}
        counterpartyAvatarUrl={sellerAvatarUrl}
        onSubmitted={() => onReviewSubmitted?.()}
      />
    </>
  );
}
