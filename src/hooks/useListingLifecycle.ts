/**
 * useListingLifecycle — TASK-L863: the single source of truth for a seller's
 * listing lifecycle actions (publish / mark sold / unpublish / release hold /
 * renew / edit / duplicate / delete).
 *
 * Before this hook, `SellerListingCard.tsx` and `MyListingDetail.tsx` each
 * hand-rolled the same mutations, the same `confirmAlert` copy, the same
 * invalidation sets, and the same BuyerPickerSheet/ReviewPromptSheet wiring —
 * ~200 duplicated lines that had already drifted apart (the two screens
 * disagreed about the primary action for an `active` listing). This hook
 * owns ALL of that; the screens only render what it returns.
 *
 * SF-M1 (Sell Flow Redesign, `docs/SELL_FLOW_REDESIGN.md` §1.4/§4.5/§10.1):
 * "Mark sold" is now the one-tap primary from ANY live listing — the owner's
 * core complaint was that the old mapping below taught reserve-first on every
 * listing, even a batch of 50, when the API never required it. Reserve is no
 * longer initiated from this hook or any listing surface at all — a hold is
 * for a person, and by the time a seller wants one, they're already talking
 * to that buyer in chat (see `reserveAfterAccept.ts` / `ComposerActionsSheet`
 * for the chat-initiated "Place a hold" / "Release hold" flow, SF-M2).
 *
 * Canonical primary action per status (the single most obvious next step):
 *   draft                        → Publish
 *   active (incl. an open hold)  → Mark sold
 *   active + expired             → Renew (overrides the status-based primary)
 *   reserved                     → Mark sold
 *   sold                         → none (terminal)
 *
 * Everything else — Mark sold on an expired-active listing, Release hold on
 * a held listing (single- OR multi-item, see `handleReleaseHold`'s condition
 * below), Unpublish, View sales (once any unit has sold), Edit, Duplicate
 * (available for EVERY status, including sold), Delete (destructive, always
 * last) — lands in `moreActions`, rendered by `ListingActionsSheet`.
 *
 * Mark sold never goes through `confirmAlert` — it opens `BuyerPickerSheet`
 * so the seller can identify the real buyer from the listing's conversations;
 * the sheet's own Confirm button IS the confirmation step (TASK-TX01). A
 * `sold` response carrying a recorded buyer (`transaction.buyer`) opens
 * `ReviewPromptSheet` right after (REV2, double-blind reviews).
 */
