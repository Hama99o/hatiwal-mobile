/**
 * TASK-TX01 — Transactions: the buyer/seller record created (or advanced)
 * when a seller reserves/marks-sold a listing with a specific buyer chosen
 * from the listing's conversations.
 *
 * Endpoints:
 *   GET /my/transactions            — the caller's own transactions (as buyer or seller)
 *   PUT /my/listings/:id/reserve    — optional { buyer_id, final_price } (see listings.ts)
 *   PUT /my/listings/:id/sold       — optional { buyer_id, final_price } (see listings.ts)
 */
import { http } from "./http";
import { convertKeysToCamel } from "@/utils/case-styles";

export interface Transaction {
  id: number;
  status: "reserved" | "sold";
  finalPrice: number;
  currency: string;
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
  } | null;
  buyer: { id: number; name: string; avatarUrl: string | null };
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

export const transactionsAPI = {
  getMyTransactions: async (params?: {
    as?: "buyer" | "seller";
    pageNumber?: number;
    pageSize?: number;
  }): Promise<TransactionsResponse> => {
    const query = new URLSearchParams();
    if (params?.as) query.append("as", params.as);
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
};
