import { http, HttpResponse } from "msw";
import { server } from "../../__tests__/mocks/server";
import { reportsAPI } from "../reports";

jest.mock("@/utils/secure-storage", () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    saveAuthHeaders: jest.fn().mockResolvedValue(undefined),
    clearAuthHeaders: jest.fn().mockResolvedValue(undefined),
  },
}));

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
