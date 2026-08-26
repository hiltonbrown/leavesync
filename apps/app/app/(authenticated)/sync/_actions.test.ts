import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cancelRun: vi.fn(),
  currentUser: vi.fn(),
  dispatchManualSync: vi.fn(),
  exportFailedRecordsCsv: vi.fn(),
  getActiveOrgContext: vi.fn(),
  reconcileXeroApprovalState: vi.fn(),
  revalidatePath: vi.fn(),
  syncXeroLeaveBalances: vi.fn(),
  syncXeroLeaveRecords: vi.fn(),
  syncXeroPeople: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/availability", () => ({
  cancelRun: mocks.cancelRun,
  dispatchManualSync: mocks.dispatchManualSync,
  exportFailedRecordsCsv: mocks.exportFailedRecordsCsv,
}));
vi.mock("@repo/jobs", () => ({
  reconcileXeroApprovalState: mocks.reconcileXeroApprovalState,
  syncXeroLeaveBalances: mocks.syncXeroLeaveBalances,
  syncXeroLeaveRecords: mocks.syncXeroLeaveRecords,
  syncXeroPeople: mocks.syncXeroPeople,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const {
  cancelRunAction,
  dispatchManualSyncAction,
  exportFailedRecordsCsvAction,
} = await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";
const runId = "00000000-0000-4000-8000-000000000002";
const xeroTenantId = "00000000-0000-4000-8000-000000000003";
const clerkOrgId = "org_123";
const userId = "user_456";

describe("sync server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({ id: userId });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId, organisationId },
    });
    mocks.dispatchManualSync.mockResolvedValue({
      ok: true,
      value: { eventName: "sync.requested", queued: true },
    });
    mocks.cancelRun.mockResolvedValue({
      ok: true,
      value: { cancellationRequested: true, eventQueued: true },
    });
    mocks.exportFailedRecordsCsv.mockResolvedValue({
      ok: true,
      value: { csvContent: "id,error\n1,fail", filename: "failed.csv" },
    });
  });

  describe("baseline authorization and scoping tests", () => {
    it("rejects unauthenticated callers", async () => {
      mocks.currentUser.mockResolvedValue(null);

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result).toEqual({
        error: {
          code: "not_authorised",
          message: "Only admins and owners can manage sync health.",
        },
        ok: false,
      });
      expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
    });

    it("rejects non-admin roles (manager, viewer)", async () => {
      mocks.auth.mockResolvedValue({ orgRole: "org:manager" });

      const result = await cancelRunAction({ organisationId, runId });

      expect(result).toEqual({
        error: {
          code: "not_authorised",
          message: "Only admins and owners can manage sync health.",
        },
        ok: false,
      });
      expect(mocks.cancelRun).not.toHaveBeenCalled();
    });

    it("rejects malformed inputs", async () => {
      const result = await dispatchManualSyncAction({
        organisationId: "invalid-uuid",
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation_error");
      }
      expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
    });

    it("scopes actions to clerkOrgId and organisationId", async () => {
      await cancelRunAction({ organisationId, runId });

      expect(mocks.cancelRun).toHaveBeenCalledWith({
        actingRole: "admin",
        actingUserId: userId,
        clerkOrgId,
        organisationId,
        runId,
      });
    });
  });

  describe("action specific functionality", () => {
    it("dispatchManualSyncAction dispatches sync and revalidates sync paths", async () => {
      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "leave_records",
        xeroTenantId,
      });

      expect(result.ok).toBe(true);
      expect(mocks.dispatchManualSync).toHaveBeenCalledWith({
        actingRole: "admin",
        actingUserId: userId,
        clerkOrgId,
        organisationId,
        runType: "leave_records",
        xeroTenantId,
      });
      expect(mocks.syncXeroLeaveRecords).toHaveBeenCalledWith({
        clerkOrgId,
        organisationId,
        triggeredByUserId: userId,
        triggerType: "manual",
        xeroTenantId,
      });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/sync");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/people");
    });

    it("dispatchManualSyncAction executes syncXeroPeople when runType is people", async () => {
      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(true);
      expect(mocks.syncXeroPeople).toHaveBeenCalledWith({
        clerkOrgId,
        organisationId,
        triggeredByUserId: userId,
        triggerType: "manual",
        xeroTenantId,
      });
    });

    it("returns sync_failed error and does not report queued/successful when handler returns failed status", async () => {
      mocks.syncXeroPeople.mockResolvedValueOnce({
        ok: true,
        value: {
          errorSummary: "Xero connection not active",
          failed: 0,
          fetched: 0,
          runId: "run_failed_1",
          skipped: 0,
          status: "failed",
          upserted: 0,
        },
      });

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      expect(result).toEqual({
        error: {
          code: "sync_failed",
          message: "Xero connection not active",
        },
        ok: false,
      });
    });

    it("returns sync_failed error and does not report queued/successful when handler returns cancelled status", async () => {
      mocks.syncXeroPeople.mockResolvedValueOnce({
        ok: true,
        value: {
          errorSummary: "Tenant sync is paused for this Xero connection",
          failed: 0,
          fetched: 0,
          runId: "run_cancelled_1",
          skipped: 0,
          status: "cancelled",
          upserted: 0,
        },
      });

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      expect(result).toEqual({
        error: {
          code: "sync_failed",
          message: "Tenant sync is paused for this Xero connection",
        },
        ok: false,
      });
    });

    it("falls back to default error message when failed status has no errorSummary", async () => {
      mocks.syncXeroPeople.mockResolvedValueOnce({
        ok: true,
        value: {
          errorSummary: null,
          failed: 0,
          fetched: 0,
          runId: "run_failed_2",
          skipped: 0,
          status: "failed",
          upserted: 0,
        },
      });

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      expect(result).toEqual({
        error: {
          code: "sync_failed",
          message: "Sync run failed or was cancelled.",
        },
        ok: false,
      });
    });

    it("surfaces handler error result when handler returns ok: false", async () => {
      mocks.syncXeroPeople.mockResolvedValueOnce({
        error: {
          code: "validation_error",
          message: "Invalid sync parameters.",
        },
        ok: false,
      });

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      expect(result).toEqual({
        error: {
          code: "validation_error",
          message: "Invalid sync parameters.",
        },
        ok: false,
      });
    });

    it("surfaces sync_failed when handler throws an unexpected exception", async () => {
      mocks.syncXeroPeople.mockRejectedValueOnce(
        new Error("Database connection lost.")
      );

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result.ok).toBe(false);
      expect(result).toEqual({
        error: {
          code: "sync_failed",
          message: "Database connection lost.",
        },
        ok: false,
      });
    });

    it("exportFailedRecordsCsvAction returns CSV export data", async () => {
      const result = await exportFailedRecordsCsvAction({
        organisationId,
        runId,
      });

      expect(result).toEqual({
        ok: true,
        value: { csvContent: "id,error\n1,fail", filename: "failed.csv" },
      });
    });
  });
});
