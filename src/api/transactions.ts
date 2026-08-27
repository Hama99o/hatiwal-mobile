/**
 * TASK-TX01 — Transactions: the buyer/seller record created (or advanced)
 * when a seller reserves/marks-sold a listing with a specific buyer chosen
 * from the listing's conversations.
 *
 * SF-B4/SF-B5 (docs/SELL_FLOW_REDESIGN.md §8/§9) added the correction pair and
 * the per-listing ledger read the new Sales screen (SF-M5) is built on:
 *
 * Endpoints:
 *   GET    /my/transactions            — the caller's own transactions (as buyer or seller),
 *                                         optionally scoped to one listing (`listingId`) and/or
 *                                         one status ("reserved" | "sold")
 *   PATCH  /my/transactions/:id        — correct a recorded sale's quantity/buyer/price.
 *                                         `quantity: 0` (or omitted `quantity` with `clearBuyer`
 *                                         semantics aside) is NOT how you void — use DELETE.
 *   DELETE /my/transactions/:id        — void a recorded sale (the "Undo" on the mark-sold
 *                                         toast, and the Sales screen row's own Delete).
 *   PUT    /my/listings/:id/reserve    — optional { buyer_id, final_price } (see listings.ts)
 *   PUT    /my/listings/:id/sold       — optional { buyer_id, final_price } (see listings.ts)
 *
 * PATCH/DELETE both answer `{ listing, transaction? }` — the OWNER-DETAILED
 * listing (so the caller can repaint stock/status/`sale` from one response),
 * `transaction` present only when the row still exists (absent after a void).
 * A refusal (the sale already has a review) is a 422 with
 * `{ error, code: "sale_has_review" }` — read via `apiErrorCode()`
 * (`@/utils/apiError`), never the raw English `error` string.
 */
import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";
import type { Listing } from "./listings";

export interface Transaction {
  id: number;
  status: "reserved" | "sold";
  finalPrice: number;
  currency: string;
  /**
   * How many units this sale/hold covers — 1 for a single-item listing (the
   * column default). Without this the "who bought how many" ledger
   * (docs/SPIKE_LISTING_QUANTITY.md §0b) cannot render a quantity at all.
   */
  quantity: number;
  completedAt: string | null;
  createdAt: string;
  /** "buyer" | "seller" — the caller's role in this transaction. Present on /my/transactions rows. */
  role?: "buyer" | "seller" | null;
  listing: {
    id: number;
    title: string;
    thumbnailUrl: string | null;
    price: number;
    currency: string;
    status?: string;
    multiUnit?: boolean;
    availableUnits?: number;
  } | null;
  /**
   * SF-B3 — null for "sold to someone not on Hatiwal": a real, recorded sale
   * with no counterparty account. Render `listing.sale.outsideBuyer`, never a
   * "buyer info unavailable" fallback (that fallback means something else —
   * a legacy row that predates buyer attribution entirely).
   */
  buyer: { id: number; name: string; avatarUrl: string | null } | null;
  seller: { id: number; name: string; avatarUrl: string | null };
}

export interface TransactionsResponse {
  items: Transaction[];
  pagination: {
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalCount: number;
    totalPages: number;
  };
}

export interface TransactionCorrectionResponse {
  listing: Listing;
  /** Absent once the sale has been voided — nothing left to render. */
  transaction?: Transaction;
}

export const transactionsAPI = {
  getMyTransactions: async (params?: {
    as?: "buyer" | "seller";
    /** SF-B5 — scope to one listing's ledger (the Sales screen, SF-M5). */
    listingId?: number;
    status?: "reserved" | "sold";
    pageNumber?: number;
    pageSize?: number;
  }): Promise<TransactionsResponse> => {
    const query = new URLSearchParams();
    if (params?.as) query.append("as", params.as);
    if (params?.listingId) query.append("listing_id", String(params.listingId));
    if (params?.status) query.append("status", params.status);
    if (params?.pageNumber) query.append("page[number]", String(params.pageNumber));
    if (params?.pageSize) query.append("page[size]", String(params.pageSize));

    const response = await http.get(`/my/transactions?${query}`);
    return {
      items: (response.data.transactions ?? []).map(
        (t: Record<string, unknown>) => convertKeysToCamel(t) as Transaction
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as TransactionsResponse["pagination"],
    };
  },

  // SF-B4 — correct a recorded sale's quantity, buyer, and/or price. Reuses
  // the same flat-command param names `reserveListing`/`markSold` already
  // established (`buyerId`, `finalPrice`, `clearBuyer`, `quantity`) — a
  // correction is a command about a sale, not a REST PATCH of an arbitrary
  // resource, so the client sends the exact shape it already builds.
  updateTransaction: async (
    id: number,
    opts: { quantity?: number; buyerId?: number; finalPrice?: number; clearBuyer?: boolean }
  ): Promise<TransactionCorrectionResponse> => {
    const response = await http.patch(`/my/transactions/${id}`, convertKeysToSnake(opts));
    return {
      listing: convertKeysToCamel(response.data.listing) as Listing,
      transaction: response.data.transaction
        ? (convertKeysToCamel(response.data.transaction) as Transaction)
        : undefined,
    };
  },

  // SF-B4 — void a recorded sale. Restores the units to stock, gives back the
  // trust counters, and flips a sold-out listing back to `active` when this
  // sale was what retired it — all server-side, in one call.
  deleteTransaction: async (id: number): Promise<TransactionCorrectionResponse> => {
    const response = await http.delete(`/my/transactions/${id}`);
    return {
      listing: convertKeysToCamel(response.data.listing) as Listing,
      transaction: response.data.transaction
        ? (convertKeysToCamel(response.data.transaction) as Transaction)
        : undefined,
    };
  },
};
