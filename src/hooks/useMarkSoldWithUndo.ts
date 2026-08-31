/**
 * useMarkSoldWithUndo — QA-BUG5 (FlowApp #303): the ONE implementation of
 * "mark a listing sold, then offer Undo, then maybe prompt a review" — every
 * mark-sold surface in the app must go through this, not re-derive it.
 *
 * Before this file, `useListingLifecycle.ts` (the listing screens' hook) and
 * `ListingHeader.tsx` (the chat thread's pinned mark-sold pill) each hand-rolled
 * their own `listingsAPI.markSold` mutation + success toast. They drifted:
 * `useListingLifecycle`'s toast carried the SF-M5 "Marked sold · Undo" action
 * (backed by `transactionsAPI.deleteTransaction`); `ListingHeader`'s toast was a
 * plain, un-undoable success message. Since the Sell Flow Redesign deliberately
 * made chat a PRIMARY selling surface (the buyer is already known there — mark
 * sold from the thread is the shortest real path), the path most likely to be
 * used was the one with no way back from a mistake.
 *
 * Extracted out of `useListingLifecycle.ts` (rather than widening that hook's
 * `listing` prop to swallow a conversation payload) because that hook also
 * owns publish/unpublish/renew/edit/duplicate/delete and a full
 * status→primary/moreActions mapping `ListingHeader` has no use for — and its
 * `listing` prop requires `expired`/`quantity`, neither of which
 * `ConversationSerializer`'s hand-rolled listing hash carries (see
 * `src/api/conversations.ts`'s own `Conversation["listing"]` doc). Forcing a
 * conversation payload through that Pick would mean fabricating fields chat
 * doesn't have just to satisfy a type the header never reads. This hook owns
 * exactly the mark-sold mutation, its Undo, and the QA-BUG2
 * toast-before-review-prompt sequencing — nothing else — so both callers get
 * the full behavior for free without carrying baggage they don't need.
 *
 * `useListingLifecycle` now calls this hook internally for its own
 * `buyerPicker`/`reviewPrompt` wiring; `ListingHeader` calls it directly. There
 * is exactly one `listingsAPI.markSold` call site with a success handler in
 * the whole app: this one.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";
import { listingsAPI, type Listing } from "@/api/listings";
import { transactionsAPI, type Transaction } from "@/api/transactions";
import { type BuyerPickerResult } from "@/components/common/BuyerPickerSheet";
import { apiErrorMessage } from "@/utils/apiError";

/**
 * How long the "Marked sold · Undo" toast stays up. sonner-native's default is
 * 4000ms, which is the floor for a snackbar with NO action; this one carries the
 * only way back from a mistaken sale, so it gets the read-decide-and-act budget
 * an actioned snackbar is supposed to have. Named rather than inlined because
 * the review-prompt sequencing below hangs off this same toast's lifecycle.
 */
export const UNDO_TOAST_DURATION_MS = 8000;

export interface MarkSoldResponse {
  listing: Listing;
  transaction?: Transaction;
}

export interface MarkSoldReviewPrompt {
  visible: boolean;
  transactionId: number;
  buyerName: string;
  buyerAvatarUrl: string | null;
  onClose: () => void;
}

export interface UseMarkSoldWithUndoOptions {
  /** The listing every markSold/undo call targets. */
  listingId: number;
  /**
   * Fired synchronously on every successful state change this hook makes —
   * a mark-sold AND its Undo both change what the listing/transaction data
   * says, so both need the caller's own cache refreshed. Also where a caller
   * does its own local bookkeeping (closing its picker/confirm sheet) —
   * `useListingLifecycle` passes a callback that runs its `invalidateAll()`
   * and clears `buyerPickerAction`; `ListingHeader` passes one that closes
   * its confirm sheet and calls its own `onLifecycleDone` prop. Never fired
   * on failure — the sheet must stay open for a retry.
   */
  onChange: () => void;
}

export interface UseMarkSoldWithUndoResult {
  /** Fire-and-forget — for a caller that doesn't need to await the result (e.g. `buyerPicker.onConfirm`). */
  markSold: (opts?: BuyerPickerResult) => void;
  /** Awaitable — for a caller that needs to know success/failure itself (e.g. to keep its own sheet open on error). */
  markSoldAsync: (opts?: BuyerPickerResult) => Promise<MarkSoldResponse>;
  /** True while mark-sold OR its Undo is in flight. */
  isSubmitting: boolean;
  /**
   * The last mark-sold failure, or `null`. `toast.error` already surfaces
   * this globally; expose it too for a caller whose confirm sheet is a raw
   * RN `<Modal>` that occludes that toast on Android (the same QA-BUG2 class
   * of problem, but for the error path) — it can render this inline instead.
   */
  error: unknown;
  /** Clears `error` — call when the picker opens/closes so a stale failure never resurfaces on the next attempt. */
  resetError: () => void;
  reviewPrompt: MarkSoldReviewPrompt;
}

