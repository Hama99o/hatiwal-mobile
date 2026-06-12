/**
 * Reports API — POST /reports
 *
 * Supports polymorphic reporting: reportable_type "Listing" | "User".
 * Backend: Api::V1::ReportsController#create
 * Validation enforces:
 *   - Cannot report own listing or yourself → 422
 *   - Cannot submit duplicate report → 422
 */

import { http } from "./http";
import { convertKeysToSnake } from "@/utils/case-styles";

export type ReportableType = "Listing" | "User";

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "fraud"
  | "wrong_category"
  | "prohibited_item"
  | "other";

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
  createReport: async (params: CreateReportParams): Promise<ReportResponse> => {
    const body = convertKeysToSnake(params) as Record<string, unknown>;
    const response = await http.post("/reports", { report: body });
    return response.data as ReportResponse;
  },
};
