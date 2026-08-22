import { Prisma } from "@repo/database/generated/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditEventCreate: vi.fn(),
  availabilityRecordFindMany: vi.fn(),
  availabilityRecordUpdateMany: vi.fn(),
  dispatchNotification: vi.fn(),
  ensureFreshXeroConnection: vi.fn(),
  failedRecordCreate: vi.fn(),
  fetchLeaveApplicationStatusForRegion: vi.fn(),
  inngestSend: vi.fn(() => Promise.resolve({ ids: ["event_1"] })),
  publishOrganisationNotificationEvent: vi.fn(),
  scopedTo: vi.fn((scope: { clerkOrgId: string; organisationId: string }) => ({
    clerk_org_id: scope.clerkOrgId,
    organisation_id: scope.organisationId,
  })),
  syncRunCreate: vi.fn(),
  syncRunFindFirst: vi.fn(),
  syncRunUpdateMany: vi.fn(),
  toPlainLanguageMessage: vi.fn(() => "Xero request failed"),
  xeroTenantFindFirst: vi.fn(),
  xeroTenantUpdateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../client", () => ({
  inngest: {
    createFunction: vi.fn(() => ({ id: "reconcile-xero-approval-state" })),
    send: mocks.inngestSend,
  },
}));
vi.mock("@repo/auth/server", () => ({ clerkClient: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    $transaction: vi.fn(async (callback) =>
      callback({
        auditEvent: { create: mocks.auditEventCreate },
        availabilityRecord: { updateMany: mocks.availabilityRecordUpdateMany },
      })
    ),
    availabilityRecord: { findMany: mocks.availabilityRecordFindMany },
    failedRecord: { create: mocks.failedRecordCreate },
    syncRun: {
      create: mocks.syncRunCreate,
      findFirst: mocks.syncRunFindFirst,
      updateMany: mocks.syncRunUpdateMany,
    },
    xeroTenant: {
      findFirst: mocks.xeroTenantFindFirst,
      updateMany: mocks.xeroTenantUpdateMany,
    },
  },
  scopedTo: mocks.scopedTo,
}));
vi.mock("@repo/database/generated/client", () => ({
  Prisma: { DbNull: "DbNull" },
}));
vi.mock("@repo/notifications", () => ({
  dispatchNotification: mocks.dispatchNotification,
  publishOrganisationNotificationEvent:
    mocks.publishOrganisationNotificationEvent,
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));
vi.mock("@repo/xero", () => ({
  ensureFreshXeroConnection: mocks.ensureFreshXeroConnection,
  fetchLeaveApplicationStatusForRegion:
    mocks.fetchLeaveApplicationStatusForRegion,
  toPlainLanguageMessage: mocks.toPlainLanguageMessage,
}));

const { reconcileXeroApprovalState } = await import(
  "./reconcile-xero-approval-state"
);

const CLERK_ORG_ID = "org_reconciliation_guard";
const ORGANISATION_ID = "30000000-0000-4000-8000-000000000001";
const RUN_ID = "10000000-0000-4000-8000-000000000001";
const XERO_TENANT_ID = "20000000-0000-4000-8000-000000000001";
const XERO_CONNECTION_ID = "40000000-0000-4000-8000-000000000001";
const RECORD_ID = "80000000-0000-4000-8000-000000000001";

function input() {
  return {
    clerkOrgId: CLERK_ORG_ID,
    organisationId: ORGANISATION_ID,
    triggerType: "manual",
    xeroTenantId: XERO_TENANT_ID,
  };
}

function record() {
  return {
    approval_status: "submitted",
    derived_sequence: 4,
    failed_action: null,
    id: RECORD_ID,
    person: {
      clerk_user_id: "user_record_owner",
      first_name: "Ada",
      id: "70000000-0000-4000-8000-000000000001",
      last_name: "Lovelace",
    },
    record_type: "annual_leave",
    source_remote_id: "xero-leave-application-1",
  };
}

describe("reconcile Xero approval state optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncRunCreate.mockResolvedValue({ id: RUN_ID });
    mocks.syncRunFindFirst.mockResolvedValue(null);
    mocks.syncRunUpdateMany.mockResolvedValue({ count: 1 });
    mocks.xeroTenantFindFirst.mockResolvedValue({
      id: XERO_TENANT_ID,
      payroll_region: "AU",
      sync_paused_at: null,
      xero_connection_id: XERO_CONNECTION_ID,
    });
    mocks.ensureFreshXeroConnection.mockResolvedValue({
      ok: true,
      value: { refreshed: false },
    });
    mocks.availabilityRecordFindMany.mockResolvedValue([record()]);
    mocks.availabilityRecordUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditEventCreate.mockResolvedValue({});
    mocks.dispatchNotification.mockResolvedValue({});
    mocks.failedRecordCreate.mockResolvedValue({});
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: {
        approvedAt: null,
        rawResponse: {},
        status: "REJECTED",
      },
    });
  });

  it("counts a stale declined transition as matched without auditing or notifying", async () => {
    mocks.availabilityRecordUpdateMany.mockResolvedValue({ count: 0 });

    const result = await reconcileXeroApprovalState(input());

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ declined: 0, matched: 1 }),
      })
    );
    expect(mocks.auditEventCreate).not.toHaveBeenCalled();
    expect(mocks.dispatchNotification).not.toHaveBeenCalled();
  });

  it("audits and notifies after a guarded declined transition", async () => {
    const result = await reconcileXeroApprovalState(input());

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ declined: 1, matched: 0 }),
      })
    );
    expect(mocks.auditEventCreate).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "leave_declined" }),
      expect.anything()
    );
  });

  it("pins the snapshot state and tenant scope in the transition predicate", async () => {
    await reconcileXeroApprovalState(input());

    expect(mocks.availabilityRecordUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approval_status: "submitted",
          clerk_org_id: CLERK_ORG_ID,
          derived_sequence: 4,
          organisation_id: ORGANISATION_ID,
        }),
      })
    );
  });

  it("does not audit an archive when the snapshot is stale", async () => {
    mocks.availabilityRecordUpdateMany.mockResolvedValue({ count: 0 });
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      error: { code: "not_found_error", rawPayload: null },
      ok: false,
    });

    await reconcileXeroApprovalState(input());

    expect(mocks.auditEventCreate).not.toHaveBeenCalled();
  });

  it("clears the write-error fields on the decline branch", async () => {
    mocks.availabilityRecordFindMany.mockResolvedValue([
      {
        ...record(),
        approval_status: "xero_sync_failed",
        failed_action: "decline",
      },
    ]);

    await reconcileXeroApprovalState(input());

    expect(mocks.availabilityRecordUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_status: "declined",
          failed_action: null,
          xero_write_error: null,
          xero_write_error_raw: Prisma.DbNull,
        }),
      })
    );
  });

  it("clears the write-error fields on the final withdraw branch", async () => {
    mocks.availabilityRecordFindMany.mockResolvedValue([
      { ...record(), approval_status: "approved" },
    ]);
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: {
        approvedAt: null,
        rawResponse: {},
        status: "WITHDRAWN",
      },
    });

    await reconcileXeroApprovalState(input());

    expect(mocks.availabilityRecordUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_status: "withdrawn",
          failed_action: null,
          xero_write_error: null,
          xero_write_error_raw: Prisma.DbNull,
        }),
      })
    );
  });
});