export function useMarkSoldWithUndo({
  listingId,
  onChange,
}: UseMarkSoldWithUndoOptions): UseMarkSoldWithUndoResult {
  const { t } = useTranslation();

  // REV2: after a sold sale records a real buyer, prompt the seller to rate them.
  const [reviewPrompt, setReviewPrompt] = useState<{
    transactionId: number;
    buyerName: string;
    buyerAvatarUrl: string | null;
  } | null>(null);

  // SF-M5 — the "Undo" toast action's side effect. Same DELETE the Sales
  // screen's own row Delete button calls (`transactionsAPI.deleteTransaction`)
  // — one void path, not two. Restores stock and, if this sale had sold the
  // listing out, flips it back to `active` server-side; both are already
  // covered by the caller's own `onChange` refresh.
  const undoMarkSold = useMutation({
    mutationFn: (transactionId: number) => transactionsAPI.deleteTransaction(transactionId),
    onSuccess: () => {
      onChange();
      toast.success(t("listing.sale.voidedSuccess"));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  const markSold = useMutation({
    mutationFn: (opts?: BuyerPickerResult) => listingsAPI.markSold(listingId, opts),
    onSuccess: (data) => {
      onChange();

      // SF-M5 (docs/SELL_FLOW_REDESIGN.md §10.3) — "Marked sold · Undo". The
      // big-tech answer to a mistake is a snackbar undo, not a correction
      // form, and it must never BLOCK: the sale already completed by the
      // time this fires, undo is only ever offered afterward. Every markSold
      // call now leaves exactly one sold Transaction (SF-B3 — the legacy
      // buyer-less/skip paths both record a real, ledger-visible row), so
      // this is unconditional whenever the response actually carries an id.
      const soldTransactionId = data.transaction?.id;
      const buyer = data.transaction?.buyer;

      // QA-BUG2 (FlowApp #300) — this exact toast/sheet pair used to open in
      // the SAME tick: `ReviewPromptSheet` is a raw RN <Modal> (see its own
      // file header — @gorhom/bottom-sheet crashes the web dev runner, so
      // every sheet in the app uses this pattern), and a native RN <Modal>
      // opens its OWN native window on Android. sonner-native only escapes
      // that via react-native-screens' `FullWindowOverlay`, and that
      // component has NO Android implementation at all (checked: its native
      // folder is `ios/`-only) — there is no library-provided way to render
      // a JS toast above a native Android Dialog window. So the sheet's own
      // backdrop landed on top of the "Marked sold · Undo" toast on Android,
      // and tapping where Undo used to be just dismissed the sheet instead.
      //
      // This was already caught once (QA run-019) and "fixed" by deleting
      // the toast assertion from the Maestro flow — which is exactly how
      // SF-M5 got built with its Undo hanging on a toast nothing had
      // confirmed was reachable. Not repeating that: instead of racing the
      // sheet against the toast, the review invite now WAITS for the toast
      // to finish its own lifecycle (auto-close after its duration, or a
      // manual swipe-dismiss) before it opens — so Undo always gets the
      // toast to itself first, on every platform. `reviewOpened` guards
      // against firing twice (sonner-native can call onAutoClose AND
      // onDismiss for the same toast); `undone` cancels the invite entirely
      // if the seller actually used Undo before the toast went away — the
      // sale it would invite a review for no longer exists.
      let undone = false;
      let reviewOpened = false;
      const openReviewIfDue = () => {
        if (reviewOpened || undone || !buyer || !data.transaction) return;
        reviewOpened = true;
        setReviewPrompt({
          transactionId: data.transaction.id,
          buyerName: buyer.name,
          buyerAvatarUrl: buyer.avatarUrl,
        });
      };

      toast.success(
        t("listing.markSoldSuccess"),
        soldTransactionId
          ? {
              // See A10 in qa/reports/SELL_FLOW_QA_2026-08-28.md: the default
              // 4000ms gave the seller four seconds to undo a sale that has no
              // other recourse, and a device run proved a real tap can miss it.
              duration: UNDO_TOAST_DURATION_MS,
              action: {
                label: t("common.undo"),
                onClick: () => {
                  undone = true;
                  undoMarkSold.mutate(soldTransactionId);
                },
              },
              onAutoClose: openReviewIfDue,
              onDismiss: openReviewIfDue,
            }
          : undefined
      );

      // No transaction id means no Undo action was ever offered (SF-B3 says
      // this shouldn't happen, but stays defensive) — nothing can occlude a
      // toast that carries no action, so there is no reason to wait for it.
      if (!soldTransactionId) openReviewIfDue();
    },
    onError: (err) => toast.error(apiErrorMessage(err, t)),
  });

  return {
    markSold: (opts) => markSold.mutate(opts),
    markSoldAsync: (opts) => markSold.mutateAsync(opts),
    // Deliberately excludes `undoMarkSold.isPending` — Undo only ever fires
    // from the toast's own action AFTER the confirm sheet that this flag
    // gates has already closed (see `markSold`'s own `onChange` above), so
    // there is nothing left for it to disable.
    isSubmitting: markSold.isPending,
    error: markSold.error,
    resetError: markSold.reset,
    reviewPrompt: {
      visible: reviewPrompt !== null,
      transactionId: reviewPrompt?.transactionId ?? 0,
      buyerName: reviewPrompt?.buyerName ?? "",
      buyerAvatarUrl: reviewPrompt?.buyerAvatarUrl ?? null,
      onClose: () => setReviewPrompt(null),
    },
  };
}
