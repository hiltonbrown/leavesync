import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  dispatchManualSync: vi.fn(),
  reconcileXeroApprovalState: vi.fn(),
  requireOrg: vi.fn(),
  requireRole: vi.fn(),
  syncXeroLeaveBalances: vi.fn(),
  syncXeroLeaveRecords: vi.fn(),
  syncXeroPeople: vi.fn(),
}));

vi.mock("@repo/auth/helpers", () => ({
  currentUser: mocks.currentUser,
  requireOrg: mocks.requireOrg,
  requireRole: mocks.requireRole,
}));
vi.mock("@repo/availability", () => ({
  dispatchManualSync: mocks.dispatchManualSync,
}));
vi.mock("@repo/jobs", () => ({
  reconcileXeroApprovalState: mocks.reconcileXeroApprovalState,
  syncXeroLeaveBalances: mocks.syncXeroLeaveBalances,
  syncXeroLeaveRecords: mocks.syncXeroLeaveRecords,
  syncXeroPeople: mocks.syncXeroPeople,
}));

const { POST } = await import("./route");

const input = {
  organisationId: "00000000-0000-4000-8000-000000000001",
  runType: "people",
  xeroTenantId: "00000000-0000-4000-8000-000000000002",
} as const;

function request(body: unknown): Request {
  return new Request("https://api.example.com/api/sync/dispatch", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function successfulInlineResult() {
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
  } as const;
}

describe("manual sync dispatch route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    mocks.requireOrg.mockResolvedValue("org_123");
    mocks.currentUser.mockResolvedValue({ id: "user_123" });
    mocks.requireRole.mockImplementation((role: string) =>
      Promise.resolve(role === "org:admin")
    );
    mocks.dispatchManualSync.mockResolvedValue({
      ok: true,
      value: { eventName: "sync-xero-people", queued: true },
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

  it("rejects unauthenticated callers", async () => {
    mocks.requireOrg.mockRejectedValueOnce(new Error("No organisation"));

    const response = await POST(request(input));

    expect(response.status).toBe(401);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("rejects callers who are not admins or owners", async () => {
    mocks.requireRole.mockResolvedValue(false);

    const response = await POST(request(input));

    expect(response.status).toBe(403);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("validates the external request body", async () => {
    const response = await POST(request({ ...input, organisationId: "bad" }));

    expect(response.status).toBe(400);
    expect(mocks.dispatchManualSync).not.toHaveBeenCalled();
  });

  it("dispatches with both authenticated tenant identifiers", async () => {
    const response = await POST(request(input));

    expect(response.status).toBe(202);
    expect(mocks.dispatchManualSync).toHaveBeenCalledWith({
      actingRole: "admin",
      actingUserId: "user_123",
      clerkOrgId: "org_123",
      organisationId: input.organisationId,
      runType: "people",
      xeroTenantId: input.xeroTenantId,
    });
    expect(mocks.syncXeroPeople).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      value: { eventName: "sync-xero-people", queued: true },
    });
  });

  it("preserves a scoped service failure", async () => {
    mocks.dispatchManualSync.mockResolvedValueOnce({
      error: {
        code: "tenant_not_found",
        message: "Xero tenant was not found for this organisation.",
      },
      ok: false,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "tenant_not_found",
        message: "Xero tenant was not found for this organisation.",
      },
      ok: false,
    });
  });

  it.each([
    { handler: mocks.syncXeroPeople, runType: "people" },
    { handler: mocks.syncXeroLeaveRecords, runType: "leave_records" },
    { handler: mocks.syncXeroLeaveBalances, runType: "leave_balances" },
    {
      handler: mocks.reconcileXeroApprovalState,
      runType: "approval_state_reconciliation",
    },
  ] as const)(
    "executes the $runType handler once when local dispatch fails",
    async ({ handler, runType }) => {
      mocks.dispatchManualSync.mockResolvedValueOnce({
        error: {
          code: "dispatch_failed",
          message: "Failed to queue the sync job.",
        },
        ok: false,
      });

      const response = await POST(request({ ...input, runType }));

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        clerkOrgId: "org_123",
        organisationId: input.organisationId,
        triggeredByUserId: "user_123",
        triggerType: "manual",
        xeroTenantId: input.xeroTenantId,
      });
      await expect(response.json()).resolves.toMatchObject({
        ok: true,
        value: {
          failed: 0,
          fetched: 2,
          queued: true,
          runId: "run_1",
          status: "succeeded",
          upserted: 2,
        },
      });
    }
  );

  it("keeps production dispatch failures as 503 responses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.dispatchManualSync.mockResolvedValueOnce({
      error: {
        code: "dispatch_failed",
        message: "Failed to queue the sync job.",
      },
      ok: false,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(503);
    expect(mocks.syncXeroPeople).not.toHaveBeenCalled();
  });

  it.each(["failed", "cancelled"] as const)(
    "does not report a locally executed %s run as successful",
    async (status) => {
      mocks.dispatchManualSync.mockResolvedValueOnce({
        error: {
          code: "dispatch_failed",
          message: "Failed to queue the sync job.",
        },
        ok: false,
      });
      mocks.syncXeroPeople.mockResolvedValueOnce({
        ok: true,
        value: {
          failed: 0,
          fetched: 0,
          runId: "run_failed",
          skipped: 0,
          status,
          upserted: 0,
        },
      });

      const response = await POST(request(input));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: "sync_failed",
          message: "Sync run failed or was cancelled.",
        },
        ok: false,
      });
    }
  );

  it("preserves a local handler error", async () => {
    mocks.dispatchManualSync.mockResolvedValueOnce({
      error: {
        code: "dispatch_failed",
        message: "Failed to queue the sync job.",
      },
      ok: false,
    });
    mocks.syncXeroPeople.mockResolvedValueOnce({
      error: { code: "unknown_error", message: "Xero read failed." },
      ok: false,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "unknown_error", message: "Xero read failed." },
      ok: false,
    });
  });

  it("surfaces an unexpected local handler exception", async () => {
    mocks.dispatchManualSync.mockResolvedValueOnce({
      error: {
        code: "dispatch_failed",
        message: "Failed to queue the sync job.",
      },
      ok: false,
    });
    mocks.syncXeroPeople.mockRejectedValueOnce(
      new Error("Database connection lost.")
    );

    const response = await POST(request(input));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "sync_failed", message: "Database connection lost." },
      ok: false,
    });
  });
});
