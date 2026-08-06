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
    xeroTenant: { findFirst: mocks.xeroTenantFindFirst },
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
});
