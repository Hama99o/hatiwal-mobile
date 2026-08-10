/**
 * reserveAfterAccept — TASK-O947: after a SUCCESSFUL offer accept, prompt the
 * listing owner to reserve the listing for the conversation's buyer at the
 * accepted price in one tap — collapsing the old "dismiss thread →
 * ListingHeader lifecycle button → BuyerPickerSheet" flow, since the
 * conversation already knows both the buyer (`conversation.buyer.id`) and the
 * agreed amount (`message.offerAmount`).
 *
 * Kept as a small, standalone module (mirrors `meetupBody.ts`'s split) with a
 * minimal dependency surface (`confirmAlert`, `listingsAPI`, `toast`) so it —
 * and `handleOfferRespond` in `../Conversation.tsx` which calls it — can be
 * unit tested without mounting the full, deeply-coupled ConversationScreen.
 *
 * Review follow-up (CR on the first pass):
 *  - The failure toast is NOT its own string — it reuses
 *    `chat.listingActions.reserveFailed` (the identical copy already shown by
 *    ListingHeader's own reserve action) instead of a duplicate
 *    `chat.offer.reserveAfterAcceptFailed` key.
 *  - `confirmAlert`/native `Alert` dismiss instantly on tap, so there is no
 *    way to show an in-dialog spinner. Instead we drive a sonner-native
 *    `toast.promise` off the SAME reserve request so the user sees a loading
 *    → success/error toast the moment the alert closes, rather than dead UI
 *    on a slow network.
 *  - The CTA now carries the price ("Reserve at {{price}}") and the cancel
 *    button reads "Not now" (matching `report.cancel`/`reviews.skip`) instead
 *    of the generic `common.cancel`.
 */
import { confirmAlert } from "@/utils/alert";
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";

export interface MaybeReserveAfterAcceptParams {
  /** True when the current user is the seller/owner of this listing. */
  isOwner: boolean;
  listing: { id: number; status?: string | null } | null | undefined;
  /** The conversation's buyer — the person the seller would reserve for. */
  buyer: { id: number; name: string } | null | undefined;
  /** The accepted offer amount (message.offerAmount, or the parsed body). */
  offerAmount: number | null | undefined;
  currency?: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
  formatCurrency: (amount: number | null | undefined, currency?: string) => string;
  /** Called after a successful reserve so the caller can invalidate queries + reload. */
  onReserved?: () => void;
}

/**
 * Pure precedence rule (review fix — hoisted out of Conversation.tsx's
 * `handleOfferRespond` so it is independently unit-testable without mounting
 * the full ConversationScreen): the listing being reserved is the canonical
 * source of truth for currency — `reserveListing`'s `finalPrice` is always
 * charged in the LISTING's currency, never the offer message's — so the
 * listing's currency always wins when present. The offer's encoded currency
 * is only a fallback for the rare case a listing is missing one, and "AFN"
 * is the final fallback if both are missing.
 */
export function resolveReserveCurrency(
  listingCurrency: string | null | undefined,
  offerCurrency?: string | null | undefined
): string {
  return listingCurrency ?? offerCurrency ?? "AFN";
}

/**
 * Pure guard — decides whether the "Reserve for {buyer} at {price}" prompt
 * should be shown after a successful offer accept. Suppressed when: the
 * responder isn't the listing owner (e.g. the buyer accepting a seller's
 * counter-offer), the listing is missing or not `active` (already
 * reserved/sold/draft), there's no buyer on the conversation, or there's no
 * positive accepted amount.
 */
export function shouldPromptReserveAfterAccept(
  params: Pick<MaybeReserveAfterAcceptParams, "isOwner" | "listing" | "buyer" | "offerAmount">
): boolean {
  const { isOwner, listing, buyer, offerAmount } = params;
  if (!isOwner) return false;
  if (!listing || listing.status !== "active") return false;
  if (!buyer?.id) return false;
  if (!offerAmount || offerAmount <= 0) return false;
  return true;
}

/**
 * After a SUCCESSFUL offer accept, prompts the listing owner to reserve the
 * listing for the conversation's buyer at the accepted price.
 *
 * No-op when the guard fails. "Not now" (cancel) is also a no-op — it never
 * blocks and never auto-reserves. A reserve failure shows an error toast but
 * NEVER rolls back the offer_accepted message that was already sent (the
 * accept happens before this is even called).
 */
export function maybeReserveAfterAccept(params: MaybeReserveAfterAcceptParams): void {
  const { listing, buyer, offerAmount, currency, t, formatCurrency, onReserved } = params;
  if (!shouldPromptReserveAfterAccept(params) || !listing || !buyer || !offerAmount) return;

  const formattedPrice = formatCurrency(offerAmount, currency ?? "AFN");

  confirmAlert(
    t("chat.offer.reserveAfterAcceptTitle"),
    t("chat.offer.reserveAfterAcceptBody", { buyerName: buyer.name, price: formattedPrice }),
    [
      { text: t("chat.offer.reserveAfterAcceptDismiss"), style: "cancel" },
      {
        text: t("chat.offer.reserveAfterAcceptCta", { price: formattedPrice }),
        // Returns the promise (rather than fire-and-forget) so callers/tests
        // can `await` the full reserve attempt deterministically.
        onPress: () => {
          const reservePromise = listingsAPI.reserveListing(listing.id, {
            buyerId: buyer.id,
            finalPrice: offerAmount,
          });

          // Single loading → success/error toast lifecycle driven by the
          // sonner-native promise helper, so the request being in-flight is
          // never invisible even though the native alert already closed.
          toast.promise(reservePromise, {
            loading: t("chat.offer.reserveAfterAcceptPending"),
            success: () => t("chat.offer.reserveAfterAcceptSuccess", { buyerName: buyer.name }),
            // Reuses the identical copy ListingHeader's own reserve action
            // already shows — no duplicate translation key.
            error: () => t("chat.listingActions.reserveFailed"),
          });

          // The accept above is never rolled back — only the reserve attempt
          // failed. Swallow the rejection here (toast.promise already
          // surfaced it) so this always resolves, never throws.
          return reservePromise.then(() => onReserved?.()).catch(() => undefined);
        },
      },
    ]
  );
}
