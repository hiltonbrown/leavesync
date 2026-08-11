import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  database: {
    organisation: { findFirst: vi.fn() },
  },
  exportAnalyticsToCsv: vi.fn(),
  getActiveOrgContext: vi.fn(),
  listLeaveReportRecordsForDrilldown: vi.fn(),
  resolveDateRange: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/availability", () => ({
  exportAnalyticsToCsv: mocks.exportAnalyticsToCsv,
  listLeaveReportRecordsForDrilldown: mocks.listLeaveReportRecordsForDrilldown,
  resolveDateRange: mocks.resolveDateRange,
}));
vi.mock("@repo/database", () => ({
  database: mocks.database,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { exportLeaveReportsCsvAction } = await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";
const clerkOrgId = "org_123";
const userId = "user_456";

describe("analytics leave-reports server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({ id: userId });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId, organisationId },
    });
    mocks.database.organisation.findFirst.mockResolvedValue({
      timezone: "Australia/Sydney",
    });
    mocks.resolveDateRange.mockReturnValue({
      ok: true,
      value: { from: new Date(), to: new Date() },
    });
    mocks.listLeaveReportRecordsForDrilldown.mockResolvedValue({
      ok: true,
      value: { nextCursor: null, records: [] },
    });
    mocks.exportAnalyticsToCsv.mockReturnValue("name,leave_type\nJohn,Annual");
  });

  describe("baseline authorization and scoping tests", () => {
    it("rejects unauthenticated callers", async () => {
      mocks.currentUser.mockResolvedValue(null);

      const result = await exportLeaveReportsCsvAction({ organisationId });

      expect(result).toEqual({
        error: {
          code: "not_authorised",
          message: "You do not have permission to export the leave report.",
        },
        ok: false,
      });
    });

    it("rejects non-manager/admin/owner roles", async () => {
      mocks.auth.mockResolvedValue({ orgRole: "org:viewer" });

      const result = await exportLeaveReportsCsvAction({ organisationId });

      expect(result.ok).toBe(false);
    });

    it("rejects malformed input", async () => {
      const result = await exportLeaveReportsCsvAction({
        organisationId: "not-a-uuid",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation_error");
      }
    });

    it("scopes organisation lookup to clerk_org_id and organisation_id", async () => {
      await exportLeaveReportsCsvAction({ organisationId });

      expect(mocks.database.organisation.findFirst).toHaveBeenCalledWith({
        select: { timezone: true },
        where: {
          archived_at: null,
          clerk_org_id: clerkOrgId,
          id: organisationId,
        },
      });
    });
  });

  describe("action specific functionality", () => {
    it("exports CSV report successfully", async () => {
      const result = await exportLeaveReportsCsvAction({ organisationId });

      expect(result).toEqual({
        ok: true,
        value: {
          csvContent: "name,leave_type\nJohn,Annual",
          filename: "leave-report-this-year.csv",
        },
      });
      expect(mocks.listLeaveReportRecordsForDrilldown).toHaveBeenCalledWith(
        expect.objectContaining({
          actingUserId: userId,
          clerkOrgId,
          organisationId,
          role: "admin",
        })
      );
    });
  });
});
