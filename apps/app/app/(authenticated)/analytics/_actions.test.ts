import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  auth: vi.fn(),
  currentUser: vi.fn(),
  getActiveOrgContext: vi.fn(),
  getOrganisationById: vi.fn(),
  listLeave: vi.fn(),
  listOoo: vi.fn(),
  requirePageRole: vi.fn(),
  revalidatePath: vi.fn(),
  resolveDateRange: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("@repo/availability", () => ({
  aggregationFingerprint: vi.fn(() => "fingerprint_1"),
  listLeaveReportRecordsForDrilldown: mocks.listLeave,
  listOutOfOfficeRecordsForDrilldown: mocks.listOoo,
  resolveDateRange: mocks.resolveDateRange,
}));
vi.mock("@repo/database", () => ({
  database: { auditEvent: { create: mocks.auditCreate } },
}));
vi.mock("@repo/database/src/queries/organisations", () => ({
  getOrganisationById: mocks.getOrganisationById,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/auth/require-page-role", () => ({
  requirePageRole: mocks.requirePageRole,
}));
vi.mock("@/lib/server/get-active-org-context", () => ({
  getActiveOrgContext: mocks.getActiveOrgContext,
}));

const { exportLeaveReportsCsvAction, exportOutOfOfficeCsvAction } =
  await import("./_actions");

const organisationId = "00000000-0000-4000-8000-000000000001";
const dateRange = {
  end: new Date("2026-05-09T00:00:00.000Z"),
  label: "May",
  start: new Date("2026-05-04T00:00:00.000Z"),
};
const row = {
  approvedAt: new Date("2026-05-02T00:00:00.000Z"),
  approvedByFirstName: "Alex",
  approvedByLastName: "Approver",
  endsAt: new Date("2026-05-08T23:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000301",
  locationName: "Brisbane",
  personFirstName: "Amelia",
  personId: "00000000-0000-4000-8000-000000000011",
  personLastName: "Nguyen",
  recordType: "annual_leave",
  sourceType: "leavesync_leave",
  startsAt: new Date("2026-05-04T00:00:00.000Z"),
  submittedAt: null,
  teamName: "Operations",
  workingDays: 5,
};

describe("analytics export actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgRole: "org:admin" });
    mocks.currentUser.mockResolvedValue({ id: "user_1" });
    mocks.getActiveOrgContext.mockResolvedValue({
      ok: true,
      value: { clerkOrgId: "org_1", organisationId },
    });
    mocks.getOrganisationById.mockResolvedValue({
      ok: true,
      value: { timezone: "Australia/Brisbane" },
    });
    mocks.resolveDateRange.mockReturnValue({ ok: true, value: dateRange });
  });

  it("exports leave reports CSV and writes an audit event", async () => {
    mocks.listLeave.mockResolvedValue({
      ok: true,
      value: { nextCursor: null, records: [row] },
    });

    const result = await exportLeaveReportsCsvAction({
      includeArchivedPeople: false,
      includePublicHolidays: false,
      organisationId,
      personType: "all",
      preset: "this_quarter",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.csvContent).toContain("record_id");
      expect(result.value.csvContent).toContain("annual_leave");
      expect(result.value.filename).toBe(
        "leave-reports-2026-05-04-2026-05-08.csv"
      );
    }
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "analytics.leave_reports_exported",
        }),
      })
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("exports out-of-office CSV and writes an audit event", async () => {
    mocks.listOoo.mockResolvedValue({
      ok: true,
      value: {
        nextCursor: null,
        records: [{ ...row, recordType: "wfh", sourceType: "manual" }],
      },
    });

    const result = await exportOutOfOfficeCsvAction({
      includeArchivedPeople: false,
      organisationId,
      personType: "all",
      preset: "this_quarter",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.csvContent).toContain("availability_type");
      expect(result.value.csvContent).toContain("wfh");
      expect(result.value.filename).toBe(
        "out-of-office-2026-05-04-2026-05-08.csv"
      );
    }
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "analytics.out_of_office_exported",
        }),
      })
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
