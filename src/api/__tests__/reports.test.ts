import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { MOCK_REPORTS_RESPONSE } from "../../__tests__/mocks/handlers";
import { reportsAPI } from "../reports";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("reportsAPI.getMyReports", () => {
  it("returns camelCase reports and pagination", async () => {
    const result = await reportsAPI.getMyReports();
    expect(result.reports).toHaveLength(1);
    const report = result.reports[0];
    expect(report.id).toBe(1);
    expect(report.reason).toBe("spam");
    expect(report.status).toBe("pending");
    expect(report.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(report.reportableType).toBe("Listing");
    expect(report.reportableId).toBe(5);
    expect(report.reportableLabel).toBe("Old Phone For Sale");
  });

  it("includes pagination metadata", async () => {
    const result = await reportsAPI.getMyReports();
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.totalCount).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.nextPage).toBeNull();
  });

  it("passes the page parameter as a query string", async () => {
    let capturedUrl: string | undefined;
    server.use(
      http.get("http://localhost:3007/api/v1/reports", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(MOCK_REPORTS_RESPONSE, { status: 200 });
      })
    );
    await reportsAPI.getMyReports(3);
    expect(capturedUrl).toContain("page%5Bnumber%5D=3");
  });

  it("throws on 401 (unauthenticated)", async () => {
    server.use(
      http.get("http://localhost:3007/api/v1/reports", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
      )
    );
    await expect(reportsAPI.getMyReports()).rejects.toThrow();
  });
});

describe("reportsAPI.createReport", () => {
  it("reports a listing and returns success message", async () => {
    const result = await reportsAPI.createReport({
      reportableType: "Listing",
      reportableId: 10,
      reason: "spam",
    });
    expect(result.message).toBe("Report submitted successfully.");
  });

  it("reports a user and returns success message", async () => {
    const result = await reportsAPI.createReport({
      reportableType: "User",
      reportableId: 2,
      reason: "fraud",
    });
    expect(result.message).toBe("Report submitted successfully.");
  });

  it("sends snake_case body to the API", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("http://localhost:3007/api/v1/reports", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: "Report submitted successfully." }, { status: 201 });
      })
    );
    await reportsAPI.createReport({
      reportableType: "Listing",
      reportableId: 10,
      reason: "wrong_category",
      description: "This belongs in Vehicles",
    });
    const body = (capturedBody as any).report;
    expect(body.reportable_type).toBe("Listing");
    expect(body.reportable_id).toBe(10);
    expect(body.reason).toBe("wrong_category");
    expect(body.description).toBe("This belongs in Vehicles");
  });

  it("works with all valid reason codes", async () => {
    const reasons = ["spam", "inappropriate", "fraud", "wrong_category", "prohibited_item", "other"] as const;
    for (const reason of reasons) {
      const result = await reportsAPI.createReport({
        reportableType: "Listing",
        reportableId: 1,
        reason,
      });
      expect(result.message).toBe("Report submitted successfully.");
    }
  });

  it("throws on 422 (self-report or duplicate)", async () => {
    server.use(
      http.post("http://localhost:3007/api/v1/reports", () =>
        HttpResponse.json({ errors: ["You cannot report your own content."] }, { status: 422 })
      )
    );
    await expect(
      reportsAPI.createReport({ reportableType: "Listing", reportableId: 1, reason: "spam" })
    ).rejects.toThrow();
  });
});
