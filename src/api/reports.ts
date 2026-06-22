/**
 * Reports API
 *
 * POST /reports — submit a polymorphic report against a Listing or User.
 * GET  /reports — list the current user's own reports (auth required).
 *
 * Backend: Api::V1::ReportsController#create + #index
 */

import { http } from "./http";
import { convertKeysToCamel, convertKeysToSnake } from "@/utils/case-styles";

export type ReportableType = "Listing" | "User";

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "fraud"
  | "wrong_category"
  | "prohibited_item"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export interface Report {
  id: number;
  reason: ReportReason;
  status: ReportStatus;
  description?: string;
  createdAt: string;
  reportableType: ReportableType;
  reportableId: number;
  /** Safe display label — listing title, user name, or "[deleted]" */
  reportableLabel: string;
}

export interface ReportsPagination {
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  totalCount: number;
  totalPages: number;
}

export interface MyReportsResponse {
  reports: Report[];
  pagination: ReportsPagination;
}

export interface CreateReportParams {
  reportableType: ReportableType;
  reportableId: number;
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  message: string;
}

export const reportsAPI = {
  /** Fetch the authenticated user's own reports, paginated. */
  getMyReports: async (page = 1): Promise<MyReportsResponse> => {
    const query = new URLSearchParams();
    query.append("page[number]", String(page));
    const response = await http.get(`/reports?${query}`);
    return {
      reports: (response.data.reports ?? []).map(
        (r: Record<string, unknown>) => convertKeysToCamel(r) as Report
      ),
      pagination: convertKeysToCamel(
        response.data.meta.pagination
      ) as ReportsPagination,
    };
  },

  /** Submit a new report against a listing or user. */
  createReport: async (params: CreateReportParams): Promise<ReportResponse> => {
    const body = convertKeysToSnake(params) as Record<string, unknown>;
    const response = await http.post("/reports", { report: body });
    return response.data as ReportResponse;
  },
};
