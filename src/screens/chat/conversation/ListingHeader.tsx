/**
 * ListingHeader — pinned card at the top of a conversation thread.
 * Shows listing thumbnail, title, PriceTag, and StatusBadge so both
 * participants always remember what they're negotiating about.
 *
 * SF-M2 (Sell Flow Redesign, `docs/SELL_FLOW_REDESIGN.md` §4.4.1): the
 * inline lifecycle button drops its old `showReserve`/`showMarkSold` toggle —
 * it is now ALWAYS "Mark sold" whenever `isOwner` and the listing is Live
 * (`active` or `reserved`), matching the same one-tap-primary model
 * `useListingLifecycle.ts` uses on the listing surfaces (SF-M1). Tapping it
 * opens `BuyerPickerSheet` in CONFIRM mode, scoped to `buyer` — this
 * conversation's own other participant — so it goes straight to a locked
 * confirmation, never the full pick-a-buyer list (the seller is already
 * talking to the person they'd be selling to). Reserve is no longer
 * triggered from here at all — "Place a hold" / "Release hold" moved into
 * `ComposerActionsSheet`'s "+" menu, see that file.
 *
 * TASK-N071: when `listing.negotiable === false` and the current user
 * is NOT the owner, a quiet "Firm price" pill is shown and the offer
 * affordance in the conversation is suppressed.
 *
 * QA-BUG5 (FlowApp #303): the mark-sold confirm here used to call
 * `listingsAPI.markSold` directly and raise its OWN plain success toast —
 * no Undo action at all, unlike the listing screens' `useListingLifecycle`,
 * whose "Marked sold · Undo" (SF-M5) this component never got. Since the
 * Sell Flow Redesign made chat a PRIMARY selling surface (the buyer is
 * already known here — this is the shortest real path to a sale), the path
 * most likely to be used was the one with no way back from a mistake. Now
 * calls the shared `useMarkSoldWithUndo` hook — the exact same mutation,
 * toast, Undo, and QA-BUG2 toast-before-review-prompt sequencing
 * `useListingLifecycle` uses — instead of a second copy of any of it.
 */
import React, { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { RemoteImage } from "@/components/common/RemoteImage";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, MapPin } from "lucide-react-native";
import { Text } from "@/components/reusables/text";
import { PriceTag } from "@/components/common/PriceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/reusables/badge";
import type { ListingStatus } from "@/components/common/StatusBadge";
import { BuyerPickerSheet, type BuyerPickerResult } from "@/components/common/BuyerPickerSheet";
import { ReviewPromptSheet } from "@/components/common/ReviewPromptSheet";
import { useLocalization } from "@/hooks/useLocalization";
import { useColors } from "@/hooks/useColors";
import { useMarkSoldWithUndo } from "@/hooks/useMarkSoldWithUndo";
import { apiErrorMessage } from "@/utils/apiError";

interface ListingInfo {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  price?: number;
  currency?: string;
  status: string;
  location?: string;
  /**
   * Whether the seller accepts price offers.
   * true (default) — open to offers. false — price is firm.
   * When false and the current user is not the owner a quiet badge is shown
   * below the price and the offer entry point in the conversation is hidden.
   */
  negotiable?: boolean;
  /**
   * Multi-quantity — when true the price renders "14,000 each". The thread
   * header is where "how much for 5?" gets asked, so a bare per-unit figure is
   * read as the batch price at exactly the moment the deal is struck
   * (docs/SPIKE_LISTING_QUANTITY.md §0c).
   */
  multiUnit?: boolean;
  /**
   * How many units are still available. Feeds the buyer picker's "how many did
   * you sell?" field, so a seller closing part of a batch here gets the same
   * choice they get on the My Listings screen — without it the thread could only
   * ever sell the whole batch at once.
   */
  availableUnits?: number;
}

