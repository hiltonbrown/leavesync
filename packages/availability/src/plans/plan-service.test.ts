import { icsUidSuffix } from "@repo/seo/branding";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditCreate = vi.fn();
  const availabilityCreate = vi.fn(async ({ data }) => ({
    ...data,
    archived_at: null,
    approval_note: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    person: personFixture,
    source_remote_id: null,
    submitted_at: null,
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    xero_write_error: null,
  }));
  const availabilityFindFirst = vi.fn();
  const personFixture = {
    email: "person@example.com",
    first_name: "Test",
    id: "00000000-0000-4000-8000-000000000011",
    last_name: "Person",
    location_id: null,
    manager_person_id: null,
  };

  return {
    auditCreate,
    availabilityCreate,
    availabilityFindFirst,
    hasActiveXeroConnection: vi.fn(),
    materialiseAvailabilityPublication: vi.fn(() =>
      Promise.resolve({ ok: true, value: undefined })
    ),
    personFindFirst: vi.fn(),
    scopedQuery: vi.fn((clerkOrgId: string, organisationId: string) => ({
      clerk_org_id: clerkOrgId,
      organisation_id: organisationId,
    })),
    scopedTo: vi.fn(
      (input: { clerkOrgId: string; organisationId: string }) => ({
        clerk_org_id: input.clerkOrgId,
        organisation_id: input.organisationId,
      })
    ),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        auditEvent: { create: mocks.auditCreate },
        availabilityRecord: {
          create: mocks.availabilityCreate,
          updateMany: vi.fn(),
        },
      }),
    availabilityRecord: { findFirst: mocks.availabilityFindFirst },
    person: { findFirst: mocks.personFindFirst },
  },
  scopedQuery: mocks.scopedQuery,
  scopedTo: mocks.scopedTo,
}));
vi.mock("../xero-connection-state", () => ({
  hasActiveXeroConnection: mocks.hasActiveXeroConnection,
}));
vi.mock("@repo/feeds", () => ({
  materialiseAvailabilityPublication: mocks.materialiseAvailabilityPublication,
}));

const { archiveRecord, createRecord, updateRecord } = await import(
  "./plan-service"
);

const baseInput = {
  actingOrgRole: "org:viewer",
  allDay: true,
  clerkOrgId: "org_1",
  contactabilityStatus: "contactable",
  createdByUserId: "user_1",
  endsAt: new Date("2026-05-05T00:00:00.000Z"),
  notesInternal: "Test note",
  organisationId: "00000000-0000-4000-8000-000000000001",
  personId: "00000000-0000-4000-8000-000000000011",
  privacyMode: "named",
  startsAt: new Date("2026-05-04T00:00:00.000Z"),
} as const;

const actionInput = {
  actingUserId: "user_1",
  clerkOrgId: baseInput.clerkOrgId,
  organisationId: baseInput.organisationId,
  recordId: "00000000-0000-4000-8000-000000000021",
} as const;

function scopedRecordFixture({
  managerPersonId,
  personId = baseInput.personId,
}: {
  managerPersonId: string | null;
  personId?: string;
}) {
  return {
    approval_status: "approved",
    person: {
      email: "person@example.com",
      first_name: "Test",
      id: personId,
      last_name: "Person",
      location_id: null,
      manager_person_id: managerPersonId,
    },
    source_type: "manual",
  };
}

describe("plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.availabilityFindFirst.mockResolvedValue(
      scopedRecordFixture({ managerPersonId: null })
    );
    mocks.hasActiveXeroConnection.mockResolvedValue(false);
    mocks.personFindFirst.mockResolvedValue({
      email: "person@example.com",
      first_name: "Test",
      id: baseInput.personId,
      last_name: "Person",
      location_id: null,
      manager_person_id: null,
    });
  });

  it.each([
    ["wfh", true, "manual", "approved"],
    ["wfh", false, "manual", "approved"],
    ["training", true, "manual", "approved"],
    ["annual_leave", true, "team_calendar_leave", "draft"],
    ["annual_leave", false, "team_calendar_leave", "approved"],
    ["sick_leave", true, "team_calendar_leave", "draft"],
  ] as const)("routes %s with Xero %s to %s and %s", async (recordType, hasXero, sourceType, approvalStatus) => {
    mocks.hasActiveXeroConnection.mockResolvedValue(hasXero);

    const result = await createRecord({ ...baseInput, recordType });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toMatchObject({
      approvalStatus,
      derivedSequence: 0,
      personId: baseInput.personId,
      recordType,
      sourceType,
    });
    expect(result.value.derivedUidKey).toContain(icsUidSuffix);
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "availability_records.created",
          payload: expect.objectContaining({
            approvalStatus,
            sourceType,
          }),
        }),
      })
    );
  });

  it("denies updates when a viewer has no linked person and the target has no manager", async () => {
    mocks.personFindFirst.mockResolvedValue(null);

    const result = await updateRecord({
      ...actionInput,
      actingOrgRole: "org:viewer",
      patch: {},
    });

    expect(result).toMatchObject({
      error: { code: "not_authorised" },
      ok: false,
    });
  });

  it("denies archiving when a viewer has no linked person and the target has no manager", async () => {
    mocks.personFindFirst.mockResolvedValue(null);

    const result = await archiveRecord({
      ...actionInput,
      actingOrgRole: "org:viewer",
    });

    expect(result).toMatchObject({
      error: { code: "not_authorised" },
      ok: false,
    });
  });

  it("allows an admin without a linked person to archive a record", async () => {
    mocks.personFindFirst.mockResolvedValue(null);

    const result = await archiveRecord({
      ...actionInput,
      actingOrgRole: "org:admin",
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("allows a linked manager to archive their report's record", async () => {
    const managerPersonId = "00000000-0000-4000-8000-000000000031";
    mocks.availabilityFindFirst.mockResolvedValue(
      scopedRecordFixture({ managerPersonId })
    );
    mocks.personFindFirst.mockResolvedValue({ id: managerPersonId });

    const result = await archiveRecord({
      ...actionInput,
      actingOrgRole: "org:viewer",
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("allows a linked person to archive their own record", async () => {
    mocks.personFindFirst.mockResolvedValue({ id: baseInput.personId });

    const result = await archiveRecord({
      ...actionInput,
      actingOrgRole: "org:viewer",
    });

    expect(result).toMatchObject({ ok: true });
  });
});
