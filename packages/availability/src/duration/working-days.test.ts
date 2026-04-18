import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLocation: vi.fn(),
  findOrganisation: vi.fn(),
  listForOrganisation: vi.fn(),
  scopedQuery: vi.fn((clerkOrgId: string, organisationId: string) => ({
    clerk_org_id: clerkOrgId,
    organisation_id: organisationId,
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    location: { findFirst: mocks.findLocation },
    organisation: { findFirst: mocks.findOrganisation },
  },
  scopedQuery: mocks.scopedQuery,
}));
vi.mock("../holidays/holiday-service", () => ({
  listForOrganisation: mocks.listForOrganisation,
}));

const { computeWorkingDays } = await import("./working-days");

const location = {
  country_code: "AU",
  region_code: "QLD",
  timezone: "UTC",
};

const holiday = (date: string, archived = false) => ({
  archived_at: archived ? new Date("2026-01-01T00:00:00.000Z") : null,
  assignments: [],
  country_code: "AU",
  default_classification: "non_working",
  holiday_date: new Date(`${date}T00:00:00.000Z`),
  region_code: "QLD",
});

describe("computeWorkingDays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findLocation.mockResolvedValue(location);
    mocks.findOrganisation.mockResolvedValue(location);
    mocks.listForOrganisation.mockResolvedValue({ ok: true, value: [] });
  });

  it("counts Monday to Friday all-day as five working days", async () => {
    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-08T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: 5 });
  });

  it("excludes weekends", async () => {
    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-11T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-08T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: 2 });
  });

  it("excludes active public holidays", async () => {
    mocks.listForOrganisation.mockResolvedValue({
      ok: true,
      value: [holiday("2026-05-05")],
    });

    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-08T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: 4 });
  });

  it("does not exclude suppressed holidays", async () => {
    mocks.listForOrganisation.mockResolvedValue({
      ok: true,
      value: [holiday("2026-05-05", true)],
    });

    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-08T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: 5 });
  });

  it("rounds part-day ranges half-up to the nearest quarter", async () => {
    const result = await computeWorkingDays({
      allDay: false,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-04T13:07:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-04T09:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, value: 0.5 });
  });

  it("returns invalid_range when end precedes start", async () => {
    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-04T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-05T00:00:00.000Z"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_range");
    }
  });

  it("returns location_not_found when the location is missing", async () => {
    mocks.findLocation.mockResolvedValue(null);

    const result = await computeWorkingDays({
      allDay: true,
      clerkOrgId: "org_1",
      endsAt: new Date("2026-05-05T00:00:00.000Z"),
      locationId: "loc_1",
      organisationId: "00000000-0000-4000-8000-000000000001",
      startsAt: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("location_not_found");
    }
  });
});
