import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  availabilityFindFirst: vi.fn(),
  availabilityUpdateMany: vi.fn(),
  computeWorkingDays: vi.fn(),
  hasActiveXeroConnection: vi.fn(),
  notificationCreate: vi.fn(),
  notificationPreferenceFindUnique: vi.fn(),
  personFindFirst: vi.fn(),
  resolveXeroEmployeeId: vi.fn(),
  resolveXeroLeaveTypeId: vi.fn(),
  submitLeaveApplicationForRegion: vi.fn(),
  withdrawLeaveApplicationForRegion: vi.fn(),
  xeroTenantFindFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    $transaction: async (callback: (tx: unknown) => unknown) =>
      await callback({
        auditEvent: { create: mocks.auditCreate },
        availabilityRecord: { updateMany: mocks.availabilityUpdateMany },
        notification: { create: mocks.notificationCreate },
        notificationPreference: {
          findUnique: mocks.notificationPreferenceFindUnique,
        },
      }),
    availabilityRecord: { findFirst: mocks.availabilityFindFirst },
    person: { findFirst: mocks.personFindFirst },
    xeroTenant: { findFirst: mocks.xeroTenantFindFirst },
  },
}));
vi.mock("../duration/working-days", () => ({
  computeWorkingDays: mocks.computeWorkingDays,
}));
vi.mock("../xero-connection-state", () => ({
  hasActiveXeroConnection: mocks.hasActiveXeroConnection,
}));
vi.mock("@repo/xero", () => ({
  resolveXeroEmployeeId: mocks.resolveXeroEmployeeId,
  resolveXeroLeaveTypeId: mocks.resolveXeroLeaveTypeId,
  submitLeaveApplicationForRegion: mocks.submitLeaveApplicationForRegion,
  toPlainLanguageMessage: () =>
    "This leave overlaps an existing record in Xero. Review the dates and try again.",
  withdrawLeaveApplicationForRegion: mocks.withdrawLeaveApplicationForRegion,
}));

const { revertToDraft, submitDraftRecord, withdrawSubmission } = await import(
  "./submit-service"
);

const input = {
  actingOrgRole: "org:viewer",
  actingUserId: "user_1",
  clerkOrgId: "org_1",
  organisationId: "00000000-0000-4000-8000-000000000001",
  recordId: "00000000-0000-4000-8000-000000000099",
};

const record = {
  all_day: true,
  approval_status: "draft",
  clerk_org_id: input.clerkOrgId,
  derived_sequence: 2,
  ends_at: new Date("2026-05-05T23:59:59.999Z"),
  id: input.recordId,
  organisation_id: input.organisationId,
  person: {
    clerk_user_id: input.actingUserId,
    email: "person@example.com",
    first_name: "Test",
    id: "00000000-0000-4000-8000-000000000011",
    last_name: "Person",
    location_id: null,
    manager: {
      clerk_user_id: "manager_1",
      id: "00000000-0000-4000-8000-000000000012",
    },
    manager_person_id: "00000000-0000-4000-8000-000000000012",
  },
  person_id: "00000000-0000-4000-8000-000000000011",
  record_type: "annual_leave",
  source_remote_id: null,
  source_type: "leavesync_leave",
  starts_at: new Date("2026-05-04T00:00:00.000Z"),
  title: "Annual leave",
};

const xeroTenant = {
  clerk_org_id: input.clerkOrgId,
  id: "00000000-0000-4000-8000-000000000201",
  organisation_id: input.organisationId,
  payroll_region: "AU",
  xero_connection: {
    access_token_encrypted: "token",
    revoked_at: null,
  },
  xero_tenant_id: "xero-tenant-1",
};

