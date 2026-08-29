import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function failDispatch() {
  mocks.dispatchManualSync.mockResolvedValueOnce({
    error: {
      code: "dispatch_failed",
      message: "Failed to queue the sync job.",
    },
    ok: false,
  });
}

function successfulInlineResult(): {
  ok: true;
  value: {
    failed: number;
    fetched: number;
    runId: string;
    skipped: number;
    status: "succeeded";
    upserted: number;
  };
} {
  return {
    ok: true,
    value: {
      failed: 0,
      fetched: 2,
      runId: "run_1",
      skipped: 0,
      status: "succeeded",
      upserted: 2,
    },
  };
}

describe("sync server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
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
    mocks.reconcileXeroApprovalState.mockResolvedValue(
      successfulInlineResult()
    );
    mocks.syncXeroLeaveBalances.mockResolvedValue(successfulInlineResult());
    mocks.syncXeroLeaveRecords.mockResolvedValue(successfulInlineResult());
    mocks.syncXeroPeople.mockResolvedValue(successfulInlineResult());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    it("queues a sync once without executing the handler inline", async () => {
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
      expect(mocks.dispatchManualSync).toHaveBeenCalledTimes(1);
      expect(mocks.syncXeroLeaveRecords).not.toHaveBeenCalled();
      expect(mocks.syncXeroPeople).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it.each([
      ["people", mocks.syncXeroPeople],
      ["leave_records", mocks.syncXeroLeaveRecords],
      ["leave_balances", mocks.syncXeroLeaveBalances],
      ["approval_state_reconciliation", mocks.reconcileXeroApprovalState],
    ])(
      "executes the %s handler inline once when non-production dispatch fails",
      async (runType, handler) => {
        failDispatch();

        const result = await dispatchManualSyncAction({
          organisationId,
          runType,
          xeroTenantId,
        });

        expect(result.ok).toBe(true);
        expect(handler).toHaveBeenCalledWith({
          clerkOrgId,
          organisationId,
          triggeredByUserId: userId,
          triggerType: "manual",
          xeroTenantId,
        });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/sync");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/people");
      }
    );

    it("does not execute inline when production dispatch fails", async () => {
      vi.stubEnv("NODE_ENV", "production");
      failDispatch();

      const result = await dispatchManualSyncAction({
        organisationId,
        runType: "people",
        xeroTenantId,
      });

      expect(result).toEqual({
        error: {
          code: "dispatch_failed",
          message: "Failed to queue the sync job.",
        },
        ok: false,
      });
      expect(mocks.syncXeroPeople).not.toHaveBeenCalled();
    });

    it("returns sync_failed error and does not report queued/successful when handler returns failed status", async () => {
      failDispatch();
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
      failDispatch();
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
      failDispatch();
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
      failDispatch();
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
      failDispatch();
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