import { useCallback, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import {
  CheckCircle2,
  EyeOff,
  LockOpen,
  Receipt,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react-native";

import { listingsAPI, type Listing } from "@/api/listings";
import { transactionsAPI } from "@/api/transactions";
import { type BuyerPickerResult } from "@/components/common/BuyerPickerSheet";
import { type ListingActionRow } from "@/components/common/ListingActionsSheet";
import { confirmAlert } from "@/utils/alert";
import {
  getPublishBlockers,
  publishBlockedMessage,
} from "@/screens/seller/listing-form/publishReadiness";
import { availableUnitsOf, hasSoldSome, heldUnitsOf } from "@/utils/stock";
import { apiErrorMessage } from "@/utils/apiError";

// Query keys — exported so callers/tests can assert against the exact same
// constants instead of hardcoding strings.
export const MY_LISTINGS_QK = "my-listings";
export const MY_LISTING_STATUS_COUNTS_QK = "myListingStatusCounts";
export const MY_LISTING_QK = "my-listing";
export const CONVERSATIONS_QK = "conversations";

export interface UseListingLifecycleOptions {
  /**
   * The listing id every mutation targets. Required and separate from
   * `listing` below because MyListingDetail must call this hook (Rules of
   * Hooks: unconditionally, before its loading/not-found early returns)
   * while the listing itself may still be `undefined` — the id comes
   * straight from the route param and is available immediately.
   */
  listingId: number;
  /**
   * The full listing, or `undefined`/`null` while still loading. Used only
   * to compute the status-based primary/more action mapping — every
   * mutation always targets `listingId` above, never `listing.id`. While
   * `listing` is falsy, `primaryAction` is `null` and `moreActions` reduces
   * to the status-independent trio (Edit/Duplicate/Delete), which is never
   * rendered anyway (the screen shows a loading/not-found state instead).
   */
  // `quantity`/`availableUnits` feed the buyer picker's "how many did you sell?"
  // field. Both optional, so a caller holding an older payload still compiles
  // and the sheet falls back to the single-unit behaviour.
  /**
   * The listing being acted on. Deliberately a narrow Pick so any caller with a
   * partial listing (the seller card's list payload, not just the detail view)
   * can use this hook.
   *
   * The publish-readiness fields are OPTIONAL on purpose: a list payload may not
   * carry them, and `getPublishBlockers` then reports them as blockers — which is
   * the safe direction. It means "I cannot prove this is publishable from here",
   * and the seller gets told what is missing instead of a 422 with no message.
   */
  listing:
    | (Pick<Listing, "status" | "expired" | "quantity" | "availableUnits"> &
        Partial<
          Pick<
            Listing,
            | "title"
            | "price"
            | "categoryId"
            | "latitude"
            | "longitude"
            | "images"
            | "imageUrls"
            | "imageAttachments"
            // SF-M1 (revised): `status === "reserved" || heldUnits > 0` is the
            // pair that correctly detects an open hold for BOTH a single-item
            // listing (status flips to `reserved`, `heldUnits` stays 0 — a
            // single unit held is carried entirely by `StatusBadge`'s own
            // "Reserved" treatment, per `heldUnitsOf`'s own doc in stock.ts)
            // AND a multi-unit listing (status stays `active` while units are
            // held for a buyer — `heldUnits` is the ONLY signal there; SF-B2).
            // Originally read `sale?.status === "reserved"` instead — widened
            // to `heldUnits` because the backend's own
            // `ListingPolicy#activate?` (the endpoint this drives) matches
            // this exact pair (`owner? && (reserved? || (active? &&
            // held_units.positive?))`), and `sale`/`current_sale` is not
            // guaranteed to agree with it in every edge case. Reuses the
            // shared `heldUnitsOf()` helper (stock.ts) rather than
            // re-deriving the rule a second time.
            | "heldUnits"
          >
        >)
    | null
    | undefined;
  /** Called after any successful lifecycle mutation, in addition to the automatic query invalidation below — lets the caller do extra local bookkeeping (e.g. a list screen closing a row). */
  onDone?: () => void;
  /**
   * Called after a successful Delete, in addition to `onDone`/invalidation.
   * MyListingDetail is ON the listing being deleted and MUST navigate away
   * (there's nothing left to show); SellerListingCard's row just disappears
   * from the already-invalidated list, so it has no need to pass this.
   */
  onDeleted?: () => void;
}

export interface ListingLifecyclePrimaryAction {
  label: string;
  onPress: () => void;
}

export interface ListingLifecycleBuyerPicker {
  visible: boolean;
  /**
   * SF-M1: narrowed from `"reserve" | "sold"` — reserve is no longer
   * initiated from any listing surface (My Listings, MyListingDetail,
   * SellerListingCard). It only exists in chat now (SF-M2).
   */
  action: "sold";
  onClose: () => void;
  onConfirm: (result: BuyerPickerResult) => void;
  isSubmitting: boolean;
  /**
   * Units still unsold, for the sheet's "how many did you sell?" field. 1 for an
   * ordinary listing, which makes the sheet render exactly as it always has —
   * the whole feature stays invisible to a seller with one item.
   */
  remainingQuantity: number;
}

export interface ListingLifecycleReviewPrompt {
  visible: boolean;
  transactionId: number;
  buyerName: string;
  buyerAvatarUrl: string | null;
  onClose: () => void;
}

export interface UseListingLifecycleResult {
  /** The single most obvious next step for this listing's status, or null when terminal (sold). */
  primaryAction: ListingLifecyclePrimaryAction | null;
  /** Every other reachable action, in display order — feed straight into `ListingActionsSheet`. */
  moreActions: ListingActionRow[];
  /** True while ANY lifecycle mutation is in flight — disable primary + More while true. */
  isBusy: boolean;
  buyerPicker: ListingLifecycleBuyerPicker;
  reviewPrompt: ListingLifecycleReviewPrompt;
}

export function useListingLifecycle({
  listingId,
  listing,
  onDone,
  onDeleted,
}: UseListingLifecycleOptions): UseListingLifecycleResult {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  // TASK-TX01 / SF-M1: whether the buyer picker (Mark sold — the only action
  // it drives now) is open.
  const [buyerPickerAction, setBuyerPickerAction] = useState<"sold" | null>(null);
  // REV2: after a sold sale records a real buyer, prompt the seller to rate them.
  const [reviewPrompt, setReviewPrompt] = useState<{
    transactionId: number;
    buyerName: string;
    buyerAvatarUrl: string | null;
  } | null>(null);

  // Invalidate the listing feed, status-count pills, this listing's own
  // detail query, and (TASK-TX01) the listing's conversations — a
  // buyer-recorded reserve/sold changes what the conversation list shows
  // (e.g. "reserved for you") — after any lifecycle action so every surface
  // stays accurate with no manual pull-to-refresh.
  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: [MY_LISTINGS_QK] });
    qc.invalidateQueries({ queryKey: [MY_LISTING_STATUS_COUNTS_QK] });
    qc.invalidateQueries({ queryKey: [MY_LISTING_QK, String(listingId)] });
    qc.invalidateQueries({ queryKey: [CONVERSATIONS_QK, listingId] });
    onDone?.();
  }, [qc, listingId, onDone]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const publish = useMutation({
    mutationFn: () => listingsAPI.publishListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.publishSuccess")); },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const markSold = useMutation({
    mutationFn: (opts?: BuyerPickerResult) => listingsAPI.markSold(listingId, opts),
    onSuccess: (data) => {
      invalidateAll();
      setBuyerPickerAction(null);
      // SF-M5 (docs/SELL_FLOW_REDESIGN.md §10.3) — "Marked sold · Undo". The
      // big-tech answer to a mistake is a snackbar undo, not a correction
      // form, and it must never BLOCK: the sale already completed by the
      // time this fires, undo is only ever offered afterward. Every markSold
      // call now leaves exactly one sold Transaction (SF-B3 — the legacy
      // buyer-less/skip paths both record a real, ledger-visible row), so
      // this is unconditional whenever the response actually carries an id.
      const soldTransactionId = data.transaction?.id;
      toast.success(
        t("listing.markSoldSuccess"),
        soldTransactionId
          ? {
              action: {
                label: t("common.undo"),
                onClick: () => undoMarkSold.mutate(soldTransactionId),
              },
            }
          : undefined
      );
      // REV2: a recorded buyer means a real sold Transaction exists — invite
      // the seller to rate them right away (double-blind, hidden until the
      // buyer reviews back too).
      if (data.transaction?.buyer) {
        setReviewPrompt({
          transactionId: data.transaction.id,
          buyerName: data.transaction.buyer.name,
          buyerAvatarUrl: data.transaction.buyer.avatarUrl,
        });
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  // SF-M5 — the "Undo" toast action's side effect. Same DELETE the Sales
  // screen's own row Delete button calls (`transactionsAPI.deleteTransaction`)
  // — one void path, not two. Restores stock and, if this sale had sold the
  // listing out, flips it back to `active` server-side; both are already
  // covered by `invalidateAll`'s refetch.
  const undoMarkSold = useMutation({
    mutationFn: (transactionId: number) => transactionsAPI.deleteTransaction(transactionId),
    onSuccess: () => {
      invalidateAll();
      toast.success(t("listing.sale.voidedSuccess"));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const unpublish = useMutation({
    mutationFn: () => listingsAPI.unpublishListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.unpublishSuccess")); },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  // SF-M1: "Activate" relabelled "Release hold" — the route/method stay
  // exactly as they were (`docs/SELL_FLOW_REDESIGN.md` §3.1: renaming the
  // working `/my/listings/:id/activate` endpoint would be pure churn); only
  // the seller-facing copy and its trigger condition change.
  const releaseHold = useMutation({
    mutationFn: () => listingsAPI.activateListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.releaseHoldSuccess")); },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const renew = useMutation({
    mutationFn: () => listingsAPI.renewListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.renewSuccess")); },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const deleteListing = useMutation({
    mutationFn: () => listingsAPI.deleteListing(listingId),
    onSuccess: () => {
      invalidateAll();
      toast.success(t("listing.deleteSuccess"));
      onDeleted?.();
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const isBusy =
    publish.isPending ||
    markSold.isPending ||
    unpublish.isPending ||
    releaseHold.isPending ||
    renew.isPending ||
    deleteListing.isPending;

  // ── Confirm handlers — confirmAlert is the confirmation step for every
  // action EXCEPT mark-sold (that opens BuyerPickerSheet instead) ──

  const handlePublish = useCallback(() => {
    // Publish-readiness is decided by ONE function for the whole app
    // (listing-form/publishReadiness.ts, which says so in its own header). This
    // hook skipped it: it offered "Publish" on any draft, fired the request, and
    // let the API's `photo_required_to_publish` come back 422 — surfaced only as
    // a ~3s toast. QA caught the whole path on a photoless draft:
    // `PUT /my/listings/505/publish -> 422`, while the screen sat on "Draft"
    // with the Publish button still there and nothing saying a photo was needed.
    // The seller's read of that is "I pressed Publish and nothing happened".
    //
    // Checked BEFORE the confirmation dialog: asking "Publish this listing?" and
    // then refusing is worse than saying up front what is missing.
    // Judge ONLY the fields this payload actually carries.
    //
    // `useListingLifecycle` is shared by the owner-detail screen and the seller
    // CARD, and those get different payloads: the API's list serializer omits
    // latitude/longitude entirely (they are detail-only — listing_serializer.rb
    // line ~142), so treating "absent" as "missing" would report a `location`
    // blocker for every card and block publishing of perfectly valid listings.
    // Absent means "cannot judge from here", not "invalid" — so those blockers
    // are dropped and the API stays the backstop for them.
    const photos =
      listing?.imageAttachments ?? listing?.images ?? listing?.imageUrls;
    const judgeable: Record<string, boolean> = {
      photos: photos !== undefined,
      title: listing?.title !== undefined,
      price: listing?.price !== undefined,
      category: listing?.categoryId !== undefined,
      location:
        listing?.latitude !== undefined && listing?.longitude !== undefined,
    };

    const blockers = getPublishBlockers({
      values: {
        title: listing?.title,
        price: listing?.price,
        categoryId: listing?.categoryId,
        latitude: listing?.latitude,
        longitude: listing?.longitude,
      },
      photos: photos ?? [],
      mode: "publish",
    }).filter((b) => judgeable[b]);

    if (blockers.length > 0) {
      const message = publishBlockedMessage(blockers, "publish", t);
      toast.error(message);
      // A sonner-native toast is not announced by TalkBack on its own, and this
      // is the only "why did nothing happen" signal — so it must reach screen
      // readers too (same rule as ListingForm's handlePublishBlockers).
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }

    confirmAlert(
      t("listing.confirmPublish"),
      t("listing.confirmPublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.publish"), onPress: () => publish.mutate() },
      ]
    );
  }, [t, publish, listing]);

  // TASK-TX01 / SF-M1: Mark sold opens the BuyerPickerSheet so the seller can
  // identify the real buyer from this listing's conversations. Reserve is no
  // longer triggered from here — it only exists in chat now (SF-M2).
  const handleMarkSold = useCallback(() => setBuyerPickerAction("sold"), []);

  const handleBuyerPickerConfirm = useCallback(
    (result: BuyerPickerResult) => {
      if (buyerPickerAction === "sold") markSold.mutate(result);
    },
    [buyerPickerAction, markSold]
  );

  const handleUnpublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmUnpublish"),
      t("listing.confirmUnpublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.unpublish"), onPress: () => unpublish.mutate() },
      ]
    );
  }, [t, unpublish]);

  // SF-M1: "Release hold" — same endpoint as before (`docs/SELL_FLOW_REDESIGN.md`
  // §3.1), new seller-facing copy. Its trigger CONDITION (not this handler) is
  // what changed — see the `moreActions` builder below.
  const handleReleaseHold = useCallback(() => {
    confirmAlert(
      t("listing.confirmReleaseHold"),
      t("listing.confirmReleaseHoldDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.releaseHold"), onPress: () => releaseHold.mutate() },
      ]
    );
  }, [t, releaseHold]);

  const handleRenew = useCallback(() => {
    confirmAlert(
      t("listing.confirmRenew"),
      t("listing.confirmRenewDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.renew"), onPress: () => renew.mutate() },
      ]
    );
  }, [t, renew]);

  const handleDelete = useCallback(() => {
    confirmAlert(
      t("listing.confirmDelete"),
      t("listing.confirmDeleteDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteListing.mutate(),
        },
      ]
    );
  }, [t, deleteListing]);

  // TASK-P736 (review fix, visual hierarchy) — forward the listing's
  // CURRENT status as a `?status=` hint. ListingForm uses it only as a
  // best-effort placeholder for its toolbar's [Save Draft | Publish] vs
  // [Save] decision WHILE its own `getMyListing` query is still loading —
  // without it, an already-active listing's edit screen briefly shows the
  // draft pair and flips to the single Save button the instant real data
  // lands, a button-count flip a seller could mistap. `listing` may still
  // be `undefined` for the render or two before this screen's own query
  // resolves (see this hook's own `listing` doc) — the hint is simply
  // omitted then, exactly like today.
  const handleEdit = useCallback(() => {
    const statusHint = listing?.status ? `?status=${listing.status}` : "";
    router.push(`/(main)/listing/edit/${listingId}${statusHint}` as never);
  }, [router, listingId, listing?.status]);

  // Quiet secondary action, distinct from Edit — opens a fresh DRAFT create
  // form prefilled from this listing's text fields (photos are NOT copied;
  // Active Storage blobs can't be cloned client-side). Available for EVERY
  // status, including sold — sellers may want to relist a sold/expired item.
  const handleDuplicate = useCallback(() => {
    router.push(`/(main)/listing/new?duplicateFrom=${listingId}` as never);
  }, [router, listingId]);

  // ── Primary action — the canonical mapping (see file header) ───────────
  // `listing` is `undefined`/`null` for one or two renders while
  // MyListingDetail's query is still loading — status falls through to the
  // `default` (no primary), which is fine: the screen shows a skeleton
  // instead of these buttons until `listing` arrives.

  const status = listing?.status;
  // SF-B1 widened `Listing#expired?` to `live?` (active OR reserved), so a
  // held listing can now expire too — no longer gated on `status === "active"`
  // the way it was before this redesign (`docs/SELL_FLOW_REDESIGN.md` §10.1's
  // own diff nests this check for BOTH `active` and `reserved`).
  const isExpired = !!listing?.expired;

  // SF-M1: `active` and `reserved` are BOTH "Live" and share one mapping —
  // Mark sold unless the listing has expired, in which case Renew takes over
  // for either. This is the exact fix for the owner's core complaint: the old
  // mapping taught reserve-first on every listing, even a batch of 50, when
  // the API never required it
  // (`ListingPolicy#sold? = owner? && (active? || reserved?)`).
  const primaryAction: ListingLifecyclePrimaryAction | null = useMemo(() => {
    switch (status) {
      case "draft":
        return { label: t("listing.publish"), onPress: handlePublish };
      case "active":
      case "reserved":
        return isExpired
          ? { label: t("listing.renew"), onPress: handleRenew }
          : { label: t("listing.markSold"), onPress: handleMarkSold };
      default:
        return null; // sold, or not loaded yet — no primary action to show
    }
  }, [isExpired, status, t, handleRenew, handlePublish, handleMarkSold]);

  // SF-M1 (revised): an open hold, single- OR multi-item — the pair that
  // covers both (`docs/SELL_FLOW_REDESIGN.md` §4.5/§10.1). A single-item hold
  // flips `status` to `reserved`; a multi-item hold stays `status: active`
  // with `heldUnits > 0` (SF-B2 — a batch of 50 must not vanish from the
  // market because one buyer reserved 10). Matches the backend's own
  // `ListingPolicy#activate?` (the endpoint `handleReleaseHold` below calls)
  // exactly, so the control never offers an action the API would 403.
  // `heldUnitsOf` is the shared helper (stock.ts) — never re-derive this rule.
  const hasOpenHold = status === "reserved" || heldUnitsOf(listing) > 0;

  // ── More actions — everything not chosen as primary. No variant is
  // dropped versus the two screens this hook replaces: an expired-active
  // listing can still be marked sold and unpublished, a held listing can
  // still have its hold released, and Duplicate/Edit/Delete are always
  // reachable regardless of status. Reserve is gone entirely — it only
  // exists in chat now (SF-M2). ───────────────────────────────────────────

  const moreActions: ListingActionRow[] = useMemo(() => {
    const actions: ListingActionRow[] = [];
    const isLive = status === "active" || status === "reserved";

    if (isLive && isExpired) {
      // Renew is primary once expired, but Mark sold is still reachable for
      // EITHER item count — no variant dropped versus before.
      actions.push({ key: "sold", label: t("listing.markSold"), icon: CheckCircle2, onPress: handleMarkSold });
    }

    if (status === "active") {
      actions.push({ key: "unpublish", label: t("listing.unpublish"), icon: EyeOff, onPress: handleUnpublish });
    }

    if (hasOpenHold) {
      actions.push({ key: "releaseHold", label: t("listing.releaseHold"), icon: LockOpen, onPress: handleReleaseHold });
    }

    if (hasSoldSome(listing)) {
      actions.push({
        key: "sales",
        label: t("listing.viewSales"),
        icon: Receipt,
        onPress: () => router.push(`/(main)/listing/${listingId}/sales` as never),
      });
    }

    actions.push({ key: "edit", label: t("common.edit"), icon: Pencil, onPress: handleEdit });
    actions.push({ key: "duplicate", label: t("listing.duplicate"), icon: Copy, onPress: handleDuplicate });
    actions.push({ key: "delete", label: t("common.delete"), icon: Trash2, onPress: handleDelete, danger: true });

    return actions;
  }, [
    status,
    isExpired,
    hasOpenHold,
    listing,
    t,
    router,
    listingId,
    handleMarkSold,
    handleUnpublish,
    handleReleaseHold,
    handleEdit,
    handleDuplicate,
    handleDelete,
  ]);

  return {
    primaryAction,
    moreActions,
    isBusy,
    buyerPicker: {
      visible: buyerPickerAction !== null,
      action: "sold",
      onClose: () => setBuyerPickerAction(null),
      onConfirm: handleBuyerPickerConfirm,
      isSubmitting: markSold.isPending,
      // The sheet only asks "how many?" when this is > 1, so nothing changes for
      // the single-item case. Falls back to 1 rather than availableUnitsOf's 0
      // for a listing that hasn't loaded — 0 would be read as "sold out".
      remainingQuantity: listing ? availableUnitsOf(listing) : 1,
    },
    reviewPrompt: {
      visible: reviewPrompt !== null,
      transactionId: reviewPrompt?.transactionId ?? 0,
      buyerName: reviewPrompt?.buyerName ?? "",
      buyerAvatarUrl: reviewPrompt?.buyerAvatarUrl ?? null,
      onClose: () => setReviewPrompt(null),
    },
  };
}