describe("submit-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.availabilityFindFirst.mockReset();
    mocks.availabilityUpdateMany.mockResolvedValue({ count: 1 });
    mocks.computeWorkingDays.mockResolvedValue({ ok: true, value: 2 });
    mocks.hasActiveXeroConnection.mockResolvedValue(true);
    mocks.notificationPreferenceFindUnique.mockResolvedValue(null);
    mocks.personFindFirst.mockResolvedValue({ id: record.person.id });
    mocks.resolveXeroEmployeeId.mockResolvedValue({
      ok: true,
      value: "employee-1",
    });
    mocks.resolveXeroLeaveTypeId.mockResolvedValue({
      ok: true,
      value: "type-1",
    });
    mocks.xeroTenantFindFirst.mockResolvedValue(xeroTenant);
  });

  it("submits a draft record and writes notification plus audit rows", async () => {
    mocks.availabilityFindFirst
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce({
        ...record,
        approval_status: "submitted",
        source_remote_id: "xero-leave-1",
      });
    mocks.submitLeaveApplicationForRegion.mockResolvedValue({
      ok: true,
      value: {
        rawResponse: {
          LeaveApplications: [{ LeaveApplicationID: "xero-leave-1" }],
        },
        xeroLeaveApplicationId: "xero-leave-1",
      },
    });

    const result = await submitDraftRecord(input);

    expect(result.ok).toBe(true);
    expect(mocks.availabilityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_status: "submitted",
          source_remote_id: "xero-leave-1",
        }),
        where: expect.objectContaining({
          clerk_org_id: input.clerkOrgId,
          organisation_id: input.organisationId,
        }),
      })
    );
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipient_user_id: "manager_1",
          type: "leave_submitted",
        }),
      })
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "availability_records.submitted",
        }),
      })
    );
  });

  it("persists xero_sync_failed without bumping sequence when Xero rejects", async () => {
    mocks.availabilityFindFirst
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce({
        ...record,
        approval_status: "xero_sync_failed",
        xero_write_error: "This leave overlaps an existing record in Xero.",
      });
    mocks.submitLeaveApplicationForRegion.mockResolvedValue({
      ok: false,
      error: {
        code: "conflict_error",
        message: "Overlap",
        rawPayload: { Message: "Overlap" },
      },
    });

    const result = await submitDraftRecord(input);

    expect(result.ok).toBe(true);
    expect(mocks.availabilityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_status: "xero_sync_failed",
          xero_write_error:
            "This leave overlaps an existing record in Xero. Review the dates and try again.",
        }),
      })
    );
    expect(mocks.notificationCreate).toHaveBeenCalledTimes(2);
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "availability_records.submission_failed",
          payload: expect.objectContaining({ errorCode: "conflict_error" }),
        }),
      })
    );
    expect(JSON.stringify(mocks.auditCreate.mock.calls[0])).not.toContain(
      "rawPayload"
    );
  });

  it("blocks submission when Xero is not connected", async () => {
    mocks.availabilityFindFirst.mockResolvedValueOnce(record);
    mocks.hasActiveXeroConnection.mockResolvedValue(false);

    const result = await submitDraftRecord(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("xero_not_connected");
    }
    expect(mocks.availabilityUpdateMany).not.toHaveBeenCalled();
  });

  it("reverts only failed records to draft", async () => {
    mocks.availabilityFindFirst
      .mockResolvedValueOnce({ ...record, approval_status: "xero_sync_failed" })
      .mockResolvedValueOnce({ ...record, approval_status: "draft" });

    const result = await revertToDraft(input);

    expect(result.ok).toBe(true);
    expect(mocks.availabilityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_status: "draft",
        }),
      })
    );
  });

  it("withdraws only submitted records", async () => {
    mocks.availabilityFindFirst
      .mockResolvedValueOnce({
        ...record,
        approval_status: "submitted",
        source_remote_id: "xero-leave-1",
      })
      .mockResolvedValueOnce({
        ...record,
        approval_status: "withdrawn",
        source_remote_id: "xero-leave-1",
      });
    mocks.withdrawLeaveApplicationForRegion.mockResolvedValue({
      ok: true,
      value: { rawResponse: {} },
    });

    const result = await withdrawSubmission(input);

    expect(result.ok).toBe(true);
    expect(mocks.withdrawLeaveApplicationForRegion).toHaveBeenCalled();
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "leave_withdrawn" }),
      })
    );
  });
});
