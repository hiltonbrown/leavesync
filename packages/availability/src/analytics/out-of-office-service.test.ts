import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  availabilityFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  personFindMany: vi.fn(),
  scopedQuery: vi.fn((clerkOrgId: string, organisationId: string) => ({
    clerk_org_id: clerkOrgId,
    organisation_id: organisationId,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    availabilityRecord: { findMany: mocks.availabilityFindMany },
    person: {
      findFirst: mocks.personFindFirst,
      findMany: mocks.personFindMany,
    },
  },
  scopedQuery: mocks.scopedQuery,
}));

const { aggregateOutOfOffice } = await import("./out-of-office-service");

const person = {
  archived_at: null,
  clerk_user_id: "user_1",
  employment_type: "employee",
  first_name: "Priya",
  id: "00000000-0000-4000-8000-000000000013",
  last_name: "Shah",
  location: {
    country_code: "AU",
    id: "00000000-0000-4000-8000-000000000201",
    name: "Brisbane",
    region_code: "QLD",
    timezone: "Australia/Brisbane",
  },
  location_id: "00000000-0000-4000-8000-000000000201",
  person_type: "employee",
  team: {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Operations",
  },
  team_id: "00000000-0000-4000-8000-000000000101",
};

const record = {
  all_day: true,
  approved_at: null,
  approved_by: null,
  archived_at: null,
  ends_at: new Date("2026-05-08T23:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000401",
  person,
  person_id: person.id,
  record_type: "wfh",
  source_type: "manual",
  starts_at: new Date("2026-05-04T00:00:00.000Z"),
  submitted_at: null,
};

describe("aggregateOutOfOffice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.personFindMany.mockResolvedValue([person]);
    mocks.availabilityFindMany.mockResolvedValue([record]);
  });

  it("aggregates approved manual records only", async () => {
    const result = await aggregateOutOfOffice({
      actingUserId: "user_1",
      clerkOrgId: "org_1",
      dateRange: {
        end: new Date("2026-05-09T00:00:00.000Z"),
        label: "May",
        start: new Date("2026-05-04T00:00:00.000Z"),
      },
      filters: { includeArchivedPeople: false, personType: "all" },
      organisationId: "00000000-0000-4000-8000-000000000001",
      role: "admin",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.summaryStats.totalOooDays).toBe(5);
      expect(result.value.wfhPatternByDayOfWeek[0]?.days).toBe(1);
    }
    expect(mocks.availabilityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approval_status: "approved",
          archived_at: null,
          clerk_org_id: "org_1",
          organisation_id: "00000000-0000-4000-8000-000000000001",
          source_type: "manual",
        }),
      })
    );
  });
});