describe("reconcile Xero approval state bounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncRunCreate.mockResolvedValue({ id: RUN_ID });
    mocks.syncRunFindFirst.mockResolvedValue(null);
    mocks.syncRunUpdateMany.mockResolvedValue({ count: 1 });
    mocks.xeroTenantFindFirst.mockResolvedValue({
      id: XERO_TENANT_ID,
      payroll_region: "AU",
      sync_paused_at: null,
      xero_connection_id: XERO_CONNECTION_ID,
    });
    mocks.ensureFreshXeroConnection.mockResolvedValue({
      ok: true,
      value: { refreshed: false },
    });
    mocks.auditEventCreate.mockResolvedValue({});
    mocks.dispatchNotification.mockResolvedValue({});
    mocks.failedRecordCreate.mockResolvedValue({});
    mocks.availabilityRecordUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("windows candidates by ends_at and caps with take 500 ordered by approval_status", async () => {
    mocks.availabilityRecordFindMany.mockResolvedValue([]);
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "APPROVED" },
    });

    await reconcileXeroApprovalState(input());

    expect(mocks.availabilityRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ approval_status: "asc" }, { created_at: "asc" }],
        take: 500,
        where: expect.objectContaining({
          ends_at: expect.objectContaining({ gte: expect.any(Date) }),
          source_remote_id: { not: null },
        }),
      })
    );
  });

  it("cap translates to partial_success with capped error summary and partial flag", async () => {
    vi.useFakeTimers();
    const records = Array.from({ length: 500 }, (_, i) => ({
      ...record(),
      approval_status: "submitted" as const,
      id: `80000000-0000-4000-8000-00000000${String(i).padStart(4, "0")}`.slice(
        0,
        36
      ),
      source_remote_id: `xero-leave-${i}`,
    }));
    mocks.availabilityRecordFindMany.mockResolvedValue(
      records as unknown as Awaited<
        ReturnType<typeof mocks.availabilityRecordFindMany>
      >
    );
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "APPROVED" },
    });

    const promise = reconcileXeroApprovalState(input());
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    if (result.ok) {
      expect(result.value.partial).toBe(true);
      expect(result.value.status).toBe("partial_success");
    }
    expect(mocks.syncRunUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          error_summary: expect.stringContaining("capped at 500"),
          status: "partial_success",
        }),
      })
    );
  });

  it("non-capped run is succeeded when no failures and partial is false", async () => {
    mocks.availabilityRecordFindMany.mockResolvedValue([record()]);
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "REJECTED" },
    });

    const result = await reconcileXeroApprovalState(input());

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ partial: false, status: "succeeded" }),
      })
    );
  });

  it("partial run is distinct from failed and succeeded via status enum", async () => {
    vi.useFakeTimers();
    const records = Array.from({ length: 500 }, (_, i) => ({
      ...record(),
      id:
        `80000000-0000-4000-8000-00000001${String(i).padStart(4, "0")}`
          .slice(-4)
          .padStart(8, "0") + "-0000-4000-8000-000000000001".slice(8),
      source_remote_id: `xero-leave-partial-${i}`,
    }));
    mocks.availabilityRecordFindMany.mockResolvedValue(
      records as unknown as Awaited<
        ReturnType<typeof mocks.availabilityRecordFindMany>
      >
    );
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: {
        approvedAt: new Date("2026-06-10T00:00:00.000Z"),
        rawResponse: {},
        status: "APPROVED",
      },
    });

    const promise = reconcileXeroApprovalState(input());
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();
    expect(result.ok && result.value.status).toBe("partial_success");
    expect(result.ok && result.value.partial).toBe(true);
  });

  it("keeps processing other records when one Xero request fails under bounded concurrency", async () => {
    const second = {
      ...record(),
      id: "80000000-0000-4000-8000-000000000002",
      source_remote_id: "xero-leave-2",
    };
    mocks.availabilityRecordFindMany.mockResolvedValue([record(), second]);
    mocks.fetchLeaveApplicationStatusForRegion
      .mockResolvedValueOnce({
        error: { code: "network_error", message: "fail", rawPayload: null },
        ok: false,
      } as unknown as Awaited<
        ReturnType<typeof mocks.fetchLeaveApplicationStatusForRegion>
      >)
      .mockResolvedValueOnce({
        ok: true,
        value: { approvedAt: null, rawResponse: {}, status: "REJECTED" },
      } as unknown as Awaited<
        ReturnType<typeof mocks.fetchLeaveApplicationStatusForRegion>
      >);

    const result = await reconcileXeroApprovalState(input());

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ declined: 1, failed: 1 }),
      })
    );
    expect(mocks.fetchLeaveApplicationStatusForRegion).toHaveBeenCalledTimes(2);
  });

  it("stops mid-way when cancellation is requested", async () => {
    vi.useFakeTimers();
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...record(),
      id: `80000000-0000-4000-8000-00000000${String(i).padStart(4, "0")}`.slice(
        0,
        36
      ),
      source_remote_id: `xero-leave-cancel-${i}`,
    }));
    mocks.availabilityRecordFindMany.mockResolvedValue(
      many as unknown as Awaited<
        ReturnType<typeof mocks.availabilityRecordFindMany>
      >
    );
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "REJECTED" },
    });
    let call = 0;
    mocks.syncRunFindFirst.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return null as unknown as Awaited<
          ReturnType<typeof mocks.syncRunFindFirst>
        >;
      }
      if (call === 2) {
        return null as unknown as Awaited<
          ReturnType<typeof mocks.syncRunFindFirst>
        >;
      }
      return { cancel_requested_at: new Date() } as unknown as Awaited<
        ReturnType<typeof mocks.syncRunFindFirst>
      >;
    });

    const promise = reconcileXeroApprovalState(input());
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ status: "cancelled" }),
      })
    );
    expect(mocks.fetchLeaveApplicationStatusForRegion).toHaveBeenCalledTimes(5);
  });

  it("uses BATCH_SIZE 5 to respect Xero five-concurrent limit", async () => {
    vi.useFakeTimers();
    const many = Array.from({ length: 6 }, (_, i) => ({
      ...record(),
      id: `80000000-0000-4000-8000-00000000${String(i).padStart(4, "0")}`.slice(
        0,
        36
      ),
      source_remote_id: `xero-leave-batch-${i}`,
    }));
    mocks.availabilityRecordFindMany.mockResolvedValue(
      many as unknown as Awaited<
        ReturnType<typeof mocks.availabilityRecordFindMany>
      >
    );
    let concurrent = 0;
    let peak = 0;
    mocks.fetchLeaveApplicationStatusForRegion.mockImplementation(async () => {
      concurrent += 1;
      peak = Math.max(peak, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent -= 1;
      return {
        ok: true,
        value: { approvedAt: null, rawResponse: {}, status: "REJECTED" },
      } as unknown as Awaited<
        ReturnType<typeof mocks.fetchLeaveApplicationStatusForRegion>
      >;
    });

    const promise = reconcileXeroApprovalState(input());
    await vi.runAllTimersAsync();
    await promise;
    vi.useRealTimers();

    expect(peak).toBeLessThanOrEqual(5);
    expect(mocks.syncRunFindFirst).toHaveBeenCalledTimes(3);
  });

  it("prioritises submitted records via approval_status ordering", async () => {
    mocks.availabilityRecordFindMany.mockResolvedValue([]);
    mocks.fetchLeaveApplicationStatusForRegion.mockResolvedValue({
      ok: true,
      value: { approvedAt: null, rawResponse: {}, status: "REJECTED" },
    });

    await reconcileXeroApprovalState(input());

    const call = mocks.availabilityRecordFindMany.mock.calls[0]?.[0] as {
      orderBy: unknown;
    };
    expect(call.orderBy).toEqual([
      { approval_status: "asc" },
      { created_at: "asc" },
    ]);
  });
});