interface ListingHeaderProps {
  listing: ListingInfo;
  onPress?: () => void;
  /**
   * When true the current user is the listing's seller — show the inline
   * "Mark sold" action for a Live listing (`active` or `reserved`). Has no
   * effect for sold/draft listings.
   */
  isOwner?: boolean;
  /**
   * SF-M2 — this conversation's OTHER participant (the buyer), used to scope
   * the "Mark sold" action to a single, already-known buyer via
   * `BuyerPickerSheet`'s confirm mode — never the full pick-a-buyer list,
   * since the seller is already talking to them. The inline action renders
   * nothing at all while this is `null`/`undefined` (e.g. the conversation's
   * own query hasn't resolved yet) — there is no one to confirm sold-to.
   */
  buyer?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    verified?: boolean;
    city?: string | null;
  } | null;
  /**
   * Called after a successful lifecycle mutation so the parent can
   * invalidate conversation/listing queries and update the StatusBadge.
   */
  onLifecycleDone?: () => void;
}

export function ListingHeader({ listing, onPress, isOwner = false, buyer = null, onLifecycleDone }: ListingHeaderProps) {
  const { t } = useTranslation();
  const { isRtl } = useLocalization();
  const colors = useColors();
  // SF-M2: whether the (always "Mark sold" now) confirm sheet is open.
  const [markSoldVisible, setMarkSoldVisible] = useState(false);

  // QA-BUG5 — the ONE mark-sold mutation, Undo toast, and QA-BUG2
  // toast-before-review-prompt sequencing, shared with `useListingLifecycle`.
  const {
    markSoldAsync,
    isSubmitting: isLifecycleLoading,
    error: markSoldError,
    resetError: resetMarkSoldError,
    reviewPrompt,
  } = useMarkSoldWithUndo({
    listingId: listing.id,
    onChange: () => {
      setMarkSoldVisible(false);
      onLifecycleDone?.();
    },
  });
  // Review fix (MEDIUM, ERROR FEEDBACK) — same reasoning as
  // reserveAfterAccept.ts / Conversation.tsx's `reserveConfirmError`: the
  // sheet's own raw RN <Modal> occludes the sonner-native toast on Android,
  // so a failure needs a signal INSIDE the sheet too.
  const errorMessage = markSoldError ? apiErrorMessage(markSoldError, t) : null;

  const validStatuses: ListingStatus[] = ["draft", "active", "reserved", "sold"];
  const status = validStatuses.includes(listing.status as ListingStatus)
    ? (listing.status as ListingStatus)
    : "active";

  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  // SF-M1/SF-M2: ALWAYS "Mark sold" for the owner on a Live listing — no more
  // showReserve/showMarkSold toggle. Requires a known `buyer` too: there is
  // nothing to confirm sold-to before the conversation's own data has loaded.
  const isLive = status === "active" || status === "reserved";
  const showAction = isOwner && isLive && !!buyer;

  // TASK-N071: firm price notice — shown to the buyer (non-owner) only.
  // TASK-K729 review fix: suppressed once the listing is reserved/sold — the
  // reserved/sold recovery notice already explains why the offer control is
  // gone, and the two notices stacking would give the buyer two conflicting
  // reasons for the same missing button.
  const isFirmPrice =
    listing.negotiable === false &&
    !isOwner &&
    status !== "reserved" &&
    status !== "sold";

  // QA-BUG5: the mutation, its "Marked sold · Undo" toast, and the REV2
  // review-prompt invite (deferred until that toast's own lifecycle
  // finishes, per QA-BUG2) all happen INSIDE `useMarkSoldWithUndo` — this
  // handler only needs to know success/failure, to keep its own sheet open
  // for a retry on error. `markSoldAsync`'s rejection is already surfaced
  // (globally via `toast.error`, and inline via `markSoldError` above); the
  // empty catch here just stops it becoming an unhandled rejection.
  const handleMarkSoldConfirm = async (result: BuyerPickerResult) => {
    try {
      await markSoldAsync(result);
    } catch {
      // Sheet stays open — `errorMessage` (derived from `markSoldError`)
      // renders inline above the footer.
    }
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.muted }}
        style={{
          flexDirection: isRtl ? "row-reverse" : "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: isFirmPrice ? 0 : 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
          gap: 10,
        }}
        accessibilityRole="button"
        accessibilityLabel={t("chat.openListing")}
      >
        {/* Thumbnail — compact */}
        <RemoteImage
          uri={listing.thumbnailUrl}
          style={{ width: 40, height: 40, borderRadius: 8 }}
          transition={200}
        />

        {/* Info — single tight column */}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {/* Row 1: title + status */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, flexShrink: 1, textAlign: isRtl ? "right" : "left" }}
              numberOfLines={1}
            >
              {listing.title}
            </Text>
            <StatusBadge status={status} />
          </View>

          {/* Row 2: price + location, tight inline */}
          <View
            style={{
              flexDirection: isRtl ? "row-reverse" : "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PriceTag price={listing.price} currency={listing.currency} size="sm" perUnit={listing.multiUnit === true} />
            {listing.location ? (
              <View
                style={{
                  flexDirection: isRtl ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 1,
                }}
              >
                <MapPin size={11} color={colors.mutedForeground} />
                <Text
                  style={{ fontSize: 11, color: colors.mutedForeground, flexShrink: 1, textAlign: isRtl ? "right" : "left" }}
                  numberOfLines={1}
                >
                  {listing.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* SF-M1/SF-M2: Mark sold — the one-tap primary, always, for the
            owner of any Live listing, once the thread's buyer is known. */}
        {showAction ? (
          <Pressable
            onPress={(e) => {
              // Guard: e may be undefined in test environments (RNTL fireEvent)
              if (e && typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
              resetMarkSoldError();
              setMarkSoldVisible(true);
            }}
            disabled={isLifecycleLoading}
            hitSlop={4}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: colors.primaryAlpha,
            }}
            accessibilityRole="button"
            accessibilityLabel={t("chat.listingActions.markSold")}
          >
            {isLifecycleLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.primary,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {t("chat.listingActions.markSold")}
              </Text>
            )}
          </Pressable>
        ) : (
          /* Affordance — tap to open listing */
          <Chevron size={18} color={colors.mutedForeground} />
        )}
      </Pressable>

      {/* Firm-price notice — shown to buyer when listing.negotiable === false.
          Sits below the header row so it never crowds the title/price.
          Counter-offer / accept / decline of an already-sent offer are not affected. */}
      {isFirmPrice && (
        <View
          testID="firm-price-chat-notice"
          style={{
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.muted,
          }}
        >
          <Badge label={t("listing.firmPrice")} variant="muted" />
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              flex: 1,
              textAlign: isRtl ? "right" : "left",
            }}
          >
            {t("chat.offer.firmNotice")}
          </Text>
        </View>
      )}

      {/* TASK-TX01 / TASK-F084 / SF-M2: Mark sold from chat, confirm mode —
          scoped to `buyer`, this thread's own participant. No conversation
          picker: the buyer is who the seller is already talking to. */}
      <BuyerPickerSheet
        visible={markSoldVisible}
        onClose={() => { setMarkSoldVisible(false); resetMarkSoldError(); }}
        listingId={listing.id}
        price={listing.price ?? 0}
        currency={listing.currency ?? "AFN"}
        action="sold"
        remainingQuantity={listing.availableUnits ?? 1}
        preselectedBuyer={buyer}
        onConfirm={handleMarkSoldConfirm}
        isSubmitting={isLifecycleLoading}
        errorMessage={errorMessage}
      />

      {/* REV2: rate the buyer right after a sold sale records them — QA-BUG5:
          sourced from the shared `useMarkSoldWithUndo` hook, same as
          `useListingLifecycle`'s own reviewPrompt. */}
      <ReviewPromptSheet
        visible={reviewPrompt.visible}
        onClose={reviewPrompt.onClose}
        transactionId={reviewPrompt.transactionId}
        callerRole="seller"
        counterpartyName={reviewPrompt.buyerName}
        counterpartyAvatarUrl={reviewPrompt.buyerAvatarUrl}
      />
    </View>
  );
}
