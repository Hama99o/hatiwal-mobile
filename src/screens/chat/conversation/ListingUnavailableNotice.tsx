/**
 * ListingUnavailableNotice — TASK-K729.
 *
 * When the pinned listing in a chat thread turns `reserved` or `sold`,
 * Conversation.tsx's `canOfferInThread` guard goes false and the composer's
 * "Make an offer" row silently disappears from ComposerActionsSheet — with
 * nothing telling the buyer WHY, and no next step. This card replaces that
 * silent gap with an explicit, VIEWER-SCOPED reason:
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
 * Composed from shared components only (never hand-rolled): `StatusBadge`
 * and the accent surface both come from `ListingStatusBanner` (also used by
 * ListingDetail's own reserved/sold banner — one status treatment, not two),
 * and the seller is shown via `UserIdentity` (avatar + name + verified tag),
 * never bare text in a button label.
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

  const body = viewerIsSaleBuyer
    ? isSold
      ? t("chat.thread.unavailable.soldToYouBody")
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

  const hasSeller = sellerId != null && !!sellerName;
  const browseSimilarLabel = category
    ? t("chat.thread.unavailable.browseSimilar", { category: getCategoryName(category) })
    : t("chat.thread.unavailable.browseSimilarGeneric");
  const viewTheirListingsLabel = t("chat.thread.unavailable.viewTheirListings");

  // TASK-K729 (review fix, HIGH follow-up): the real next step for "sold +
  // viewer-is-buyer" — a "Rate {seller}" CTA opening the REV2 review prompt,
  // so the body copy's "then leave them a review" isn't just text with no
  // action behind it. Requires the viewer's own transactionId (never leaked
  // for anyone else) and is hidden once already reviewed.
  const canRateSeller = isSold && transactionId != null && !hasReviewedSale;
  const rateSellerLabel = t("chat.thread.unavailable.rateSeller", {
    name: sellerName ?? t("chat.thread.unavailable.rateSellerGenericName"),
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
      >
        {/* The one and only CTA for the winning buyer — "leave them a review"
            in the body copy above is a real next step, not just text. Never
            rendered for `reserved` (the deal isn't done yet — meetup guidance
            only) nor once the viewer has already reviewed the sale. */}
        {viewerIsSaleBuyer && canRateSeller && (
          <View style={{ gap: 10, marginTop: 2 }}>
            {hasSeller && (
              <UserIdentity
                name={sellerName as string}
                avatarUrl={sellerAvatarUrl}
                verified={sellerVerified}
                size={32}
                testID="unavailable-seller-identity-buyer"
              />
            )}
            <Button
              variant="default"
              onPress={() => setReviewPromptVisible(true)}
              testID="unavailable-rate-seller"
              accessibilityRole="button"
              accessibilityLabel={rateSellerLabel}
              style={{ alignSelf: isRtl ? "flex-end" : "flex-start", minWidth: 0, maxWidth: "100%" }}
            >
              <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                <Star size={14} color={colors.primaryForeground} />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, fontWeight: "600", color: colors.primaryForeground, flexShrink: 1 }}
                >
                  {rateSellerLabel}
                </Text>
              </View>
            </Button>
          </View>
        )}

        {/* Nothing to recover from once the viewer IS the committed buyer — the
            composer text input stays fully usable for the meetup / after-sale
            chat, so no CTA row (and never the "browse away" action, which
            would be a strange thing to suggest to the person who just won the
            deal). */}
        {!viewerIsSaleBuyer && (
          <View style={{ gap: 10, marginTop: 2 }}>
            {hasSeller && (
              <UserIdentity
                name={sellerName as string}
                avatarUrl={sellerAvatarUrl}
                verified={sellerVerified}
                size={32}
                testID="unavailable-seller-identity"
              />
            )}

            <View style={{ flexDirection: rowDir, gap: 8, flexWrap: "wrap" }}>
              {/* Always present — the one guaranteed recovery action, so no
                  dead end remains. Primary weight (variant="default") mirrors
                  the web recovery card's own CTA priority (TASK-WEB-SOLDNEXT). */}
              <Button
                variant="default"
                onPress={handleBrowseSimilar}
                testID="unavailable-browse-similar"
                accessibilityRole="button"
                accessibilityLabel={browseSimilarLabel}
                style={{ flex: 1, minWidth: 0 }}
              >
                <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                  <Search size={14} color={colors.primaryForeground} />
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12, fontWeight: "600", color: colors.primaryForeground, flexShrink: 1 }}
                  >
                    {browseSimilarLabel}
                  </Text>
                </View>
              </Button>

              {hasSeller && (
                <Button
                  variant="outline"
                  onPress={handleMoreFromSeller}
                  testID="unavailable-more-from-seller"
                  accessibilityRole="button"
                  accessibilityLabel={viewTheirListingsLabel}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexShrink: 1 }}>
                    <Store size={14} color={colors.foreground} />
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, flexShrink: 1 }}
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
          the viewer's OWN sale (never leaked for anyone else). */}
      <ReviewPromptSheet
        visible={reviewPromptVisible}
        onClose={() => setReviewPromptVisible(false)}
        transactionId={transactionId ?? 0}
        callerRole="buyer"
        counterpartyName={sellerName ?? ""}
        counterpartyAvatarUrl={sellerAvatarUrl}
      />
    </>
  );
}
