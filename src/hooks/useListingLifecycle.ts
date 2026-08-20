/**
 * useListingLifecycle — TASK-L863: the single source of truth for a seller's
 * listing lifecycle actions (publish / reserve / mark sold / unpublish /
 * activate / renew / edit / duplicate / delete).
 *
 * Before this hook, `SellerListingCard.tsx` and `MyListingDetail.tsx` each
 * hand-rolled the same seven `useMutation`s, the same `confirmAlert` copy,
 * the same invalidation sets, and the same BuyerPickerSheet/ReviewPromptSheet
 * wiring — ~200 duplicated lines that had already drifted apart (the two
 * screens disagreed about the primary action for an `active` listing). This
 * hook owns ALL of that; the screens only render what it returns.
 *
 * Canonical primary action per status (the single most obvious next step):
 *   draft            → Publish
 *   active           → Mark reserved
 *   active + expired → Renew (overrides the status-based primary)
 *   reserved         → Mark sold
 *   sold             → none (terminal)
 *
 * Everything else — Mark sold/reserved on an expired-active listing,
 * Activate on a reserved listing, Unpublish, Edit, Duplicate (available for
 * EVERY status, including sold), Delete (destructive, always last) — lands
 * in `moreActions`, rendered by `ListingActionsSheet`.
 *
 * Reserve / Mark sold never go through `confirmAlert` — they open
 * `BuyerPickerSheet` so the seller can identify the real buyer from the
 * listing's conversations; the sheet's own Confirm button IS the
 * confirmation step (TASK-TX01). A `sold` response carrying a recorded buyer
 * (`transaction.buyer`) opens `ReviewPromptSheet` right after (REV2,
 * double-blind reviews).
 */
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import {
  CheckCircle2,
  Clock,
  EyeOff,
  RotateCcw,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react-native";

import { listingsAPI, type Listing } from "@/api/listings";
import { type BuyerPickerResult } from "@/components/common/BuyerPickerSheet";
import { type ListingActionRow } from "@/components/common/ListingActionsSheet";
import { confirmAlert } from "@/utils/alert";

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
  listing: Pick<Listing, "status" | "expired"> | null | undefined;
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
  action: "reserve" | "sold";
  onClose: () => void;
  onConfirm: (result: BuyerPickerResult) => void;
  isSubmitting: boolean;
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

  // TASK-TX01: which lifecycle action opened the buyer picker, if any.
  const [buyerPickerAction, setBuyerPickerAction] = useState<"reserve" | "sold" | null>(null);
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
    onError: () => toast.error(t("common.error")),
  });

  const reserve = useMutation({
    mutationFn: (opts?: BuyerPickerResult) => listingsAPI.reserveListing(listingId, opts),
    onSuccess: () => {
      invalidateAll();
      setBuyerPickerAction(null);
      toast.success(t("listing.reserveSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const markSold = useMutation({
    mutationFn: (opts?: BuyerPickerResult) => listingsAPI.markSold(listingId, opts),
    onSuccess: (data) => {
      invalidateAll();
      setBuyerPickerAction(null);
      toast.success(t("listing.markSoldSuccess"));
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
    onError: () => toast.error(t("common.error")),
  });

  const unpublish = useMutation({
    mutationFn: () => listingsAPI.unpublishListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.unpublishSuccess")); },
    onError: () => toast.error(t("common.error")),
  });

  const activate = useMutation({
    mutationFn: () => listingsAPI.activateListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.activateSuccess")); },
    onError: () => toast.error(t("common.error")),
  });

  const renew = useMutation({
    mutationFn: () => listingsAPI.renewListing(listingId),
    onSuccess: () => { invalidateAll(); toast.success(t("listing.renewSuccess")); },
    onError: () => toast.error(t("common.error")),
  });

  const deleteListing = useMutation({
    mutationFn: () => listingsAPI.deleteListing(listingId),
    onSuccess: () => {
      invalidateAll();
      toast.success(t("listing.deleteSuccess"));
      onDeleted?.();
    },
    onError: () => toast.error(t("common.error")),
  });

  const isBusy =
    publish.isPending ||
    reserve.isPending ||
    markSold.isPending ||
    unpublish.isPending ||
    activate.isPending ||
    renew.isPending ||
    deleteListing.isPending;

  // ── Confirm handlers — confirmAlert is the confirmation step for every
  // action EXCEPT reserve/mark-sold (those open BuyerPickerSheet instead) ──

  const handlePublish = useCallback(() => {
    confirmAlert(
      t("listing.confirmPublish"),
      t("listing.confirmPublishDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.publish"), onPress: () => publish.mutate() },
      ]
    );
  }, [t, publish]);

  // TASK-TX01: Reserve/Mark-sold open the BuyerPickerSheet so the seller can
  // identify the real buyer from this listing's conversations.
  const handleReserve = useCallback(() => setBuyerPickerAction("reserve"), []);
  const handleMarkSold = useCallback(() => setBuyerPickerAction("sold"), []);

  const handleBuyerPickerConfirm = useCallback(
    (result: BuyerPickerResult) => {
      if (buyerPickerAction === "reserve") reserve.mutate(result);
      else if (buyerPickerAction === "sold") markSold.mutate(result);
    },
    [buyerPickerAction, reserve, markSold]
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

  const handleActivate = useCallback(() => {
    confirmAlert(
      t("listing.confirmActivate"),
      t("listing.confirmActivateDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("listing.activate"), onPress: () => activate.mutate() },
      ]
    );
  }, [t, activate]);

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
  const isExpired = status === "active" && !!listing?.expired;

  const primaryAction: ListingLifecyclePrimaryAction | null = useMemo(() => {
    if (isExpired) return { label: t("listing.renew"), onPress: handleRenew };
    switch (status) {
      case "draft":
        return { label: t("listing.publish"), onPress: handlePublish };
      case "active":
        return { label: t("listing.markReserved"), onPress: handleReserve };
      case "reserved":
        return { label: t("listing.markSold"), onPress: handleMarkSold };
      default:
        return null; // sold, or not loaded yet — no primary action to show
    }
  }, [isExpired, status, t, handleRenew, handlePublish, handleReserve, handleMarkSold]);

  // ── More actions — everything not chosen as primary. No variant is
  // dropped versus the two screens this hook replaces: an expired-active
  // listing can still be marked reserved/sold and unpublished, a reserved
  // listing can still be reactivated, and Duplicate/Edit/Delete are always
  // reachable regardless of status. ─────────────────────────────────────

  const moreActions: ListingActionRow[] = useMemo(() => {
    const actions: ListingActionRow[] = [];

    if (status === "active") {
      actions.push({ key: "sold", label: t("listing.markSold"), icon: CheckCircle2, onPress: handleMarkSold });
      if (isExpired) {
        // Renew is primary once expired, but Mark reserved is still reachable.
        actions.push({ key: "reserve", label: t("listing.markReserved"), icon: Clock, onPress: handleReserve });
      }
      actions.push({ key: "unpublish", label: t("listing.unpublish"), icon: EyeOff, onPress: handleUnpublish });
    }

    if (status === "reserved") {
      actions.push({ key: "activate", label: t("listing.activate"), icon: RotateCcw, onPress: handleActivate });
    }

    actions.push({ key: "edit", label: t("common.edit"), icon: Pencil, onPress: handleEdit });
    actions.push({ key: "duplicate", label: t("listing.duplicate"), icon: Copy, onPress: handleDuplicate });
    actions.push({ key: "delete", label: t("common.delete"), icon: Trash2, onPress: handleDelete, danger: true });

    return actions;
  }, [
    status,
    isExpired,
    t,
    handleMarkSold,
    handleReserve,
    handleUnpublish,
    handleActivate,
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
      action: buyerPickerAction ?? "reserve",
      onClose: () => setBuyerPickerAction(null),
      onConfirm: handleBuyerPickerConfirm,
      isSubmitting: reserve.isPending || markSold.isPending,
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
