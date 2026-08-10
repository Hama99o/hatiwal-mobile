/**
 * reserveAfterAccept — TASK-O947: after a SUCCESSFUL offer accept, prompt the
 * listing owner to reserve the listing for the conversation's buyer at the
 * accepted price in one tap — collapsing the old "dismiss thread →
 * ListingHeader lifecycle button → BuyerPickerSheet" flow, since the
 * conversation already knows both the buyer (`conversation.buyer.id`) and the
 * agreed amount (`message.offerAmount`).
 *
 * Kept as a small, standalone module (mirrors `meetupBody.ts`'s split) with a
 * minimal dependency surface (`listingsAPI`, `toast`) so it — and
 * `handleOfferRespond` in `../Conversation.tsx` which calls it — can be unit
 * tested without mounting the full, deeply-coupled ConversationScreen.
 *
 * Cycle-4 design review pivot (this file previously drove a `confirmAlert`
 * directly — see git history): the confirm step is now the SHARED
 * `BuyerPickerSheet` component in its "confirm" mode (`preselectedBuyer`) —
 * listing thumbnail + the buyer's identity (locked) + `PriceTag`, never the
 * full conversation-picker list. This module is split into two pure/typed
 * pieces so `Conversation.tsx` can own the sheet's visible/onConfirm state
 * the same way `ListingHeader.tsx` already does for its own BuyerPickerSheet:
 *  - `buildReserveAfterAcceptPrompt` — pure, no side effects. Returns the data
 *    the sheet needs to render, or `null` when the prompt should be
 *    suppressed. Building the prompt never reserves anything — the seller
 *    dismissing the sheet ("Not now") is simply never calling the function
 *    below, and the accept that already happened is untouched either way.
 *  - `reserveAfterAccept` — the side-effecting confirm. Called from the
 *    sheet's `onConfirm`. A failure here shows an error toast and NEVER rolls
 *    back the `offer_accepted` message (which was already sent before this
 *    prompt ever appeared).
 *
 * Review follow-ups baked in:
 *  - The failure toast is NOT its own string — it reuses
 *    `chat.listingActions.reserveFailed` (the identical copy ListingHeader's
 *    own reserve action already shows).
 *  - The confirm button never carries the price (DR: it truncated inside an
 *    alert BUTTON in ps/fa) — `BuyerPickerSheet` reuses its own generic
 *    `buyerPicker.confirmReserve` label. The price only ever appears in the
 *    sheet BODY, and always wrapped in a bidi isolate (see
 *    `wrapBidiIsolate`) so a Pashto/Dari sentence with an LTR name + an
 *    LTR-formatted amount spliced in never visually reorders.
 */
import { listingsAPI } from "@/api/listings";
import { toast } from "sonner-native";

export interface ReserveAfterAcceptBuyer {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

export interface MaybeReserveAfterAcceptParams {
  /** True when the current user is the seller/owner of this listing. */
  isOwner: boolean;
  listing: { id: number; status?: string | null } | null | undefined;
  /** The conversation's buyer — the person the seller would reserve for. */
  buyer: ReserveAfterAcceptBuyer | null | undefined;
  /** The accepted offer amount (message.offerAmount, or the parsed body). */
  offerAmount: number | null | undefined;
  currency?: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
  formatCurrency: (amount: number | null | undefined, currency?: string) => string;
}

/** Everything the confirm sheet needs to render — built once, held in state. */
export interface ReserveAfterAcceptPrompt {
  listingId: number;
  buyer: ReserveAfterAcceptBuyer;
  /** The accepted offer amount — becomes `final_price` on the reserve call. */
  finalPrice: number;
  currency: string;
  /** Sheet header. Generic — never interpolates the price (see file header). */
  title: string;
  /** Confirmation sentence, e.g. "Reserve for Ahmad at ؋12,000?" — buyer name
   *  and price are wrapped in bidi isolates (see `wrapBidiIsolate`). */
  body: string;
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
 * Wraps a dynamic value (a name, a formatted price) in the Unicode "first
 * strong isolate" / "pop directional isolate" pair (U+2066 / U+2069) so it
 * renders as one self-contained bidi run inside a translated sentence.
 * Without this, an LTR buyer name or an LTR-formatted currency amount
 * interpolated into a Pashto/Dari (RTL) sentence can visually reorder around
 * the surrounding punctuation — the cycle-4 design review finding that
 * originally surfaced as the price truncating/garbling inside an alert
 * BUTTON label. Isolating the value keeps its internal order fixed
 * regardless of where a translator places the `{{placeholder}}`.
 */
export function wrapBidiIsolate(value: string): string {
  return `⁦${value}⁩`;
}

/**
 * Pure — builds everything the confirm sheet (`BuyerPickerSheet` in its
 * `preselectedBuyer` confirm mode) needs to render, or `null` when the
 * prompt should be suppressed. Has NO side effects: nothing is reserved
 * until the caller explicitly invokes `reserveAfterAccept` below with the
 * returned prompt.
 */
export function buildReserveAfterAcceptPrompt(
  params: MaybeReserveAfterAcceptParams
): ReserveAfterAcceptPrompt | null {
  if (!shouldPromptReserveAfterAccept(params)) return null;
  const { listing, buyer, offerAmount, currency, t, formatCurrency } = params;
  if (!listing || !buyer || !offerAmount) return null;

  const resolvedCurrency = currency ?? "AFN";
  const formattedPrice = formatCurrency(offerAmount, resolvedCurrency);

  return {
    listingId: listing.id,
    buyer: { id: buyer.id, name: buyer.name, avatarUrl: buyer.avatarUrl ?? null },
    finalPrice: offerAmount,
    currency: resolvedCurrency,
    title: t("chat.offer.reserveAfterAcceptTitle"),
    body: t("chat.offer.reserveAfterAcceptBody", {
      buyerName: wrapBidiIsolate(buyer.name),
      price: wrapBidiIsolate(formattedPrice),
    }),
  };
}

/**
 * Side-effecting — called from the confirm sheet's `onConfirm`. Reserves the
 * listing for `prompt.buyer` at `prompt.finalPrice`. Never rolls back the
 * `offer_accepted` message that was already sent (this function doesn't
 * touch message state at all) — a failure here only shows an error toast
 * that reuses ListingHeader's own reserve-action copy.
 *
 * Returns `true`/`false` (never throws) so the caller can decide whether to
 * close the confirm sheet — mirroring `ListingHeader.tsx`'s own
 * `handleBuyerPickerConfirm`, which keeps its BuyerPickerSheet open on
 * failure so the seller can retry without re-triggering the whole accept.
 */
export async function reserveAfterAccept(
  prompt: Pick<ReserveAfterAcceptPrompt, "listingId" | "buyer" | "finalPrice">,
  options: {
    t: (key: string, options?: Record<string, unknown>) => string;
    /** Called after a successful reserve so the caller can invalidate queries + reload. */
    onReserved?: () => void;
  }
): Promise<boolean> {
  const { t, onReserved } = options;
  try {
    await listingsAPI.reserveListing(prompt.listingId, {
      buyerId: prompt.buyer.id,
      finalPrice: prompt.finalPrice,
    });
    toast.success(t("chat.offer.reserveAfterAcceptSuccess", { buyerName: prompt.buyer.name }));
    onReserved?.();
    return true;
  } catch {
    toast.error(t("chat.listingActions.reserveFailed"));
    return false;
  }
}
