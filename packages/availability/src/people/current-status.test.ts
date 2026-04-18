import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  availabilityFindMany: vi.fn(),
  locationFindFirst: vi.fn(),
  organisationFindFirst: vi.fn(),
  publicHolidayFindFirst: vi.fn(),
  scopedQuery: vi.fn((clerkOrgId: string, organisationId: string) => ({
    clerk_org_id: clerkOrgId,
    organisation_id: organisationId,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    availabilityRecord: { findMany: mocks.availabilityFindMany },
    location: { findFirst: mocks.locationFindFirst },
    organisation: { findFirst: mocks.organisationFindFirst },
    publicHoliday: { findFirst: mocks.publicHolidayFindFirst },
  },
  scopedQuery: mocks.scopedQuery,
}));

const { computeCurrentStatus, dateOnlyInTimeZone } = await import(
  "./current-status"
);

const baseInput = {
  at: new Date("2026-04-25T02:00:00.000Z"),
  clerkOrgId: "org_1",
  locationId: "00000000-0000-4000-8000-000000000101",
  organisationId: "00000000-0000-4000-8000-000000000001",
  personId: "00000000-0000-4000-8000-000000000011",
};

const activeRecord = (
  recordType: string,
  approvalStatus: "approved" | "submitted"
) => ({
  approval_status: approvalStatus,
  archived_at: null,
  contactability: "contactable",
  ends_at: new Date("2026-04-25T08:00:00.000Z"),
  id: `record-${recordType}-${approvalStatus}`,
  record_type: recordType,
  source_type: "manual",
  starts_at: new Date("2026-04-24T22:00:00.000Z"),
  title: null,
});

describe("current-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locationFindFirst.mockResolvedValue({
      country_code: "AU",
      region_code: "QLD",
      timezone: "Australia/Brisbane",
    });
    mocks.organisationFindFirst.mockResolvedValue({
      country_code: "AU",
      timezone: "Australia/Brisbane",
    });
    mocks.publicHolidayFindFirst.mockResolvedValue(null);
    mocks.availabilityFindMany.mockResolvedValue([]);
  });

  it("prioritises approved Xero leave over lower-priority local records", async () => {
    mocks.availabilityFindMany.mockResolvedValue([
      activeRecord("wfh", "approved"),
      activeRecord("annual_leave", "approved"),
    ]);

    const status = await computeCurrentStatus(baseInput);

    expect(status.statusKey).toBe("on_leave");
    expect(status.label).toBe("On annual leave");
    expect(status.recordType).toBe("annual_leave");
  });

  it("returns pending leave before public holidays", async () => {
    mocks.availabilityFindMany.mockResolvedValue([
      activeRecord("sick_leave", "submitted"),
    ]);
    mocks.publicHolidayFindFirst.mockResolvedValue({
      holiday_date: new Date("2026-04-25T00:00:00.000Z"),
      holiday_type: "public",
      id: "holiday-1",
      name: "ANZAC Day",
      source: "nager",
    });

    const status = await computeCurrentStatus(baseInput);

    expect(status.statusKey).toBe("pending_leave");
    expect(status.label).toBe("Leave pending approval");
  });

  it("returns the higher local priority for overlapping local records", async () => {
    mocks.availabilityFindMany.mockResolvedValue([
      activeRecord("wfh", "approved"),
      activeRecord("training", "approved"),
    ]);

    const status = await computeCurrentStatus(baseInput);

    expect(status.statusKey).toBe("training");
    expect(status.label).toBe("In training");
  });

  it("uses archived_at null when checking public holidays", async () => {
    mocks.publicHolidayFindFirst.mockResolvedValue({
      holiday_date: new Date("2026-04-25T00:00:00.000Z"),
      holiday_type: "public",
      id: "holiday-1",
      name: "ANZAC Day",
      source: "nager",
    });

    const status = await computeCurrentStatus(baseInput);

    expect(status.statusKey).toBe("public_holiday");
    expect(mocks.publicHolidayFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archived_at: null }),
      })
    );
  });

  it("returns available when no active record or holiday applies", async () => {
    const status = await computeCurrentStatus(baseInput);

    expect(status.statusKey).toBe("available");
    expect(status.label).toBe("Available");
  });

  it("formats dates in the supplied location timezone", () => {
    expect(
      dateOnlyInTimeZone(
        new Date("2026-04-24T14:30:00.000Z"),
        "Australia/Brisbane"
      )
    ).toBe("2026-04-25");
  });
});
