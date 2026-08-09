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
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.offer.reserveAfterAcceptCta"),
        // Returns the promise (rather than fire-and-forget) so callers/tests
        // can `await` the full reserve attempt deterministically.
        onPress: () =>
          listingsAPI
            .reserveListing(listing.id, { buyerId: buyer.id, finalPrice: offerAmount })
            .then(() => {
              toast.success(t("chat.offer.reserveAfterAcceptSuccess", { buyerName: buyer.name }));
              onReserved?.();
            })
            .catch(() => {
              // The accept above is never rolled back — only the reserve attempt failed.
              toast.error(t("chat.offer.reserveAfterAcceptFailed"));
            }),
      },
    ]
  );
}
